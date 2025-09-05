import { Request, Response } from "express";
import UserScoreTotal from "../models/UserScoreTotal";
import { fromScaled } from "../services/scoring/ScoreTypes";
import ScoreEvent from "../models/ScoreEvent";
import UserModerationStat from "../models/UserModerationStat";
import UserStreak from "../models/UserStreak";
import { nextMilestone as calcNextMilestone } from "../services/scoring/StreakHelpers";
import UserPrestige from "../models/UserPrestige";
import { mapPointsToLevel } from "../services/scoring/LevelService";
import leaderboardAggregationService from "../services/scoring/LeaderboardAggregationService";
import { scoringActionService } from "../services/scoring/ScoringActionService";
import { listSupportedTimezones } from "../services/scoring/StreakHelpers";

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role: string; permissions: string[] };
}

class ScoreController {
  constructor() {
    this.getMyScore = this.getMyScore.bind(this);
    this.getMyEvents = this.getMyEvents.bind(this);
    this.getUserPublicScore = this.getUserPublicScore.bind(this);
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.getMyDailyStats = this.getMyDailyStats.bind(this);
    this.adminAdjust = this.adminAdjust.bind(this);
    this.promoteModerator = this.promoteModerator.bind(this);
    this.getSupportedTimezones = this.getSupportedTimezones.bind(this);
  }
  public getSupportedTimezones(req: Request, res: Response) {
    try {
      const zones = listSupportedTimezones();
      res.json({ success: true, data: zones });
    } catch (e) {
      res
        .status(500)
        .json({ success: false, error: "Failed to list timezones" });
    }
  }
  private computePrestige(
    totalPoints: number,
    approvals: number,
    isModeratorFlag: boolean
  ) {
    if (totalPoints < 600)
      return {
        tier: null,
        progress: {
          nextTier: "Expert I",
          pointsNeeded: Math.max(0, 600 - totalPoints),
          approvalsNeeded: 10,
        },
      };
    const tiers = [
      { tier: "Expert I", points: 1600, approvals: 10 },
      { tier: "Expert II", points: 4100, approvals: 50 },
      { tier: "Expert III", points: 14100, approvals: 50 }, // Expert II + 10,000
    ];
    let achieved: string | null = null;
    for (const t of tiers) {
      if (totalPoints >= t.points && approvals >= t.approvals)
        achieved = t.tier;
      else break;
    }
    if (achieved === "Expert III" && isModeratorFlag) {
      return { tier: "Moderator", progress: {} };
    }
    const achievedIndex = achieved
      ? tiers.findIndex((t) => t.tier === achieved)
      : -1;
    const next = tiers[achievedIndex + 1];
    if (!next) return { tier: achieved, progress: {} };
    return {
      tier: achieved,
      progress: {
        nextTier: next.tier,
        pointsNeeded: Math.max(0, next.points - totalPoints),
        approvalsNeeded: Math.max(0, next.approvals - approvals),
      },
    };
  }
  async getMyScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }
      const total = await UserScoreTotal.findByPk(req.user.id);
      const totalPoints = fromScaled(total?.total_points || 0);
      const levelInfo = mapPointsToLevel(Math.floor(totalPoints));

      // Prestige calculation (simple thresholds per spec)
      let approvalsCountRow = await UserModerationStat.findByPk(req.user.id);
      let approvalsCount = approvalsCountRow
        ? approvalsCountRow.mod_approvals
        : await ScoreEvent.count({
            where: { user_id: req.user.id, event_type: "MOD_APPROVED_BONUS" },
          });

      const prestigeRecord = await UserPrestige.findByPk(req.user.id);
      const prestige = this.computePrestige(
        totalPoints,
        approvalsCount,
        !!prestigeRecord?.is_moderator
      );

      const streak = await UserStreak.findByPk(req.user.id);
      // Prepare streak response including last_day so client can detect first load of day
      let streakPayload: {
        current: number;
        best: number;
        lastDay?: string;
        nextMilestone?: number | null;
        daysToNext?: number | null;
      };
      if (streak) {
        let lastDayStr: string | undefined;
        if (streak.last_day) {
          if (typeof streak.last_day === "string") {
            lastDayStr = (streak.last_day as any).substring(0, 10);
          } else if (streak.last_day instanceof Date) {
            lastDayStr = streak.last_day.toISOString().substring(0, 10);
          } else {
            try {
              lastDayStr = new Date(streak.last_day as any)
                .toISOString()
                .substring(0, 10);
            } catch {
              lastDayStr = undefined;
            }
          }
        }
        const nm = calcNextMilestone(streak.current_length);
        streakPayload = {
          current: streak.current_length,
          best: streak.best_length,
          ...(lastDayStr ? { lastDay: lastDayStr } : {}),
          nextMilestone: nm,
          daysToNext: nm ? nm - streak.current_length : null,
        };
      } else {
        streakPayload = {
          current: 0,
          best: 0,
          nextMilestone: 7,
          daysToNext: 7,
        };
      }
      res.json({
        success: true,
        data: {
          totalPoints,
          level: levelInfo.level,
          levelLabel: levelInfo.label,
          nextLevelAt: levelInfo.nextLevelAt,
          pointsIntoLevel: levelInfo.pointsIntoLevel,
          pointsForLevel: levelInfo.pointsForLevel,
          prestige: prestige.tier,
          prestigeProgress: prestige.progress,
          modApprovals: approvalsCount,
          streak: streakPayload,
        },
      });
    } catch (e) {
      console.error("Error fetching my score", e);
      res.status(500).json({ success: false, error: "Failed to fetch score" });
    }
  }

  async getMyEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }
      const { limit = "50", before } = req.query as {
        limit?: string;
        before?: string;
      };
      const lim = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

      const where: any = { user_id: req.user.id };
      if (before) {
        where.created_at = { $lt: new Date(before) } as any; // simple cursor
      }

      const rows = await ScoreEvent.findAll({
        where,
        order: [["created_at", "DESC"]],
        limit: lim,
      });
      res.json({
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          type: r.event_type,
          deltaPoints: fromScaled(r.delta),
          refType: r.ref_type,
          refId: r.ref_id,
          createdAt: r.created_at,
          meta: r.meta || undefined,
        })),
      });
    } catch (e) {
      console.error("Error fetching events", e);
      res.status(500).json({ success: false, error: "Failed to fetch events" });
    }
  }

  async getUserPublicScore(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as any;
      const total = await UserScoreTotal.findByPk(userId);
      const totalPoints = fromScaled(total?.total_points || 0);
      const levelInfo = mapPointsToLevel(Math.floor(totalPoints));
      let approvalsCountRow = await UserModerationStat.findByPk(userId);
      let approvalsCount = approvalsCountRow
        ? approvalsCountRow.mod_approvals
        : await ScoreEvent.count({
            where: { user_id: userId, event_type: "MOD_APPROVED_BONUS" },
          });
      const prestigeRecord = await UserPrestige.findByPk(userId);
      const prestige = this.computePrestige(
        totalPoints,
        approvalsCount,
        !!prestigeRecord?.is_moderator
      );
      res.json({
        success: true,
        data: {
          userId: Number(userId),
          totalPoints,
          level: levelInfo.level,
          levelLabel: levelInfo.label,
          nextLevelAt: levelInfo.nextLevelAt,
          prestige: prestige.tier,
          prestigeProgress: prestige.progress,
          modApprovals: approvalsCount,
        },
      });
    } catch (e) {
      console.error("Error fetching user score", e);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch user score" });
    }
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || "daily";
      if (!["daily", "weekly", "monthly", "all"].includes(period)) {
        res.status(400).json({ success: false, error: "Invalid period" });
        return;
      }
      const hasAdvancedParams =
        typeof req.query.limit !== "undefined" ||
        typeof req.query.page !== "undefined" ||
        typeof req.query.search !== "undefined" ||
        typeof req.query.aroundUserId !== "undefined";

      // Default page size adjusted to 20 (was 50) to align with frontend pagination display
      const limit = Math.min(
        100,
        Math.max(1, parseInt(String(req.query.limit || 20), 10) || 20)
      );
      const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1);
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || undefined;
      const aroundUserIdRaw = req.query.aroundUserId as string | undefined;
      const radius = Math.min(
        25,
        Math.max(1, parseInt(String(req.query.radius || 3), 10) || 3)
      );

      // If aroundUserId provided, ignore page/offset and fetch window around that rank
      if (aroundUserIdRaw) {
        const aroundUserId = parseInt(aroundUserIdRaw, 10);
        const windowRows = await leaderboardAggregationService.getAround(
          period as any,
          aroundUserId,
          radius
        );
        res.json({ success: true, data: windowRows, meta: { mode: "around" } });
        return;
      }

      if (!hasAdvancedParams) {
        // Backwards-compatible simple top list for existing tests / legacy consumers
        const rows = await leaderboardAggregationService.get(
          period as any,
          limit
        );
        res.json({ success: true, data: rows });
        return;
      }

      const { rows, total, totalPeriodUsers } =
        await leaderboardAggregationService.getPaginated(period as any, {
          limit,
          offset,
          search,
        });

      res.json({
        success: true,
        data: rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          totalPeriodUsers,
        },
      });
    } catch (e) {
      console.error("Error fetching leaderboard", e);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch leaderboard" });
    }
  }

  /** Daily (or chosen period via query) stats for logged-in user: current rank, points today, posts today, market opportunities today */
  async getMyDailyStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }
      const userId = req.user.id;
      const period = (req.query.period as string) || "daily";
      if (!["daily", "weekly", "monthly", "all"].includes(period)) {
        res.status(400).json({ success: false, error: "Invalid period" });
        return;
      }
      // rank & points for period
      const { rank, points } =
        await leaderboardAggregationService.getUserRankAndPoints(
          period as any,
          userId
        );
      // posts today & market opportunities (is_available=true) today
      const startStr = new Date();
      startStr.setUTCHours(0, 0, 0, 0);
      const dayStart = startStr.toISOString();
      const DiscussionPost = (await import("../models/DiscussionPost")).default;
      const { Op } = await import("sequelize");
      const postsToday = await DiscussionPost.count({
        where: {
          author_id: userId,
          is_deleted: false,
          created_at: { [Op.gte]: dayStart },
        },
      });
      // Market opportunities: global count of all posts currently marked available (not restricted by author or date)
      const marketOpportunities = await DiscussionPost.count({
        where: { is_available: true, is_deleted: false },
      });
      res.json({
        success: true,
        data: {
          period,
          rank,
          points,
          postsToday,
          marketOpportunities,
        },
      });
    } catch (e) {
      console.error("Error fetching daily stats", e);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  }

  async adminAdjust(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }
      const { userId, delta, reason } = req.body || {};
      if (!userId || typeof delta !== "number") {
        res
          .status(400)
          .json({ success: false, error: "userId and numeric delta required" });
        return;
      }
      await scoringActionService.adminAdjust({
        targetUserId: Number(userId),
        adminUserId: req.user.id,
        deltaPoints: delta,
        reason,
      });
      res.json({ success: true });
    } catch (e) {
      console.error("Admin adjust error", e);
      res.status(500).json({ success: false, error: "Failed to adjust" });
    }
  }

  async promoteModerator(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }
      const { userId } = req.body || {};
      if (!userId) {
        res.status(400).json({ success: false, error: "userId required" });
        return;
      }
      const record = await UserPrestige.findByPk(userId);
      if (record) {
        record.is_moderator = true;
        await record.save();
      } else {
        await UserPrestige.create({ user_id: userId, is_moderator: true });
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Moderator promotion error", e);
      res.status(500).json({ success: false, error: "Failed to promote" });
    }
  }
}

// (computePrestige implemented within class)

export default new ScoreController();
