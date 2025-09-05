import { Request, Response } from "express";
import DiscussionPost from "../models/DiscussionPost";
import User from "../models/User";
import Tag from "../models/Tag";
import PostMedia from "../models/PostMedia";
import { getWebSocketService } from "../services/webSocketService";
import scoringActionService from "../services/scoring/ScoringActionService";
import notificationService from "../services/notificationService";

class DiscussionModerationController {
  /**
   * Approve a pending post
   */
  async approvePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await DiscussionPost.findByPk(id);
      if (!post || post.is_deleted) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }

      if (post.is_approved) {
        res
          .status(200)
          .json({ success: true, data: { id: post.id, is_approved: true } });
        return;
      }

      post.is_approved = true;
      await post.save();

      // Notify author
      await notificationService.notifyPostApproved(post.id);

      // Scoring: moderator approved bonus (await for consistency in tests)
      try {
        const moderatorId = (req as any).user?.userId || (req as any).user?.id;
        await scoringActionService.awardModeratorApproval(post, moderatorId);
      } catch (e) {
        console.error("[scoring] mod approval bonus failed", e);
      }

      // Load enriched data and broadcast update
      const enriched = await DiscussionPost.findByPk(post.id, {
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
            required: false,
          },
        ],
      });

      try {
        const ws = getWebSocketService();
        const data: any = enriched as any;
        ws.broadcastPostUpdate({
          id: post.id,
          title: post.title,
          content: post.content,
          tags: (data.tags || []).map((t: any) => t.name),
          is_market_post: post.is_market_post,
          is_available: post.is_available,
          is_approved: true,
          media: (data.media || []).map((m: any) => ({
            id: m.id,
            media_type: m.media_type,
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            display_order: m.display_order,
          })),
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("WebSocket moderation broadcast error:", e);
      }

      res
        .status(200)
        .json({ success: true, data: { id: post.id, is_approved: true } });
    } catch (error) {
      console.error("Error approving post:", error);
      res.status(500).json({ success: false, error: "Failed to approve post" });
    }
  }

  /**
   * Reject a pending post (soft reject: set is_approved=false)
   */
  async rejectPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await DiscussionPost.findByPk(id);
      if (!post || post.is_deleted) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }
      // Capture moderator ID up front
      const moderatorId = (req as any).user?.userId || (req as any).user?.id;

      // Always attempt to reverse any prior approval bonus, even if the
      // current is_approved flag is already false. This prevents a race where:
      // 1. Approve request (sets bonus +15) is in-flight but not yet persisted.
      // 2. User quickly triggers undo (reject) before is_approved flips to true.
      // 3. Previous code early-returned (since is_approved still false) and skipped reversal.
      // 4. Approve finishes; +15 persists with no reversal. (Observed bug)
      // New logic: Always call reversal (idempotent inside service), then ensure flag is false.
      try {
        await scoringActionService.reverseModeratorApproval(post, moderatorId);
      } catch (e) {
        console.error("[scoring] mod approval reversal failed", e);
      }

      if (post.is_approved) {
        post.is_approved = false;
        await post.save();
      }

      // Load enriched data and broadcast update
      const enriched = await DiscussionPost.findByPk(post.id, {
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
            required: false,
          },
        ],
      });

      try {
        const ws = getWebSocketService();
        const data: any = enriched as any;
        ws.broadcastPostUpdate({
          id: post.id,
          title: post.title,
          content: post.content,
          tags: (data.tags || []).map((t: any) => t.name),
          is_market_post: post.is_market_post,
          is_available: post.is_available,
          is_approved: false,
          media: (data.media || []).map((m: any) => ({
            id: m.id,
            media_type: m.media_type,
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            display_order: m.display_order,
          })),
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("WebSocket moderation broadcast error:", e);
      }

      res
        .status(200)
        .json({ success: true, data: { id: post.id, is_approved: false } });
    } catch (error) {
      console.error("Error rejecting post:", error);
      res.status(500).json({ success: false, error: "Failed to reject post" });
    }
  }
}

export default new DiscussionModerationController();
