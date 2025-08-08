import { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import sequelize from "../config/database";
import { getWebSocketService } from "../services/webSocketService";
import notificationService from "../services/notificationService";

// Import models
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import PostMedia from "../models/PostMedia";
import PostTag from "../models/PostTag";
import UserVote from "../models/UserVote";
import ContentReport from "../models/ContentReport";
import User from "../models/User";

// Request interfaces matching frontend expectations
interface CreatePostRequest {
  title: string;
  content: string;
  tags: string[];
  is_market_post?: boolean;
  is_available?: boolean;
  media_files?: {
    url: string;
    media_type: "image" | "video";
    thumbnail_url?: string;
  }[];
}

interface VoteRequest {
  vote_type: "upvote" | "downvote"; // Match the model
}

interface CreateReplyRequest {
  content: string;
  parent_reply_id?: string;
}

interface ReportRequest {
  content_type: "post" | "reply";
  content_id: string;
  reason:
    | "inappropriate"
    | "spam"
    | "fraudulent"
    | "misinformation"
    | "technical"
    | "other";
  details?: string;
}

// Extended request type for authenticated routes
interface AuthenticatedRequest extends Request {
  user?: {
    id: number; // Using existing auth middleware type
    email: string;
    role: string;
    permissions: string[];
  };
}

class DiscussionController {
  /**
   * Get posts with pagination, search, and filtering
   * GET /api/discussions/posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        tag = "",
        sort = "recent",
        is_market_post,
        user_id,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where conditions
      const whereConditions: any = {
        is_deleted: false,
        is_approved: true, // Only show approved posts
      };

      // Add search filter
      if (search) {
        whereConditions[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Add market post filter
      if (is_market_post !== undefined) {
        whereConditions.is_market_post = is_market_post === "true";
      }

      // Add user filter for "My Posts"
      if (user_id) {
        whereConditions.author_id = user_id;
        // For user's own posts, show all including non-approved
        delete whereConditions.is_approved;
      }

      // Build order clause
      let order: any[] = [];
      switch (sort) {
        case "popular":
          order = [
            [sequelize.literal("upvotes - downvotes"), "DESC"],
            ["created_at", "DESC"],
          ];
          break;
        case "replies":
          order = [
            ["replies_count", "DESC"],
            ["created_at", "DESC"],
          ];
          break;
        case "recent":
        default:
          order = [["created_at", "DESC"]];
          break;
      }

      // Build include array
      const include: any[] = [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstname",
            "lastname",
            "email",
            "organization",
            "sector",
            "points",
            "is_verified",
          ],
          required: false,
        },
        {
          model: PostMedia,
          as: "media",
          attributes: ["id", "url", "media_type", "thumbnail_url"],
          required: false,
        },
        {
          model: PostTag,
          as: "tags",
          attributes: ["tag_name"],
          required: false,
        },
      ];

      // Add user vote information if user is authenticated
      if (req.user) {
        include.push({
          model: UserVote,
          as: "votes",
          where: {
            user_id: req.user.id.toString(),
            reply_id: { [Op.is]: null },
          },
          required: false,
          attributes: ["vote_type"],
        });
      }

      // Add tag filter if specified
      if (tag && tag !== "All") {
        whereConditions["$tags.tag_name$"] = tag;
      }

      const { rows: posts, count: total } =
        await DiscussionPost.findAndCountAll({
          where: whereConditions,
          include,
          order,
          limit: Number(limit),
          offset,
          distinct: true,
          subQuery: false,
        });

      // Transform data to match frontend expectations
      const transformedPosts = posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          id: post.author.id,
          firstname: post.author.first_name,
          lastname: post.author.last_name,
          avatar: post.author.profile?.profile_image_url || null,
          level_id: this.getUserLevel(post.author.profile?.posts_count || 0),
          points: this.getUserPoints(post.author.profile),
          location: post.author.profile?.location || "",
        },
        tags: post.tags?.map((tag: any) => tag.tag_name) || [],
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        userVote: post.votes?.[0]?.vote_type || null,
        replies: post.replies_count,
        shares: 0, // TODO: Implement shares tracking
        isMarketPost: post.is_market_post,
        isAvailable: post.is_available,
        createdAt: this.formatTimeAgo(post.created_at),
        images:
          post.media
            ?.filter((m: any) => m.media_type === "image")
            .map((m: any) => m.url) || [],
        video:
          post.media?.find((m: any) => m.media_type === "video")?.url || null,
        isModeratorApproved: post.is_approved,
      }));

      res.json({
        success: true,
        data: {
          posts: transformedPosts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch posts",
      });
    }
  }

  /**
   * Create a new post
   * POST /api/discussions/posts
   */
  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const {
        title,
        content,
        tags = [],
        is_market_post = false,
        is_available = true,
        media_files = [],
      }: CreatePostRequest = req.body;

      // Validation
      if (!title || title.length < 10 || title.length > 255) {
        res.status(400).json({
          success: false,
          error: "Title must be between 10 and 255 characters",
        });
        return;
      }

      if (!content || content.length < 20 || content.length > 10000) {
        res.status(400).json({
          success: false,
          error: "Content must be between 20 and 10,000 characters",
        });
        return;
      }

      if (tags.length > 3) {
        res.status(400).json({
          success: false,
          error: "Maximum 3 tags allowed",
        });
        return;
      }

      // Create the post
      const post = await DiscussionPost.create(
        {
          title,
          content,
          author_id: req.user.id,
          is_market_post,
          is_available: is_market_post ? is_available : true,
          is_approved: false, // Posts need moderation approval
        },
        { transaction }
      );

      // Create tags
      if (tags.length > 0) {
        const tagPromises = tags.map((tag_name: string) =>
          PostTag.create(
            {
              post_id: post.id,
              tag_name: tag_name.trim(),
            },
            { transaction }
          )
        );
        await Promise.all(tagPromises);
      }

      // Create media files
      if (media_files.length > 0) {
        const mediaPromises = media_files.map((media, index) =>
          PostMedia.create(
            {
              post_id: post.id,
              media_type: media.media_type,
              file_name: `media-${index}-${Date.now()}`,
              file_size: 0, // Default, would be set during actual upload
              mime_type:
                media.media_type === "image" ? "image/jpeg" : "video/mp4",
              file_url: media.url,
              thumbnail_url: media.thumbnail_url,
              provider_type: "LOCAL",
              provider_file_id: `local-${Date.now()}-${index}`,
              display_order: index,
              is_primary: index === 0,
              processing_status: "ready",
              uploaded_at: new Date(),
            },
            { transaction }
          )
        );
        await Promise.all(mediaPromises);
      }

      await transaction.commit();

      // Fetch the created post with author info for broadcasting
      const createdPost = await DiscussionPost.findByPk(post.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "firstname", "lastname"],
          },
          {
            model: PostTag,
            as: "tags",
            attributes: ["tag_name"],
          },
        ],
      });

      // Emit WebSocket event for real-time updates
      try {
        const webSocketService = getWebSocketService();
        const postData = createdPost as any; // Type assertion for associations
        webSocketService.broadcastPostCreate({
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            id: postData.author.id,
            firstname: postData.author.firstname,
            lastname: postData.author.lastname,
          },
          tags: postData.tags.map((tag: any) => tag.tag_name),
          is_market_post: post.is_market_post,
          upvotes: 0,
          downvotes: 0,
          replies_count: 0,
          created_at: post.created_at.toISOString(),
        });
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Continue execution - WebSocket errors shouldn't break the API
      }

      res.status(201).json({
        success: true,
        data: {
          id: post.id,
          message: "Post created successfully and submitted for moderation",
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating post:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create post",
      });
    }
  }

  /**
   * Vote on a post
   * POST /api/discussions/posts/:id/vote
   */
  async votePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: postId } = req.params;
      const { vote_type }: VoteRequest = req.body;

      if (!["upvote", "downvote"].includes(vote_type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid vote type. Must be "upvote" or "downvote"',
        });
        return;
      }

      // Check if post exists
      const post = await DiscussionPost.findByPk(postId);
      if (!post || post.is_deleted) {
        res.status(404).json({
          success: false,
          error: "Post not found",
        });
        return;
      }

      // Check for existing vote
      const existingVote = await UserVote.findOne({
        where: {
          user_id: req.user.id,
          post_id: postId,
          reply_id: undefined,
        },
      });

      let voteChange = { upvotes: 0, downvotes: 0 };

      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // Remove vote (toggle off)
          await existingVote.destroy({ transaction });
          voteChange[
            existingVote.vote_type === "upvote" ? "upvotes" : "downvotes"
          ] = -1;
        } else {
          // Change vote
          const oldVoteType = existingVote.vote_type;
          existingVote.vote_type = vote_type;
          await existingVote.save({ transaction });

          voteChange[oldVoteType === "upvote" ? "upvotes" : "downvotes"] = -1;
          voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
        }
      } else {
        // Create new vote
        await UserVote.create(
          {
            user_id: req.user.id,
            post_id: postId,
            vote_type,
          },
          { transaction }
        );

        voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
      }

      // Update post vote counts
      await post.increment(voteChange, { transaction });

      await transaction.commit();

      // Get updated post data
      const updatedPost = await DiscussionPost.findByPk(postId, {
        attributes: ["upvotes", "downvotes"],
      });

      const finalUserVote =
        existingVote && existingVote.vote_type === vote_type ? null : vote_type;

      // Emit WebSocket event for real-time vote updates
      try {
        const webSocketService = getWebSocketService();
        webSocketService.broadcastPostVote({
          postId,
          userId: req.user.id,
          voteType: finalUserVote,
          upvotes: updatedPost?.upvotes || 0,
          downvotes: updatedPost?.downvotes || 0,
        });

        // Send notification to post author (only for new votes, not removes)
        if (finalUserVote) {
          await notificationService.notifyPostVote(
            postId,
            req.user.id,
            finalUserVote
          );
        }
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Continue execution - WebSocket errors shouldn't break the API
      }

      res.json({
        success: true,
        data: {
          upvotes: updatedPost?.upvotes || 0,
          downvotes: updatedPost?.downvotes || 0,
          userVote: finalUserVote,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error voting on post:", error);
      res.status(500).json({
        success: false,
        error: "Failed to vote on post",
      });
    }
  }

  /**
   * Get replies for a post
   * GET /api/discussions/posts/:id/replies
   */
  async getReplies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: postId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const include: any[] = [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstname",
            "lastname",
            "organization",
            "points",
            "is_verified",
          ],
          required: false,
        },
        {
          model: DiscussionReply,
          as: "childReplies",
          include: [
            {
              model: User,
              as: "author",
              attributes: [
                "id",
                "firstname",
                "lastname",
                "organization",
                "points",
                "is_verified",
              ],
              required: false,
            },
          ],
          required: false,
        },
      ];

      // Add user vote information if authenticated
      if (req.user) {
        include.push({
          model: UserVote,
          as: "votes",
          where: { user_id: req.user.id, post_id: null },
          required: false,
          attributes: ["vote_type"],
        });
      }

      const replies = await DiscussionReply.findAll({
        where: {
          post_id: postId,
          parent_reply_id: undefined, // Only top-level replies
          is_deleted: false,
        },
        include,
        order: [["created_at", "DESC"]],
        limit: Number(limit),
        offset,
      });

      const transformedReplies = replies.map((reply: any) => ({
        id: reply.id,
        content: reply.content,
        author: {
          id: reply.author.id,
          firstname: reply.author.first_name,
          lastname: reply.author.last_name,
          avatar: reply.author.profile?.profile_image_url || null,
          level_id: 1, // TODO: Calculate based on activity
        },
        createdAt: this.formatTimeAgo(reply.created_at),
        upvotes: reply.upvotes,
        downvotes: reply.downvotes,
        userVote: reply.votes?.[0]?.vote_type || null,
        replies:
          reply.childReplies?.map((childReply: any) => ({
            id: childReply.id,
            content: childReply.content,
            author: {
              id: childReply.author.id,
              firstname: childReply.author.first_name,
              lastname: childReply.author.last_name,
              avatar: childReply.author.profile?.profile_image_url || null,
              level_id: 1,
            },
            createdAt: this.formatTimeAgo(childReply.created_at),
            upvotes: childReply.upvotes,
            downvotes: childReply.downvotes,
            userVote: null, // TODO: Add nested vote tracking
          })) || [],
      }));

      res.json({
        success: true,
        data: {
          replies: transformedReplies,
        },
      });
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch replies",
      });
    }
  }

  /**
   * Create a reply to a post
   * POST /api/discussions/posts/:id/replies
   */
  async createReply(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: postId } = req.params;
      const { content, parent_reply_id }: CreateReplyRequest = req.body;

      // Validation
      if (!content || content.length < 10 || content.length > 2000) {
        res.status(400).json({
          success: false,
          error: "Reply content must be between 10 and 2,000 characters",
        });
        return;
      }

      // Check if post exists
      const post = await DiscussionPost.findByPk(postId);
      if (!post || post.is_deleted) {
        res.status(404).json({
          success: false,
          error: "Post not found",
        });
        return;
      }

      // If replying to a reply, check if it exists and get depth
      let depth = 0;
      if (parent_reply_id) {
        const parentReply = await DiscussionReply.findByPk(parent_reply_id);
        if (!parentReply || parentReply.is_deleted) {
          res.status(404).json({
            success: false,
            error: "Parent reply not found",
          });
          return;
        }
        depth = parentReply.depth + 1;

        // Limit nesting depth
        if (depth > 3) {
          res.status(400).json({
            success: false,
            error: "Reply nesting depth limit exceeded",
          });
          return;
        }
      }

      // Create the reply
      const reply = await DiscussionReply.create(
        {
          content,
          post_id: postId,
          author_id: req.user.id,
          parent_reply_id: parent_reply_id || undefined,
          depth,
        },
        { transaction }
      );

      // Update post replies count
      await post.increment("replies_count", { transaction });

      await transaction.commit();

      // Fetch the created reply with author info for broadcasting
      const createdReply = await DiscussionReply.findByPk(reply.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "firstname", "lastname"],
          },
        ],
      });

      // Emit WebSocket event for real-time updates
      try {
        const webSocketService = getWebSocketService();
        const replyData = createdReply as any; // Type assertion for associations
        webSocketService.broadcastReplyCreate({
          id: reply.id,
          content: reply.content,
          postId,
          parentReplyId: parent_reply_id,
          author: {
            id: replyData.author.id,
            firstname: replyData.author.firstname,
            lastname: replyData.author.lastname,
          },
          upvotes: 0,
          downvotes: 0,
          depth,
          created_at: reply.created_at.toISOString(),
        });

        // Send notification to post author
        await notificationService.notifyReplyCreated(reply.id, req.user.id);
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Continue execution - WebSocket errors shouldn't break the API
      }

      res.status(201).json({
        success: true,
        data: {
          id: reply.id,
          message: "Reply created successfully",
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating reply:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create reply",
      });
    }
  }

  /**
   * Report content (post or reply)
   * POST /api/discussions/reports
   */
  async reportContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { content_type, content_id, reason, details }: ReportRequest =
        req.body;

      // Validation
      if (!["post", "reply"].includes(content_type)) {
        res.status(400).json({
          success: false,
          error: "Invalid content type",
        });
        return;
      }

      const validReasons = [
        "inappropriate",
        "spam",
        "fraudulent",
        "misinformation",
        "technical",
        "other",
      ];
      if (!validReasons.includes(reason)) {
        res.status(400).json({
          success: false,
          error: "Invalid report reason",
        });
        return;
      }

      // Check if content exists
      if (content_type === "post") {
        const post = await DiscussionPost.findByPk(content_id);
        if (!post || post.is_deleted) {
          res.status(404).json({
            success: false,
            error: "Post not found",
          });
          return;
        }
      } else {
        const reply = await DiscussionReply.findByPk(content_id);
        if (!reply || reply.is_deleted) {
          res.status(404).json({
            success: false,
            error: "Reply not found",
          });
          return;
        }
      }

      // Check for existing report from this user
      const existingReport = await ContentReport.findOne({
        where: {
          content_id,
          content_type,
          reporter_id: req.user.id,
        },
      });

      if (existingReport) {
        res.status(400).json({
          success: false,
          error: "You have already reported this content",
        });
        return;
      }

      // Create the report
      await ContentReport.create({
        content_id,
        content_type,
        reporter_id: req.user.id,
        reason,
        details: details || undefined,
      });

      res.status(201).json({
        success: true,
        data: {
          message:
            "Content reported successfully. Thank you for helping keep our community safe.",
        },
      });
    } catch (error) {
      console.error("Error reporting content:", error);
      res.status(500).json({
        success: false,
        error: "Failed to report content",
      });
    }
  }

  // Helper methods
  private getUserLevel(postCount: number): number {
    if (postCount >= 50) return 3; // Expert
    if (postCount >= 10) return 2; // Knight
    return 1; // Amateur
  }

  private getUserPoints(profile: any): number {
    if (!profile) return 0;
    return profile.posts_count * 2 + profile.upvotes_received * 1;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  }
}

export default new DiscussionController();
