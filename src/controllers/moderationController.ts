import { Request, Response } from "express";
import { Op, WhereOptions } from "sequelize";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import User from "../models/User";
import Tag from "../models/Tag";
import PostMedia from "../models/PostMedia";
import ContentReport from "../models/ContentReport";
import PostSnapshot from "../models/PostSnapshot";
import ReportRateLimit from "../models/ReportRateLimit";
import { getWebSocketService } from "../services/webSocketService";
import notificationService from "../services/notificationService";

// Helper to parse decision input
const isValidDecision = (d: any): d is "retained" | "deleted" | "warned" =>
  d === "retained" || d === "deleted" || d === "warned";

class ModerationController {
  constructor() {
    // Bind methods to ensure proper 'this' context
    this.createReport = this.createReport.bind(this);
    this.getPending = this.getPending.bind(this);
    this.decide = this.decide.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getMetrics = this.getMetrics.bind(this);

    // Bind private methods
    this.reopenReport = this.reopenReport.bind(this);
    this.broadcastReport = this.broadcastReport.bind(this);
    this.notifyContentOwner = this.notifyContentOwner.bind(this);
    this.createPostSnapshot = this.createPostSnapshot.bind(this);
    this.sendEnhancedNotifications = this.sendEnhancedNotifications.bind(this);
  }

  // Enhanced report creation with rate limiting and improved logic
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params; // content id (post or reply)
      const { reason, details } = req.body as {
        reason:
          | "inappropriate"
          | "spam"
          | "fraudulent"
          | "misinformation"
          | "technical"
          | "other";
        details?: string;
      };
      const contentType: "post" | "reply" = req.path.includes("/replies/")
        ? "reply"
        : "post";

      // 1. Validate target exists and is not deleted
      if (contentType === "post") {
        const post = await DiscussionPost.findByPk(id);
        if (!post || (post as any).is_deleted) {
          res.status(404).json({ success: false, error: "Post not found" });
          return;
        }
      } else {
        const reply = await DiscussionReply.findByPk(id);
        if (!reply) {
          res.status(404).json({ success: false, error: "Reply not found" });
          return;
        }
      }

      // 2. Check rate limiting
      const rateLimitResult = await ReportRateLimit.checkRateLimit(
        userId,
        id,
        contentType
      );

      if (!rateLimitResult.allowed) {
        res.status(429).json({
          success: false,
          error:
            rateLimitResult.reason === "hourly_limit_exceeded"
              ? "Too many reports in the last hour"
              : "Cannot report this content again so soon",
          retryAfter: rateLimitResult.retryAfter,
          reason: rateLimitResult.reason,
        });
        return;
      }

      // 3. Check for existing reports by this user for this content
      const existingReport = await ContentReport.findOne({
        where: {
          content_id: id,
          content_type: contentType,
          reporter_id: userId,
        },
        order: [["created_at", "DESC"]],
      });

      let report: any;

      if (existingReport) {
        if ((existingReport as any).status === "pending") {
          // Already has pending report - just return current state
          const reportCount = await ContentReport.count({
            where: {
              content_id: id,
              content_type: contentType,
              status: "pending",
            },
          });
          res.status(200).json({
            success: true,
            data: {
              duplicate: true,
              reportCount,
              existingReportId: existingReport.id,
            },
          });
          return;
        } else {
          // Check if we can reopen this resolved report
          console.log("Checking reopen for existing report:", {
            reportId: existingReport.id,
            status: existingReport.status,
            resolved_at: existingReport.resolved_at,
          });

          const canReopen = ModerationController.checkCanReopenReport(
            existingReport as any
          );
          console.log("Reopen check result:", canReopen);

          if (canReopen.allowed) {
            // Reopen resolved report
            report = await this.reopenReport(
              existingReport as any,
              reason,
              details
            );
          } else {
            // Still in cooldown period
            res.status(400).json({
              success: false,
              error:
                canReopen.reason ||
                `Cannot report this content again for ${canReopen.cooldownHours} hours after last decision`,
              cooldownHours: canReopen.cooldownHours,
            });
            return;
          }
        }
      } else {
        // Create new report
        report = await ContentReport.create({
          content_id: id,
          content_type: contentType,
          reporter_id: userId,
          reason,
          details,
          status: "pending",
        });
      }

      // 4. Record rate limit entry
      await ReportRateLimit.recordReport(userId, id, contentType);

      // 5. Broadcast and notify
      await this.broadcastReport(report);
      await this.notifyContentOwner(report);

      // 6. Return response
      const reportCount = await ContentReport.count({
        where: {
          content_id: id,
          content_type: contentType,
          status: "pending",
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: report.id,
          reportCount,
          isReopened: !!existingReport,
        },
      });
    } catch (error: any) {
      console.error("Error creating report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create report",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Enhanced method to check if a report can be reopened with detailed response
  private static checkCanReopenReport(existingReport: any): {
    allowed: boolean;
    reason?: string;
    cooldownHours?: number;
  } {
    if (existingReport.status === "pending") {
      return { allowed: false, reason: "Report is already pending" };
    }

    const cooldownHours = parseInt(
      process.env.MODERATION_REOPEN_COOLDOWN_HOURS || "24",
      10
    );

    if (!existingReport.resolved_at) {
      return { allowed: true }; // No resolution time recorded
    }

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const timeSinceResolution =
      Date.now() - new Date(existingReport.resolved_at).getTime();

    if (timeSinceResolution >= cooldownMs) {
      return { allowed: true };
    } else {
      const remainingTime = Math.ceil(
        (cooldownMs - timeSinceResolution) / (1000 * 60 * 60)
      );
      return {
        allowed: false,
        reason: `Must wait ${remainingTime} more hours before reporting this content again`,
        cooldownHours: remainingTime,
      };
    }
  }

  // Helper method to check if a report can be reopened (legacy method)
  private canReopenReport(existingReport: any): boolean {
    return ModerationController.checkCanReopenReport(existingReport).allowed;
  }

  // Helper method to reopen an existing report
  private async reopenReport(
    existingReport: any,
    reason: string,
    details?: string
  ): Promise<any> {
    existingReport.status = "pending";
    existingReport.reason = reason;
    existingReport.details = details;
    existingReport.decision = null;
    existingReport.moderator_id = null;
    existingReport.resolution_notes = null;
    existingReport.resolved_at = null;
    existingReport.created_at = new Date(); // Update to current time for ordering

    await existingReport.save();
    return existingReport;
  }

  // Helper method to broadcast report
  private async broadcastReport(report: any): Promise<void> {
    try {
      const ws = getWebSocketService();
      ws.broadcastContentReport({
        id: report.id,
        contentId: report.content_id,
        contentType: report.content_type,
        reason: report.reason,
        details: report.details,
        reporterId: report.reporter_id,
        created_at:
          report.created_at?.toISOString?.() || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to broadcast report:", error);
      // Don't fail the entire operation if broadcast fails
    }
  }

  // Helper method to notify content owner
  private async notifyContentOwner(report: any): Promise<void> {
    try {
      if (report.content_type === "post") {
        await notificationService.notifyContentReported(
          report.content_id,
          "post",
          report.reason
        );
      } else {
        await notificationService.notifyContentReported(
          report.content_id,
          "reply",
          report.reason
        );
      }
    } catch (error) {
      console.error("Failed to notify content owner:", error);
      // Don't fail the entire operation if notification fails
    }
  }

  // Get pending cases (group by content/post)
  async getPending(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        page = "1",
        limit = "10",
      } = req.query as {
        search?: string;
        page?: string;
        limit?: string;
      };
      const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
      const limitNum = Math.min(
        Math.max(parseInt(String(limit), 10) || 10, 1),
        100
      );

      const reopenThreshold = parseInt(
        process.env.MODERATION_REOPEN_THRESHOLD || "1",
        10
      );
      const reopenCooldownMin = parseInt(
        process.env.MODERATION_REOPEN_COOLDOWN_MIN || "0",
        10
      );

      // Only posts for this first iteration
      const pendingReports = await ContentReport.findAll({
        where: { status: "pending", content_type: "post" },
        include: [
          {
            model: DiscussionPost,
            as: "post",
            include: [
              {
                model: User,
                as: "author",
                attributes: ["id", "firstname", "lastname"],
              },
              {
                model: Tag,
                as: "tags",
                attributes: ["name"],
                through: { attributes: [] },
              },
              {
                model: PostMedia,
                as: "media",
                attributes: [
                  "id",
                  "media_type",
                  "url",
                  "thumbnail_url",
                  "display_order",
                ],
                separate: true,
              },
            ],
          },
          {
            model: User,
            as: "reporter",
            attributes: ["id", "firstname", "lastname"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // Compute last decision per post for reopen logic
      const postIds = Array.from(
        new Set((pendingReports as any[]).map((r) => r.content_id))
      );
      const lastResolvedRows = await ContentReport.findAll({
        where: {
          content_type: "post",
          status: "resolved",
          content_id: postIds,
        },
        order: [["resolved_at", "DESC"]],
      });
      const lastResolvedAtByPost = new Map<string, Date>();
      for (const r of lastResolvedRows as any[]) {
        const pid = r.content_id as string;
        if (!lastResolvedAtByPost.has(pid) && r.resolved_at) {
          lastResolvedAtByPost.set(pid, new Date(r.resolved_at));
        }
      }

      // Group by post and apply reopen threshold/cooldown rules
      const map = new Map<string, any>();
      for (const r of pendingReports as any[]) {
        const pid = r.content_id;
        const entry = map.get(pid) || {
          postId: pid,
          post: r.post,
          reports: [] as any[],
        };
        entry.reports.push({
          id: r.id,
          reason: r.reason,
          details: r.details,
          reporter: r.reporter,
          created_at: r.created_at,
        });
        map.set(pid, entry);
      }

      let items = Array.from(map.values());

      // Apply reopen logic
      const now = new Date();
      items = items.filter((it) => {
        const lastResolved = lastResolvedAtByPost.get(it.postId);
        if (!lastResolved) return true; // no prior decision
        // Cooldown: skip if within cooldown window
        if (reopenCooldownMin > 0) {
          const ms = reopenCooldownMin * 60 * 1000;
          if (now.getTime() - lastResolved.getTime() < ms) return false;
        }
        // Threshold: number of reports after last decision
        const countAfterDecision = it.reports.filter(
          (r: any) => new Date(r.created_at) > lastResolved
        ).length;
        return countAfterDecision >= reopenThreshold;
      });
      if (search) {
        const q = search.toLowerCase();
        items = items.filter((it) => {
          const title = String(it.post.title || "").toLowerCase();
          const author = String(
            (it.post.author?.firstname || "") +
              " " +
              (it.post.author?.lastname || "")
          )
            .trim()
            .toLowerCase();
          const tagNames = Array.isArray(it.post.tags)
            ? (it.post.tags as Array<{ name: string }>)
                .map((t) => String(t.name || "").toLowerCase())
                .join(" ")
            : "";
          const reasons = (it.reports || [])
            .map((r: any) => String(r.reason || "").toLowerCase())
            .join(" ");
          const reporterNames = (it.reports || [])
            .map((r: any) =>
              String(
                (
                  (r.reporter?.firstname || "") +
                  " " +
                  (r.reporter?.lastname || "")
                ).trim()
              ).toLowerCase()
            )
            .join(" ");

          return (
            title.includes(q) ||
            author.includes(q) ||
            tagNames.includes(q) ||
            reasons.includes(q) ||
            reporterNames.includes(q)
          );
        });
      }

      // Summaries
      const summarized = items.map((it) => ({
        postId: it.postId,
        reportCount: it.reports.length,
        mostCommonReason:
          it.reports.reduce((acc: Record<string, number>, r: any) => {
            acc[r.reason] = (acc[r.reason] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) &&
          Object.entries(
            it.reports.reduce((acc: Record<string, number>, r: any) => {
              acc[r.reason] = (acc[r.reason] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).sort((a: any, b: any) => b[1] - a[1])[0][0],
        post: it.post,
        reports: it.reports,
      }));

      // Search filter
      let filtered = summarized;
      if (search) {
        const q = search.toLowerCase();
        filtered = summarized.filter((it) => {
          const title = String(it.post.title || "").toLowerCase();
          const author = String(
            (it.post.author?.firstname || "") +
              " " +
              (it.post.author?.lastname || "")
          )
            .trim()
            .toLowerCase();
          const tagNames = Array.isArray(it.post.tags)
            ? (it.post.tags as Array<{ name: string }>)
                .map((t) => String(t.name || "").toLowerCase())
                .join(" ")
            : "";
          const reasons = (it.reports || [])
            .map((r: any) => String(r.reason || "").toLowerCase())
            .join(" ");
          const reporterNames = (it.reports || [])
            .map((r: any) =>
              String(
                (
                  (r.reporter?.firstname || "") +
                  " " +
                  (r.reporter?.lastname || "")
                ).trim()
              ).toLowerCase()
            )
            .join(" ");

          return (
            title.includes(q) ||
            author.includes(q) ||
            tagNames.includes(q) ||
            reasons.includes(q) ||
            reporterNames.includes(q)
          );
        });
      }

      const total = filtered.length;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      const data = filtered.slice(start, end);
      res.json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1),
          hasNextPage: end < total,
        },
      });
    } catch (error) {
      console.error("Error fetching pending moderation:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch pending" });
    }
  }

  // Enhanced decide method with post snapshots
  async decide(req: Request, res: Response): Promise<void> {
    try {
      const moderatorId = (req as any).user?.userId || (req as any).user?.id;
      const { postId } = req.params;
      const { decision, justification } = req.body as {
        decision: "retained" | "deleted" | "warned";
        justification: string;
      };

      if (!isValidDecision(decision)) {
        res.status(400).json({ success: false, error: "Invalid decision" });
        return;
      }
      if ((decision === "deleted" || decision === "warned") && !justification) {
        res
          .status(400)
          .json({ success: false, error: "Justification required" });
        return;
      }

      const post = await DiscussionPost.findByPk(postId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "firstname", "lastname", "district", "province"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["name"],
            through: { attributes: [] },
          },
          {
            model: PostMedia,
            as: "media",
            attributes: ["media_type", "url", "thumbnail_url", "display_order"],
          },
        ],
      });
      if (!post) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }

      // Fetch all pending reports for this post
      const reports = await ContentReport.findAll({
        where: { content_id: postId, content_type: "post", status: "pending" },
        include: [{ model: User, as: "reporter", attributes: ["id"] }],
      });

      const reportCount = reports.length;
      if (reportCount === 0) {
        res
          .status(400)
          .json({ success: false, error: "No pending reports found" });
        return;
      }

      // CRITICAL: Create post snapshot BEFORE applying decision
      const postSnapshot = await this.createPostSnapshot(
        post as any,
        reports[0].id
      );

      // Apply decision effects
      if (decision === "deleted") {
        (post as any).is_deleted = true;
        await post.save();
        // Broadcast deletion so clients update feeds immediately
        try {
          const ws = getWebSocketService();
          ws.broadcastPostDelete(postId);
        } catch (e) {
          console.error("WebSocket broadcast delete failed:", e);
        }
      }

      // Mark reports as resolved with decision snapshot
      const now = new Date();
      for (const r of reports) {
        (r as any).status = "resolved";
        (r as any).decision = decision as any;
        (r as any).moderator_id = moderatorId;
        (r as any).resolution_notes = justification;
        (r as any).resolved_at = now as any;
        (r as any).post_snapshot_id = postSnapshot.id; // NEW: Link to snapshot
        await r.save();
      }

      // Send notifications
      const reporterIds = Array.from(
        new Set(reports.map((r: any) => r.reporter_id))
      );

      // Broadcast decision for dashboards
      const ws = getWebSocketService();
      ws.broadcastModerationDecision({
        postId: postId,
        decision: decision as "retained" | "deleted" | "warned",
        justification,
        moderatorId,
        decidedAt: now.toISOString(),
        reportCount,
      });

      // Send enhanced notifications
      await this.sendEnhancedNotifications(
        reporterIds,
        (post as any).author.id,
        postId,
        (post as any).title,
        decision as "retained" | "deleted" | "warned",
        justification,
        moderatorId
      );

      res.json({ success: true, data: { postId, decision, reportCount } });
    } catch (error) {
      console.error("Error applying moderation decision:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to apply decision" });
    }
  }

  // Create post snapshot for historical record
  private async createPostSnapshot(post: any, reportId: string): Promise<any> {
    const authorData = {
      id: post.author.id,
      name: `${post.author.firstname} ${post.author.lastname}`,
      district: post.author.district || undefined,
      province: post.author.province || undefined,
    };

    const mediaData =
      post.media?.map((m: any) => ({
        type: m.media_type,
        url: m.url,
        thumbnail_url: m.thumbnail_url,
        display_order: m.display_order,
      })) || undefined;

    const tagsData = post.tags?.map((t: any) => t.name) || undefined;

    return await PostSnapshot.create({
      content_report_id: reportId,
      post_id: post.id,
      title: post.title,
      content: post.content,
      author_data: authorData,
      media_data: mediaData,
      tags_data: tagsData,
      snapshot_reason: "moderation_decision",
    });
  }

  // Send enhanced notifications to all parties
  private async sendEnhancedNotifications(
    reporterIds: number[],
    authorId: number,
    postId: string,
    postTitle: string,
    decision: "retained" | "deleted" | "warned",
    justification: string,
    moderatorId: number
  ): Promise<void> {
    try {
      // Notify all reporters
      for (const rid of reporterIds) {
        await notificationService.createNotification({
          recipientId: rid,
          type: "moderation_decision_reporter" as any,
          triggerUserId: moderatorId,
          data: {
            postId,
            postTitle,
            decision: decision as "retained" | "deleted" | "warned",
            justification,
          },
        });
      }

      // Notify content owner
      await notificationService.createNotification({
        recipientId: authorId,
        type: "moderation_decision_owner" as any,
        triggerUserId: moderatorId,
        data: {
          postId,
          postTitle,
          decision: decision as "retained" | "deleted" | "warned",
          justification,
        },
      });
    } catch (error) {
      console.error("Failed to send notifications:", error);
      // Don't fail the entire operation if notifications fail
    }
  }

  // History with filters and basic metrics dimensions
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const {
        from,
        to,
        search,
        decision,
        page = "1",
        limit = "10",
      } = req.query as {
        from?: string;
        to?: string;
        search?: string;
        decision?: "retained" | "deleted" | "warned";
        page?: string;
        limit?: string;
      };
      const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
      const limitNum = Math.min(
        Math.max(parseInt(String(limit), 10) || 10, 1),
        100
      );

      const where: WhereOptions = { content_type: "post", status: "resolved" };
      if (decision) (where as any).decision = decision;
      if (from)
        (where as any).resolved_at = { [Op.gte]: new Date(from) } as any;
      if (to)
        (where as any).resolved_at = {
          ...(where as any).resolved_at,
          [Op.lte]: new Date(to),
        } as any;

      const rows = await ContentReport.findAll({
        where,
        include: [
          {
            model: DiscussionPost,
            as: "post",
            include: [
              {
                model: User,
                as: "author",
                attributes: ["id", "firstname", "lastname"],
              },
              {
                model: Tag,
                as: "tags",
                attributes: ["name"],
                through: { attributes: [] },
              },
              {
                model: PostMedia,
                as: "media",
                attributes: [
                  "id",
                  "media_type",
                  "url",
                  "thumbnail_url",
                  "display_order",
                ],
                separate: true,
              },
            ],
          },
          {
            model: User,
            as: "moderator",
            attributes: ["id", "firstname", "lastname"],
          },
          {
            model: PostSnapshot,
            as: "postSnapshot",
            required: false,
          },
        ],
        order: [["resolved_at", "DESC"]],
      });

      // Group by post to count reports per decision
      const groupedByPost = new Map<string, any[]>();
      for (const r of rows as any[]) {
        const pid = r.content_id;
        const arr = groupedByPost.get(pid) || [];
        arr.push(r);
        groupedByPost.set(pid, arr);
      }

      let history = Array.from(groupedByPost.entries()).map(
        ([postId, reportGroup]) => {
          const firstReport = reportGroup[0];
          return {
            postId,
            decision: firstReport.decision,
            moderator: {
              id: firstReport.moderator?.id || "unknown",
              name: firstReport.moderator
                ? `${firstReport.moderator.firstname} ${firstReport.moderator.lastname}`
                : "Unknown Moderator",
            },
            decidedAt: firstReport.resolved_at,
            count: reportGroup.length,
            justification: firstReport.resolution_notes,
            post: firstReport.post,
            postSnapshot: firstReport.postSnapshot,
          };
        }
      );

      // Optional text search across title, author name, moderator name, and justification
      if (search && String(search).trim().length > 0) {
        const q = String(search).toLowerCase();
        history = history.filter((h: any) => {
          const title = String(h.post?.title ?? "").toLowerCase();
          const authorName = String(
            [h.post?.author?.firstname, h.post?.author?.lastname]
              .filter(Boolean)
              .join(" ")
          ).toLowerCase();
          const moderatorName = String(h.moderator?.name ?? "").toLowerCase();
          const justification = String(h.justification ?? "").toLowerCase();
          return (
            title.includes(q) ||
            authorName.includes(q) ||
            moderatorName.includes(q) ||
            justification.includes(q)
          );
        });
      }

      const total = history.length;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      const data = history.slice(start, end);

      res.json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1),
          hasNextPage: end < total,
        },
      });
    } catch (error) {
      console.error("Error fetching moderation history:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch history" });
    }
  }

  // Enhanced metrics endpoint
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get all content reports for analysis
      const rows = await ContentReport.findAll({
        where: {
          content_type: "post",
          created_at: { [Op.gte]: thirtyDaysAgo },
        },
        attributes: [
          "id",
          "content_id",
          "reporter_id",
          "status",
          "decision",
          "created_at",
          "resolved_at",
        ],
        order: [["created_at", "ASC"]],
      });

      // Compute metrics
      const pendingCount = await ContentReport.count({
        where: { content_type: "post", status: "pending" },
      });

      const decisionsLast7d = await ContentReport.count({
        where: {
          content_type: "post",
          status: "resolved",
          resolved_at: { [Op.gte]: sevenDaysAgo },
        },
      });

      // Time to decision analysis
      const timeToDecisionSeconds: number[] = [];
      const decisionDistribution = { retained: 0, deleted: 0, warned: 0 };
      const reportsPerPost = new Map<string, number>();
      const reportsPerReporter = new Map<number, number>();

      for (const r of rows as any[]) {
        const key = r.content_id;
        reportsPerPost.set(key, (reportsPerPost.get(key) || 0) + 1);
        reportsPerReporter.set(
          r.reporter_id,
          (reportsPerReporter.get(r.reporter_id) || 0) + 1
        );

        if (r.status === "resolved" && r.resolved_at && r.created_at) {
          const timeToDecision =
            (new Date(r.resolved_at).getTime() -
              new Date(r.created_at).getTime()) /
            1000;
          timeToDecisionSeconds.push(timeToDecision);

          if (
            r.decision &&
            decisionDistribution[
              r.decision as keyof typeof decisionDistribution
            ] !== undefined
          ) {
            decisionDistribution[
              r.decision as keyof typeof decisionDistribution
            ]++;
          }
        }
      }

      // Calculate median time to decision
      const sortedTimes = timeToDecisionSeconds.sort((a, b) => a - b);
      const medianTimeToDecisionSec =
        sortedTimes.length > 0
          ? sortedTimes[Math.floor(sortedTimes.length / 2)]
          : 0;

      // Response accuracy (percentage of reports leading to action)
      const totalResolvedReports = decisionsLast7d;
      const actionableReports =
        decisionDistribution.deleted + decisionDistribution.warned;
      const reportAccuracy =
        totalResolvedReports > 0
          ? Math.round((actionableReports / totalResolvedReports) * 100)
          : 0;

      // Reopened cases analysis
      const resolvedByPost = new Map<string, Date[]>();
      for (const r of rows as any[]) {
        if (r.status === "resolved" && r.resolved_at) {
          const arr = resolvedByPost.get(r.content_id) || [];
          arr.push(new Date(r.resolved_at));
          resolvedByPost.set(r.content_id, arr);
        }
      }

      let reopenedCasesWithin30Days = 0;
      for (const [postId, dates] of resolvedByPost.entries()) {
        const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
        if (sortedDates.length > 1) {
          // Check if there were multiple decisions within 30 days
          for (let i = 1; i < sortedDates.length; i++) {
            const timeDiff =
              sortedDates[i].getTime() - sortedDates[i - 1].getTime();
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            if (daysDiff <= 30) {
              reopenedCasesWithin30Days++;
              break;
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          pendingCount,
          decisionsLast7d,
          medianTimeToDecisionSec: Math.round(medianTimeToDecisionSec),
          reportAccuracy,
          reopenedCasesWithin30Days,
          decisionDistribution,
          avgReportsPerPost:
            reportsPerPost.size > 0
              ? Array.from(reportsPerPost.values()).reduce((a, b) => a + b, 0) /
                reportsPerPost.size
              : 0,
          topReporters: Array.from(reportsPerReporter.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([reporterId, count]) => ({ reporterId, reportCount: count })),
        },
      });
    } catch (error) {
      console.error("Error computing moderation metrics:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to compute metrics" });
    }
  }
}

export default new ModerationController();
