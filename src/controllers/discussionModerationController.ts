import { Request, Response } from "express";
import DiscussionPost from "../models/DiscussionPost";
import User from "../models/User";
import Tag from "../models/Tag";
import PostMedia from "../models/PostMedia";
import { getWebSocketService } from "../services/webSocketService";
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

      if (!post.is_approved) {
        res
          .status(200)
          .json({ success: true, data: { id: post.id, is_approved: false } });
        return;
      }

      post.is_approved = false;
      await post.save();

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
