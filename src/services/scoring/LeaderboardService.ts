import LeaderboardSnapshot from "../../models/LeaderboardSnapshot";
import UserScoreTotal from "../../models/UserScoreTotal";
import { toScaled } from "./ScoreTypes";
import { Op } from "sequelize";

class LeaderboardService {
  async snapshot(period: "daily" | "weekly" | "monthly") {
    const now = new Date();
    const start = new Date(now);
    if (period === "daily") {
      start.setUTCHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      const day = start.getUTCDay();
      const diff = (day + 6) % 7; // make Monday start
      start.setUTCDate(start.getUTCDate() - diff);
      start.setUTCHours(0, 0, 0, 0);
    } else {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    }

    const periodStartStr = start.toISOString().substring(0, 10);

    const totals = await UserScoreTotal.findAll({
      order: [["total_points", "DESC"]],
      limit: 100,
    });
    let rank = 1;
    for (const t of totals as any[]) {
      await LeaderboardSnapshot.create({
        period,
        period_start: periodStartStr as any,
        user_id: t.user_id,
        points: t.total_points,
        rank,
      });
      rank++;
    }
  }

  async get(period: string, limit = 50) {
    const today = new Date();
    let start = new Date(today);
    if (period === "daily") start.setUTCHours(0, 0, 0, 0);
    else if (period === "weekly") {
      const day = start.getUTCDay();
      const diff = (day + 6) % 7;
      start.setUTCDate(start.getUTCDate() - diff);
      start.setUTCHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    }
    const periodStartStr = start.toISOString().substring(0, 10);
    return LeaderboardSnapshot.findAll({
      where: { period, period_start: periodStartStr } as any,
      order: [["rank", "ASC"]],
      limit,
    });
  }
}

export const leaderboardService = new LeaderboardService();
export default leaderboardService;
