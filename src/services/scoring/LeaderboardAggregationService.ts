import sequelize from "../../config/database";
import { QueryTypes } from "sequelize";
import { POINT_SCALE } from "./ScoreTypes";

export type Period = "daily" | "weekly" | "monthly" | "all";

function periodStart(period: Period, refDate = new Date()): string {
  if (period === "all") {
    // represent global period with a fixed anchor date
    return "1970-01-01";
  }
  const d = new Date(refDate);
  if (period === "daily") {
    d.setUTCHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = d.getUTCDay();
    const diff = (day + 6) % 7; // Monday start
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
  } else {
    // monthly
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString().substring(0, 10);
}

function periodEnd(period: Period, startStr: string): Date {
  if (startStr === "1970-01-01") return new Date();
  const d = new Date(startStr + "T00:00:00.000Z");
  if (period === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (period === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (period === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d;
}

class LeaderboardAggregationService {
  async get(period: Period, limit = 50, refDate = new Date()) {
    if (period === "all") {
      // Use total snapshot table + dynamic CASE mapping for level instead of relying on stale stored level_id
      const rows: any[] = await sequelize.query(
        `SELECT u.id AS user_id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector,
                COALESCE(ust.total_points,0) AS total_scaled_points,
                CASE
                  WHEN COALESCE(ust.total_points,0) BETWEEN 0 AND (20 * :scale) THEN 1
                  WHEN COALESCE(ust.total_points,0) BETWEEN (21 * :scale) AND (149 * :scale) THEN 2
                  WHEN COALESCE(ust.total_points,0) BETWEEN (150 * :scale) AND (299 * :scale) THEN 3
                  WHEN COALESCE(ust.total_points,0) BETWEEN (300 * :scale) AND (599 * :scale) THEN 4
                  WHEN COALESCE(ust.total_points,0) >= (600 * :scale) THEN 5
                  ELSE 1
                END AS computed_level
         FROM users u
         LEFT JOIN user_score_totals ust ON ust.user_id = u.id
         ORDER BY total_scaled_points DESC, u.id ASC -- tie-breaker on user_id for deterministic ordering consistent with getUserRankAndPoints
         LIMIT :limit`,
        { replacements: { limit, scale: POINT_SCALE }, type: QueryTypes.SELECT }
      );
      return rows.map((r: any, idx: number) => ({
        rank: idx + 1,
        user_id: r.user_id,
        username: r.username,
        firstname: r.firstname,
        lastname: r.lastname,
        district: r.district,
        province: r.province,
        sector: r.sector,
        level_id: r.computed_level,
        points: Number(r.total_scaled_points) / POINT_SCALE,
        total_points: Number(r.total_scaled_points) / POINT_SCALE,
      }));
    }
    const startStr = periodStart(period, refDate);
    const end = periodEnd(period, startStr).toISOString();
    const start = startStr + "T00:00:00.000Z";
    const rows: any[] = await sequelize.query(
      `WITH period_points AS (
         SELECT se.user_id, COALESCE(SUM(se.delta),0) AS period_points
         FROM score_events se
         WHERE se.created_at >= :start AND se.created_at < :end
         GROUP BY se.user_id
       ), joined AS (
         SELECT u.id AS user_id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector,
                COALESCE(pp.period_points,0) AS period_scaled_points,
                COALESCE(ust.total_points,0) AS total_scaled_points
         FROM users u
         LEFT JOIN period_points pp ON pp.user_id = u.id
         LEFT JOIN user_score_totals ust ON ust.user_id = u.id
         WHERE pp.period_points IS NOT NULL -- only users with activity in window
       ), ranked AS (
         SELECT j.*, ROW_NUMBER() OVER (ORDER BY j.period_scaled_points DESC, j.user_id ASC) AS rank
         FROM joined j
       )
       SELECT * FROM ranked
       ORDER BY rank
       LIMIT :limit`,
      {
        replacements: { start, end, limit, scale: POINT_SCALE },
        type: QueryTypes.SELECT,
      }
    );
    return rows.map((r: any) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      username: r.username,
      firstname: r.firstname,
      lastname: r.lastname,
      district: r.district,
      province: r.province,
      sector: r.sector,
      level_id: (() => {
        const tp = Number(r.total_scaled_points) || 0;
        if (tp <= 20 * POINT_SCALE) return 1;
        if (tp <= 149 * POINT_SCALE) return 2;
        if (tp <= 299 * POINT_SCALE) return 3;
        if (tp <= 599 * POINT_SCALE) return 4;
        return 5;
      })(),
      points: Number(r.period_scaled_points) / POINT_SCALE,
      total_points: Number(r.total_scaled_points) / POINT_SCALE,
    }));
  }

  /** Return period points + rank (1-based) for a single user plus total users with >0 points in that period. */
  async getUserRankAndPoints(
    period: Period,
    userId: number,
    refDate = new Date()
  ) {
    if (period === "all") {
      // Use the projection table (user_score_totals) for consistency with leaderboard.get("all")
      // This avoids divergence when historical score_events are pruned or repaired.
      const rows: any[] = await sequelize.query(
        `WITH user_points AS (
           SELECT u.id AS user_id, COALESCE(ust.total_points,0) AS points
           FROM users u
           LEFT JOIN user_score_totals ust ON ust.user_id = u.id
           WHERE COALESCE(ust.total_points,0) > 0 -- only users who have earned points
         ), ranked AS (
           SELECT up.*, ROW_NUMBER() OVER (ORDER BY up.points DESC, up.user_id ASC) AS rn
           FROM user_points up
         )
         SELECT (SELECT rn FROM ranked WHERE user_id = :userId) AS rank,
                (SELECT COUNT(*) FROM user_points) AS total_users,
                (SELECT points FROM ranked WHERE user_id = :userId) AS points`,
        { replacements: { userId }, type: QueryTypes.SELECT }
      );
      const r = rows[0] || {};
      const rawRank = Number(r.rank) || 0; // 0 => user absent (no points yet)
      return {
        rank: rawRank || null,
        totalUsersWithPoints: Number(r.total_users) || 0,
        points: Number(r.points) / POINT_SCALE || 0,
      };
    }
    const startStr = periodStart(period, refDate);
    const end = periodEnd(period, startStr).toISOString();
    const start = startStr + "T00:00:00.000Z";
    const rows: any[] = await sequelize.query(
      `-- Period-specific row_number ranking with deterministic tie-break
       WITH user_points AS (
         SELECT se.user_id, SUM(se.delta) AS points
         FROM score_events se
         JOIN users u ON u.id = se.user_id
         WHERE se.created_at >= :start AND se.created_at < :end
         GROUP BY se.user_id
       ), ranked AS (
         SELECT up.*, ROW_NUMBER() OVER (ORDER BY up.points DESC, up.user_id ASC) AS rn
         FROM user_points up
       )
       SELECT (SELECT rn FROM ranked WHERE user_id = :userId) AS rank,
              (SELECT COUNT(*) FROM user_points) AS total_users,
              (SELECT points FROM ranked WHERE user_id = :userId) AS points`,
      { replacements: { userId, start, end }, type: QueryTypes.SELECT }
    );
    const r = rows[0] || {};
    const rawRank = Number(r.rank) || 0;
    return {
      rank: rawRank || null,
      totalUsersWithPoints: Number(r.total_users) || 0,
      points: Number(r.points) / POINT_SCALE || 0,
      periodStart: startStr,
    };
  }

  /**
   * Paginated leaderboard with optional search. Returns rows plus total count.
   * For performance we currently aggregate on the fly (may optimize later with snapshots / materialized view).
   */
  async getPaginated(
    period: Period,
    opts: { limit: number; offset: number; search?: string },
    refDate = new Date()
  ) {
    const { limit, offset, search } = opts;
    let periodFilter = "";
    if (period !== "all") {
      const startStr = periodStart(period, refDate);
      const end = periodEnd(period, startStr).toISOString();
      periodFilter = `AND se.created_at >= :start AND se.created_at < :end`;
      const start = startStr + "T00:00:00.000Z";
      const replacements: any = {
        limit,
        offset,
        start,
        end,
        scale: POINT_SCALE,
      };
      if (search) replacements.search = `%${search.toLowerCase()}%`;
      const searchClause = search
        ? "WHERE (LOWER(u.username) LIKE :search OR LOWER(u.firstname) LIKE :search OR LOWER(u.lastname) LIKE :search OR LOWER(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')) LIKE :search OR LOWER(COALESCE(u.sector,'')) LIKE :search OR LOWER(COALESCE(u.district,'')) LIKE :search OR LOWER(COALESCE(u.province,'')) LIKE :search)"
        : "";
      const rows: any[] = await sequelize.query(
        `WITH agg AS (
           SELECT u.id AS user_id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector,
                  COALESCE(SUM(CASE WHEN se.id IS NOT NULL THEN se.delta ELSE 0 END),0) AS period_points,
                  COALESCE(ust.total_points,0) AS total_scaled_points,
                  CASE
                    WHEN COALESCE(ust.total_points,0) BETWEEN 0 AND (20 * :scale) THEN 1
                    WHEN COALESCE(ust.total_points,0) BETWEEN (21 * :scale) AND (149 * :scale) THEN 2
                    WHEN COALESCE(ust.total_points,0) BETWEEN (150 * :scale) AND (299 * :scale) THEN 3
                    WHEN COALESCE(ust.total_points,0) BETWEEN (300 * :scale) AND (599 * :scale) THEN 4
                    WHEN COALESCE(ust.total_points,0) >= (600 * :scale) THEN 5
                    ELSE 1
                  END AS computed_level
           FROM users u
           LEFT JOIN score_events se ON se.user_id = u.id ${periodFilter}
           LEFT JOIN user_score_totals ust ON ust.user_id = u.id
           ${searchClause}
           GROUP BY u.id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector, ust.total_points
           HAVING COUNT(se.id) > 0 -- exclude users with zero events in the period to match getUserRankAndPoints()
         ), ranked AS (
           SELECT a.*, ROW_NUMBER() OVER (ORDER BY a.period_points DESC, a.user_id ASC) AS rank
           FROM agg a
         )
         SELECT * FROM ranked
         ORDER BY rank
         LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT }
      );
      const totalResult: any[] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM (
           SELECT 1 FROM users u
           LEFT JOIN score_events se ON se.user_id = u.id ${periodFilter}
           ${searchClause}
           GROUP BY u.id
           HAVING COUNT(se.id) > 0
         ) x`,
        { replacements, type: QueryTypes.SELECT }
      );
      const total = totalResult[0]?.count || 0;
      return {
        rows: rows.map((r) => ({
          rank: Number(r.rank),
          user_id: Number(r.user_id),
          username: r.username,
          firstname: r.firstname,
          lastname: r.lastname,
          district: r.district,
          province: r.province,
          sector: r.sector,
          level_id: r.computed_level,
          points: Number(r.period_points) / POINT_SCALE,
          total_points: Number(r.total_scaled_points) / POINT_SCALE,
        })),
        total,
        totalPeriodUsers: total,
      };
    }
    // all-time branch
    const replacements: any = { limit, offset, scale: POINT_SCALE };
    if (search) replacements.search = `%${search.toLowerCase()}%`;
    const searchClause = search
      ? "WHERE (LOWER(u.username) LIKE :search OR LOWER(u.firstname) LIKE :search OR LOWER(u.lastname) LIKE :search OR LOWER(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')) LIKE :search OR LOWER(COALESCE(u.sector,'')) LIKE :search OR LOWER(COALESCE(u.district,'')) LIKE :search OR LOWER(COALESCE(u.province,'')) LIKE :search)"
      : "";
    const rows: any[] = await sequelize.query(
      `WITH agg AS (
         SELECT u.id AS user_id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector,
                COALESCE(ust.total_points,0) AS total_scaled_points,
                CASE
                  WHEN COALESCE(ust.total_points,0) BETWEEN 0 AND (20 * :scale) THEN 1
                  WHEN COALESCE(ust.total_points,0) BETWEEN (21 * :scale) AND (149 * :scale) THEN 2
                  WHEN COALESCE(ust.total_points,0) BETWEEN (150 * :scale) AND (299 * :scale) THEN 3
                  WHEN COALESCE(ust.total_points,0) BETWEEN (300 * :scale) AND (599 * :scale) THEN 4
                  WHEN COALESCE(ust.total_points,0) >= (600 * :scale) THEN 5
                  ELSE 1
                END AS computed_level
         FROM users u
         LEFT JOIN user_score_totals ust ON ust.user_id = u.id
         ${searchClause}
         GROUP BY u.id, u.username, u.firstname, u.lastname, u.district, u.province, u.sector, ust.total_points
       ), ranked AS (
         SELECT a.*, ROW_NUMBER() OVER (ORDER BY a.total_scaled_points DESC, a.user_id ASC) AS rank
         FROM agg a
       )
       SELECT * FROM ranked
       ORDER BY rank
       LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );
    const totalResult: any[] = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT 1 FROM users u
         LEFT JOIN score_events se ON se.user_id = u.id
         ${searchClause}
         GROUP BY u.id
       ) x`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = totalResult[0]?.count || 0;
    return {
      rows: rows.map((r) => ({
        rank: Number(r.rank),
        user_id: Number(r.user_id),
        username: r.username,
        firstname: r.firstname,
        lastname: r.lastname,
        district: r.district,
        province: r.province,
        sector: r.sector,
        level_id: r.computed_level,
        points: Number(r.total_scaled_points) / POINT_SCALE,
        total_points: Number(r.total_scaled_points) / POINT_SCALE,
      })),
      total,
      totalPeriodUsers: total,
    };
  }

  /** Fetch a window of ranks around a specific user (inclusive). */
  async getAround(
    period: Period,
    userId: number,
    radius = 3,
    refDate = new Date()
  ) {
    const paginated = await this.getPaginated(
      period,
      { limit: 100000, offset: 0 },
      refDate
    ); // naive: fetch all then slice
    const idx = paginated.rows.findIndex((r) => r.user_id === userId);
    if (idx === -1) return [];
    const start = Math.max(0, idx - radius);
    const end = Math.min(paginated.rows.length, idx + radius + 1);
    return paginated.rows.slice(start, end);
  }
}

export const leaderboardAggregationService =
  new LeaderboardAggregationService();
export default leaderboardAggregationService;
