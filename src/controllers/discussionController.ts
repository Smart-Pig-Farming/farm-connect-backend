import { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import sequelize from "../config/database";
import { getWebSocketService } from "../services/webSocketService";
import notificationService from "../services/notificationService";

// Import models
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import PostMedia from "../models/PostMedia";
import Tag from "../models/Tag";
import UserVote from "../models/UserVote";
import ContentReport from "../models/ContentReport";
import User from "../models/User";
import { StorageFactory } from "../services/storage/StorageFactory";
import { MediaStorageService } from "../services/storage/MediaStorageInterface";
import permissionService from "../services/permissionService";

// Module-level singleton for storage to avoid losing `this` binding in Express handlers
let __storageInstance: MediaStorageService | undefined;
function getStorageInstance(): MediaStorageService {
  if (!__storageInstance) {
    __storageInstance = StorageFactory.createStorageService();
  }
  return __storageInstance;
}

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
   * Get posts with pagination, search, and filtering (supports cursor-based infinite scroll)
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
        cursor, // New: for infinite scroll
        include_unapproved,
      } = req.query;

      const limitNum = Number(limit);
      const pageNum = Number(page);
      // Use cursor-based pagination if cursor parameter is present (even if empty)
      const useCursor = req.query.hasOwnProperty("cursor");

      // Build where conditions
      const whereConditions: any = {
        is_deleted: false,
      };

      // Add cursor-based pagination for infinite scroll
      if (cursor && typeof cursor === "string" && cursor.trim() !== "") {
        whereConditions.created_at = {
          [Op.lt]: new Date(cursor),
        };
      }

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

      // No approval filter: show all posts (approved and pending) in the feed by default

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
            "district",
            "points",
            "is_verified",
          ],
          required: false,
        },
        {
          model: PostMedia,
          as: "media",
          // Include url and thumbnail_url fields for Cloudinary integration
          attributes: [
            "id",
            "media_type",
            "storage_key",
            "file_name",
            "display_order",
            "url",
            "thumbnail_url",
          ],
          required: false,
          // Load child rows in a separate query to avoid duplicating the parent rows
          separate: true,
        },
        // Include Tag model via many-to-many association
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name", "color"],
          // If a specific tag is requested, make the join required and filter by name
          required: !!(tag && tag !== "All"),
          ...(tag && tag !== "All" ? { where: { name: tag } } : {}),
          through: { attributes: [] },
        },
      ];

      // Add user vote information if user is authenticated
      if (req.user) {
        include.push({
          model: UserVote,
          as: "votes",
          where: {
            user_id: req.user.id,
          },
          required: false,
          attributes: ["vote_type"],
          // Load child rows in a separate query to avoid affecting pagination
          separate: true,
        });
      }

      // Tag filtering is handled within the Tag include (required + where) above

      // Determine pagination strategy and fetch data
      const offset = useCursor ? 0 : (pageNum - 1) * limitNum;
      const actualLimit = useCursor ? limitNum + 1 : limitNum; // Fetch one extra for cursor pagination

      // Build a copy of base filters for counts (facets). We want counts that
      // reflect the current filters (search, market, user) but ignore:
      // 1) the selected tag (so chips show potential counts for each tag), and
      // 2) the cursor (so counts remain stable across pages).
      const countWhere: any = { ...whereConditions };
      if (countWhere["$tags.name$"]) delete countWhere["$tags.name$"]; // ignore selected tag
      if (countWhere.created_at) delete countWhere.created_at; // ignore cursor window

      // Fetch posts and counts in parallel for efficiency
      const [postsAndCount, tagCountsRaw, totalAll] = await Promise.all([
        DiscussionPost.findAndCountAll({
          where: whereConditions,
          include,
          order,
          limit: actualLimit,
          offset,
          distinct: true,
        }),
        // Grouped counts per tag (including tags with zero via left join)
        Tag.findAll({
          attributes: [
            "id",
            "name",
            "color",
            [
              sequelize.fn(
                "COUNT",
                sequelize.fn("DISTINCT", sequelize.col("posts.id"))
              ),
              "postCount",
            ],
          ],
          include: [
            {
              model: DiscussionPost,
              as: "posts",
              attributes: [],
              through: { attributes: [] },
              required: false, // include tags with zero posts under current filters
              where: countWhere,
            },
          ],
          group: ["Tag.id"],
          order: [["name", "ASC"]],
        }),
        // Overall total across current filters (distinct posts), ignoring cursor and tag
        DiscussionPost.count({ where: countWhere, distinct: true, col: "id" }),
      ]);

      // Debug logs to validate query and results (safe for dev)
      console.log("[discussions:getPosts] params", {
        limitNum,
        pageNum,
        useCursor,
        tag,
        is_market_post,
        user_id,
        cursor,
      });

      const { rows: posts, count: total } = postsAndCount;
      console.log(
        "[discussions:getPosts] rows",
        Array.isArray(posts) ? posts.length : 0,
        Array.isArray(posts) ? posts.map((p: any) => p.id) : []
      );

      // Handle cursor-based pagination results
      let finalPosts = posts;
      let hasNextPage = false;
      let nextCursor = null;

      if (useCursor && posts.length > limitNum) {
        finalPosts = posts.slice(0, limitNum);
        hasNextPage = true;
        const _last: any = finalPosts[finalPosts.length - 1];
        const _lastDate: any = _last?.createdAt || _last?.created_at;
        nextCursor = _lastDate ? new Date(_lastDate).toISOString() : null;
      } else if (useCursor) {
        hasNextPage = false;
      }

      // Transform data to match frontend expectations
      const transformedPosts = finalPosts.map((post: any) => {
        const mediaItems = (post.media || []).map((m: any) => {
          const storageKey = m.storage_key;
          const absoluteUrl =
            m.url || `/api/discussions/media/${encodeURIComponent(storageKey)}`;
          const thumbUrl =
            m.thumbnail_url ||
            `/api/discussions/media/${encodeURIComponent(
              storageKey
            )}/thumbnail`;
          return {
            id: m.id,
            media_type: m.media_type,
            url: absoluteUrl,
            thumbnail_url: thumbUrl,
            original_filename: m.file_name,
            file_size: Number(m.file_size || 0),
            display_order: m.display_order || 0,
          };
        });

        const images = mediaItems.filter((m: any) => m.media_type === "image");
        const video =
          mediaItems.find((m: any) => m.media_type === "video") || null;

        const createdAtRaw: any =
          (post as any).createdAt || (post as any).created_at;
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            id: post.author?.id ?? 0,
            firstname: post.author?.firstname ?? "",
            lastname: post.author?.lastname ?? "",
            avatar: null,
            level_id: 1,
            points: (post.author?.points as number) || 0,
            location: (post.author as any)?.district || "",
          },
          tags:
            post.tags?.map((t: any) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            })) || [],
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          userVote: post.votes?.[0]?.vote_type || null,
          replies: post.replies_count ?? 0,
          shares: 0,
          isMarketPost: post.is_market_post,
          isAvailable: post.is_available,
          createdAt: DiscussionController.formatTimeAgo(createdAtRaw),
          media: mediaItems,
          images,
          video,
          isModeratorApproved: post.is_approved,
        };
      });

      // Build response with appropriate pagination metadata
      const responseData: any = {
        posts: transformedPosts,
      };

      if (useCursor) {
        // Cursor-based pagination for infinite scroll
        responseData.pagination = {
          hasNextPage,
          nextCursor,
          count: transformedPosts.length,
        };
      } else {
        // Traditional offset-based pagination
        responseData.pagination = {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: pageNum * limitNum < total,
        };
      }

      // Attach facets for header chips: total (All) and per-tag counts
      const tagCounts = (tagCountsRaw as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: Number(t.get ? t.get("postCount") : t.postCount) || 0,
      }));

      responseData.facets = {
        totals: { all: totalAll as number },
        tags: tagCounts,
      };

      res.json({
        success: true,
        data: responseData,
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
   * Get posts created by the authenticated user with pagination and filtering
   * GET /api/discussions/my-posts
   */
  async getMyPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const {
        page = 1,
        limit = 10,
        search = "",
        tag = "",
        sort = "recent",
        is_market_post,
        cursor, // For infinite scroll
        include_unapproved = true, // Default to true for user's own posts
      } = req.query;

      const limitNum = Number(limit);
      const pageNum = Number(page);
      // Use cursor-based pagination if cursor parameter is present (even if empty)
      const useCursor = req.query.hasOwnProperty("cursor");

      // Build where conditions - always filter by authenticated user
      const whereConditions: any = {
        is_deleted: false,
        author_id: req.user.id, // Filter by authenticated user
      };

      // Add cursor-based pagination for infinite scroll
      if (cursor && typeof cursor === "string" && cursor.trim() !== "") {
        whereConditions.created_at = {
          [Op.lt]: new Date(cursor),
        };
      }

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

      // For user's own posts, include unapproved by default unless explicitly excluded
      if (include_unapproved === "false") {
        whereConditions.is_approved = true;
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

      // Build include array (same as getPosts)
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
            "district",
            "points",
            "is_verified",
          ],
          required: false,
        },
        {
          model: PostMedia,
          as: "media",
          attributes: [
            "id",
            "media_type",
            "storage_key",
            "file_name",
            "display_order",
            "url",
            "thumbnail_url",
          ],
          required: false,
          separate: true,
        },
        {
          model: Tag,
          as: "tags",
          attributes: ["id", "name", "color"],
          required: !!(tag && tag !== "All"),
          ...(tag && tag !== "All" ? { where: { name: tag } } : {}),
          through: { attributes: [] },
        },
      ];

      // Add user vote information
      include.push({
        model: UserVote,
        as: "votes",
        where: {
          user_id: req.user.id,
        },
        required: false,
        attributes: ["vote_type"],
        separate: true,
      });

      // Determine pagination strategy
      const offset = useCursor ? 0 : (pageNum - 1) * limitNum;
      const actualLimit = useCursor ? limitNum + 1 : limitNum;

      // Build count filters (for facets) - exclude tag and cursor filters
      const countWhere: any = {
        is_deleted: false,
        author_id: req.user.id,
      };
      if (search) {
        countWhere[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (is_market_post !== undefined) {
        countWhere.is_market_post = is_market_post === "true";
      }
      if (include_unapproved === "false") {
        countWhere.is_approved = true;
      }

      // Fetch posts and counts in parallel
      const [postsAndCount, tagCountsRaw, totalAll] = await Promise.all([
        DiscussionPost.findAndCountAll({
          where: whereConditions,
          include,
          order,
          limit: actualLimit,
          offset,
          distinct: true,
        }),
        // Tag counts for user's posts
        Tag.findAll({
          attributes: [
            "id",
            "name",
            "color",
            [
              sequelize.fn(
                "COUNT",
                sequelize.fn("DISTINCT", sequelize.col("posts.id"))
              ),
              "postCount",
            ],
          ],
          include: [
            {
              model: DiscussionPost,
              as: "posts",
              attributes: [],
              through: { attributes: [] },
              required: false,
              where: countWhere,
            },
          ],
          group: ["Tag.id"],
          order: [["name", "ASC"]],
        }),
        // Total count of user's posts
        DiscussionPost.count({ where: countWhere, distinct: true, col: "id" }),
      ]);

      const { rows: posts, count: total } = postsAndCount;

      // Handle cursor-based pagination results
      let finalPosts = posts;
      let hasNextPage = false;
      let nextCursor = null;

      if (useCursor && posts.length > limitNum) {
        finalPosts = posts.slice(0, limitNum);
        hasNextPage = true;
        const _last: any = finalPosts[finalPosts.length - 1];
        const _lastDate: any = _last?.createdAt || _last?.created_at;
        nextCursor = _lastDate ? new Date(_lastDate).toISOString() : null;
      } else if (useCursor) {
        hasNextPage = false;
      }

      // Transform data (same as getPosts)
      const transformedPosts = finalPosts.map((post: any) => {
        const mediaItems = (post.media || []).map((m: any) => {
          const storageKey = m.storage_key;
          const absoluteUrl =
            m.url || `/api/discussions/media/${encodeURIComponent(storageKey)}`;
          const thumbUrl =
            m.thumbnail_url ||
            `/api/discussions/media/${encodeURIComponent(
              storageKey
            )}/thumbnail`;
          return {
            id: m.id,
            media_type: m.media_type,
            url: absoluteUrl,
            thumbnail_url: thumbUrl,
            original_filename: m.file_name,
            file_size: Number(m.file_size || 0),
            display_order: m.display_order || 0,
          };
        });

        const images = mediaItems.filter((m: any) => m.media_type === "image");
        const video =
          mediaItems.find((m: any) => m.media_type === "video") || null;

        const createdAtRaw: any =
          (post as any).createdAt || (post as any).created_at;
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            id: post.author?.id ?? 0,
            firstname: post.author?.firstname ?? "",
            lastname: post.author?.lastname ?? "",
            avatar: null,
            level_id: 1,
            points: (post.author?.points as number) || 0,
            location: (post.author as any)?.district || "",
          },
          tags:
            post.tags?.map((t: any) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            })) || [],
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          userVote: post.votes?.[0]?.vote_type || null,
          replies: post.replies_count ?? 0,
          shares: 0,
          isMarketPost: post.is_market_post,
          isAvailable: post.is_available,
          createdAt: DiscussionController.formatTimeAgo(createdAtRaw),
          media: mediaItems,
          images,
          video,
          isModeratorApproved: post.is_approved,
        };
      });

      // Build response with appropriate pagination metadata
      const responseData: any = {
        posts: transformedPosts,
      };

      if (useCursor) {
        responseData.pagination = {
          hasNextPage,
          nextCursor,
          count: transformedPosts.length,
        };
      } else {
        responseData.pagination = {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: pageNum * limitNum < total,
        };
      }

      // Build facets for user's posts
      const tagCounts = (tagCountsRaw as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: Number(t.get ? t.get("postCount") : t.postCount) || 0,
      }));

      responseData.facets = {
        totals: { all: totalAll as number },
        tags: tagCounts,
      };

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user posts",
      });
    }
  }

  /**
   * Get authenticated user's posts statistics (total posts, posts created today)
   * GET /api/discussions/my-posts/stats
   */
  async getMyPostsStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Count user's posts (both approved and pending) for totals and today's posts
      const whereConditions = {
        is_deleted: false,
        author_id: req.user.id,
      };

      const [
        totalMyPosts,
        myPostsToday,
        approvedPosts,
        pendingPosts,
        marketPosts,
      ] = await Promise.all([
        DiscussionPost.count({ where: whereConditions }),
        DiscussionPost.count({
          where: { ...whereConditions, created_at: { [Op.gte]: startOfToday } },
        }),
        DiscussionPost.count({
          where: { ...whereConditions, is_approved: true },
        }),
        DiscussionPost.count({
          where: { ...whereConditions, is_approved: false },
        }),
        DiscussionPost.count({
          where: { ...whereConditions, is_market_post: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalMyPosts,
          myPostsToday,
          approvedPosts,
          pendingPosts,
          marketPosts,
          regularPosts: totalMyPosts - marketPosts,
        },
      });
    } catch (error) {
      console.error("Error fetching user posts stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user posts stats",
      });
    }
  }

  /**
   * Get basic posts statistics (total approved posts, posts created today)
   * GET /api/discussions/posts/stats
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Count all posts (approved and pending) for totals and today's posts
      const [totalDiscussions, postsToday] = await Promise.all([
        DiscussionPost.count({ where: { is_deleted: false } }),
        DiscussionPost.count({
          where: { is_deleted: false, created_at: { [Op.gte]: startOfToday } },
        }),
      ]);

      res.json({
        success: true,
        data: { totalDiscussions, postsToday },
      });
    } catch (error) {
      console.error("Error fetching posts stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
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
        // First find or create the tags
        const tagInstances = await Promise.all(
          tags.map(async (tagName: string) => {
            const [tag] = await Tag.findOrCreate({
              where: { name: tagName.trim() },
              defaults: {
                name: tagName.trim(),
                color: "#blue", // Default color
              },
              transaction,
            });
            return tag;
          })
        );

        // Then create the post-tag associations via Sequelize helper
        // Note: requires a DiscussionPost ↔ Tag belongsToMany association with as: "tags"
        if ((post as any).addTags) {
          await (post as any).addTags(tagInstances, { transaction });
        }
      }

      // Handle media uploads: prefer uploaded files via multer; fallback to body media_files for legacy usage
      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (files.length > 0) {
        // Business rules: either multiple images OR a single video
        const hasVideo = files.some((f) => f.mimetype.startsWith("video/"));
        const hasImage = files.some((f) => f.mimetype.startsWith("image/"));
        if (hasVideo && hasImage) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: "Cannot upload images and video in the same post",
          });
          return;
        }
        if (hasVideo && files.length > 1) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: "Only one video file is allowed",
          });
          return;
        }

        const storage = getStorageInstance();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const mediaType = f.mimetype.startsWith("video/")
            ? "video"
            : ("image" as const);
          const result = await storage.upload(f.buffer, {
            postId: post.id,
            mediaType,
            fileName: f.originalname,
            mimeType: f.mimetype,
            fileSize: f.size,
          });

          await PostMedia.create(
            {
              post_id: post.id,
              media_type: mediaType,
              storage_key: result.storageKey,
              url: result.url,
              thumbnail_url: result.thumbnailUrl,
              file_name: f.originalname,
              file_size: f.size,
              mime_type: f.mimetype,
              display_order: i,
              status: "ready",
            },
            { transaction }
          );
        }
      } else if (media_files.length > 0) {
        // Legacy: accept media descriptors in body (no real upload)
        const mediaPromises = media_files.map((media, index) =>
          PostMedia.create(
            {
              post_id: post.id,
              media_type: media.media_type,
              storage_key: `media-${index}-${Date.now()}`,
              file_name: media.thumbnail_url || `media-${index}`,
              file_size: 0,
              mime_type:
                media.media_type === "image" ? "image/jpeg" : "video/mp4",
              display_order: index,
              status: "ready",
            },
            { transaction }
          )
        );
        await Promise.all(mediaPromises);
      }

      await transaction.commit();

      // Fetch the created post with author + media + tags for broadcasting
      const createdPost = await DiscussionPost.findByPk(post.id, {
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
          tags: postData.tags.map((tag: any) => tag.name),
          is_market_post: post.is_market_post,
          is_available: post.is_available,
          is_approved: post.is_approved,
          upvotes: 0,
          downvotes: 0,
          replies_count: 0,
          media: (postData.media || []).map((m: any) => ({
            id: m.id,
            media_type: m.media_type,
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            display_order: m.display_order,
          })),
          created_at: (post as any).createdAt.toISOString(),
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
          target_type: "post",
          target_id: postId,
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
            target_type: "post",
            target_id: postId,
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
   * Update a post (owner-only)
   * PATCH /api/discussions/posts/:id
   */
  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: postId } = req.params as any;
      const post = await DiscussionPost.findByPk(postId);
      if (!post || post.is_deleted) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }

      // Owner-only update
      if (post.author_id !== req.user.id) {
        res.status(403).json({ success: false, error: "Permission denied" });
        return;
      }

      const {
        title,
        content,
        tags,
        is_market_post,
        is_available,
        removedImages = [],
        removedVideo = false,
      } = req.body as any;

      // Apply field-level validations for provided fields (route also validates)
      if (typeof title !== "undefined") {
        if (!title || title.length < 10 || title.length > 255) {
          res.status(400).json({
            success: false,
            error: "Title must be between 10 and 255 characters",
          });
          return;
        }
        post.title = title;
      }

      if (typeof content !== "undefined") {
        if (!content || content.length < 20 || content.length > 10000) {
          res.status(400).json({
            success: false,
            error: "Content must be between 20 and 10,000 characters",
          });
          return;
        }
        post.content = content;
      }

      // Market post toggle and availability rules
      if (typeof is_market_post !== "undefined") {
        if (typeof is_market_post !== "boolean") {
          res
            .status(400)
            .json({
              success: false,
              error: "is_market_post must be a boolean",
            });
          return;
        }
        post.is_market_post = is_market_post;
        // If switching to non-market, force available to true (non-market posts are always available)
        if (!is_market_post) {
          post.is_available = true;
        }
      }

      // Only allow is_available toggle when it's a market post
      if (typeof is_available !== "undefined") {
        if (typeof is_available !== "boolean") {
          res
            .status(400)
            .json({ success: false, error: "is_available must be a boolean" });
          return;
        }
        if (post.is_market_post) {
          post.is_available = is_available;
        }
      }

      await post.save({ transaction });

      // Media update handling (optional): enforce XOR between images and video
      const files = (req.files as Express.Multer.File[] | undefined) || [];
      const hasUploads = files.length > 0;
      // Track deletions to perform and storage keys for after-commit cleanup
      const storageKeysToDelete: string[] = [];
      if (
        hasUploads ||
        (Array.isArray(removedImages) && removedImages.length > 0) ||
        removedVideo
      ) {
        // Fetch existing media to compute constraints
        const existingMedia = await PostMedia.findAll({
          where: { post_id: post.id },
          transaction,
        });
        let existingImages = existingMedia.filter(
          (m) => m.media_type === "image"
        );
        let existingVideos = existingMedia.filter(
          (m) => m.media_type === "video"
        );

        // Apply removals first (DB rows inside transaction; physical delete after commit)
        if (Array.isArray(removedImages) && removedImages.length > 0) {
          const toRemove = existingImages.filter((m) =>
            removedImages.includes(m.url || "")
          );
          for (const m of toRemove) {
            if (m.storage_key) storageKeysToDelete.push(m.storage_key);
            await PostMedia.destroy({ where: { id: m.id }, transaction });
          }
          existingImages = existingImages.filter(
            (m) => !removedImages.includes(m.url || "")
          );
        }
        if (removedVideo && existingVideos.length > 0) {
          for (const m of existingVideos) {
            if (m.storage_key) storageKeysToDelete.push(m.storage_key);
            await PostMedia.destroy({ where: { id: m.id }, transaction });
          }
          existingVideos = [];
        }

        // Compute media after deletions from adjusted arrays
        const imagesAfter = existingImages;
        const videosAfter = existingVideos;

        // Enforce XOR with uploaded files
        if (files.length > 0) {
          const uploadsContainVideo = files.some((f) =>
            f.mimetype.startsWith("video/")
          );
          const uploadsContainImage = files.some((f) =>
            f.mimetype.startsWith("image/")
          );
          if (uploadsContainVideo && uploadsContainImage) {
            await transaction.rollback();
            res.status(400).json({
              success: false,
              error: "Cannot upload images and video in the same request",
            });
            return;
          }
          if (uploadsContainVideo) {
            // Cannot have any images existing if uploading a video
            if (imagesAfter.length > 0) {
              await transaction.rollback();
              res.status(400).json({
                success: false,
                error: "Post cannot contain both images and a video",
              });
              return;
            }
            if (files.length > 1) {
              await transaction.rollback();
              res.status(400).json({
                success: false,
                error: "Only one video file is allowed",
              });
              return;
            }
          } else if (uploadsContainImage) {
            // Cannot have any video existing if uploading images
            if (videosAfter.length > 0) {
              await transaction.rollback();
              res.status(400).json({
                success: false,
                error: "Post cannot contain both images and a video",
              });
              return;
            }
            // Max 4 images in total
            const totalImages = imagesAfter.length + files.length;
            if (totalImages > 4) {
              await transaction.rollback();
              res.status(400).json({
                success: false,
                error: "Maximum 4 images allowed per post",
              });
              return;
            }
          }

          // Perform uploads
          const storage = getStorageInstance();
          const startIndex = imagesAfter.length; // maintain order after existing
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const mediaType = f.mimetype.startsWith("video/")
              ? "video"
              : ("image" as const);
            const result = await storage.upload(f.buffer, {
              postId: post.id,
              mediaType,
              fileName: f.originalname,
              mimeType: f.mimetype,
              fileSize: f.size,
            });

            await PostMedia.create(
              {
                post_id: post.id,
                media_type: mediaType,
                storage_key: result.storageKey,
                url: result.url,
                thumbnail_url: result.thumbnailUrl,
                file_name: f.originalname,
                file_size: f.size,
                mime_type: f.mimetype,
                display_order: mediaType === "image" ? startIndex + i : 0,
                status: "ready",
              },
              { transaction }
            );
          }
        }
      }

      // Handle tags if provided
      if (typeof tags !== "undefined") {
        if (!Array.isArray(tags) || tags.length > 3) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            error: "tags must be an array with up to 3 items",
          });
          return;
        }
        const tagInstances = await Promise.all(
          tags.map(async (tagName: string) => {
            const name = String(tagName || "").trim();
            if (!name) return null as any;
            const [tag] = await Tag.findOrCreate({
              where: { name },
              defaults: { name, color: "#blue" },
              transaction,
            });
            return tag;
          })
        );
        const finalTags = tagInstances.filter(Boolean);
        if ((post as any).setTags) {
          await (post as any).setTags(finalTags, { transaction });
        }
      }

      await transaction.commit();

      // Reload the post with associations for response and broadcasting
      const updatedPost = await DiscussionPost.findByPk(post.id, {
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

      // Broadcast update
      try {
        const ws = getWebSocketService();
        const p: any = updatedPost as any;
        ws.broadcastPostUpdate({
          id: p.id,
          title: p.title,
          content: p.content,
          tags: (p.tags || []).map((t: any) => t.name),
          is_market_post: p.is_market_post,
          is_available: p.is_available,
          is_approved: p.is_approved,
          media: (p.media || []).map((m: any) => ({
            id: m.id,
            media_type: m.media_type,
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            display_order: m.display_order,
          })),
          updated_at:
            (p as any).updatedAt?.toISOString?.() || new Date().toISOString(),
        });
      } catch (wsError) {
        console.error("WebSocket broadcast error (post:update):", wsError);
      }

      // Best-effort storage deletion after commit
      if (storageKeysToDelete.length > 0) {
        const storage = getStorageInstance();
        for (const key of storageKeysToDelete) {
          try {
            await storage.delete(key);
          } catch (e) {
            console.warn("Deferred storage delete failed for", key, e);
          }
        }
      }

      res.json({ success: true, data: { id: post.id } });
    } catch (error) {
      // Only rollback if not already finished
      try {
        // @ts-ignore - finished is internal but available in Sequelize
        if (!transaction.finished) {
          await transaction.rollback();
        }
      } catch (rollbackError) {
        console.warn("Rollback skipped/failed:", rollbackError);
      }
      console.error("Error updating post:", error);
      res.status(500).json({ success: false, error: "Failed to update post" });
    }
  }

  /**
   * Soft delete a post (author or users with moderation/manage privileges)
   * DELETE /api/discussions/posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: postId } = req.params as any;
      const post = await DiscussionPost.findByPk(postId);
      if (!post || post.is_deleted) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }

      // Authorization: author can delete; otherwise require elevated permissions
      const isAuthor = post.author_id === req.user.id;
      let hasElevated = false;
      if (!isAuthor) {
        const permsToCheck = ["MANAGE:POSTS", "MODERATE:POSTS", "DELETE:POSTS"];
        const result = await permissionService.hasAnyPermission(
          req.user.id,
          permsToCheck
        );
        hasElevated = result.hasPermission;
      }

      if (!isAuthor && !hasElevated) {
        res.status(403).json({ success: false, error: "Permission denied" });
        return;
      }

      post.is_deleted = true;
      await post.save();

      // Broadcast deletion to clients
      try {
        const ws = getWebSocketService();
        ws.broadcastPostDelete(post.id);
      } catch (e) {
        console.error("WebSocket broadcast delete error:", e);
      }

      res.json({ success: true, data: { id: post.id, deleted: true } });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ success: false, error: "Failed to delete post" });
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

      // Base include for author and one level of children
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
            // Nested user vote for level 1 children
            ...(req.user
              ? [
                  {
                    model: UserVote,
                    as: "votes",
                    where: { user_id: req.user.id },
                    required: false,
                    attributes: ["vote_type"],
                    separate: false,
                  },
                ]
              : []),
            // Grandchildren level (depth 2)
            {
              model: DiscussionReply,
              as: "childReplies",
              include: [
                {
                  model: User,
                  as: "author",
                  attributes: ["id", "firstname", "lastname"],
                  required: false,
                },
                // Nested user vote for level 2 children
                ...(req.user
                  ? [
                      {
                        model: UserVote,
                        as: "votes",
                        where: { user_id: req.user.id },
                        required: false,
                        attributes: ["vote_type"],
                        separate: false,
                      },
                    ]
                  : []),
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
          where: { user_id: req.user.id },
          required: false,
          attributes: ["vote_type"],
          separate: false,
        });
      }

      const replies = await DiscussionReply.findAll({
        where: {
          post_id: postId,
          parent_reply_id: { [Op.is]: null }, // Only top-level replies
          is_deleted: false,
        },
        include,
        order: [["created_at", "DESC"]],
        limit: Number(limit),
        offset,
      });

      // Total count for pagination (top-level only)
      const total = await DiscussionReply.count({
        where: {
          post_id: postId,
          parent_reply_id: { [Op.is]: null },
          is_deleted: false,
        },
      });

      // Helper to map nested replies recursively up to depth 3
      const mapReply = (r: any): any => ({
        id: r.id,
        content: r.content,
        author: {
          id: r.author?.id,
          firstname: r.author?.firstname,
          lastname: r.author?.lastname,
          avatar: null,
          level_id: 1,
        },
        createdAt: DiscussionController.formatTimeAgo((r as any).createdAt),
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        userVote: r.votes?.[0]?.vote_type || null,
        childReplies: Array.isArray(r.childReplies)
          ? r.childReplies.map((c: any) => ({
              id: c.id,
              content: c.content,
              author: {
                id: c.author?.id,
                firstname: c.author?.firstname,
                lastname: c.author?.lastname,
                avatar: null,
                level_id: 1,
              },
              createdAt: DiscussionController.formatTimeAgo(
                (c as any).createdAt
              ),
              upvotes: c.upvotes,
              downvotes: c.downvotes,
              userVote: c.votes?.[0]?.vote_type || null,
              childReplies: Array.isArray(c.childReplies)
                ? c.childReplies.map((gc: any) => ({
                    id: gc.id,
                    content: gc.content,
                    author: {
                      id: gc.author?.id,
                      firstname: gc.author?.firstname,
                      lastname: gc.author?.lastname,
                      avatar: null,
                      level_id: 1,
                    },
                    createdAt: DiscussionController.formatTimeAgo(
                      (gc as any).createdAt
                    ),
                    upvotes: gc.upvotes,
                    downvotes: gc.downvotes,
                    userVote: gc.votes?.[0]?.vote_type || null,
                    childReplies: [],
                  }))
                : [],
            }))
          : [],
      });

      const transformedReplies = replies.map(mapReply);

      res.json({
        success: true,
        data: {
          replies: transformedReplies,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
            hasNextPage: offset + Number(limit) < total,
          },
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
   * Vote on a reply
   * POST /api/discussions/replies/:id/vote
   */
  async voteReply(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();

    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: replyId } = req.params as any;
      const { vote_type }: VoteRequest = req.body as any;

      if (!["upvote", "downvote"].includes(vote_type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid vote type. Must be "upvote" or "downvote"',
        });
        return;
      }

      // Load reply and its post id for room broadcast
      const reply = await DiscussionReply.findByPk(replyId, {
        include: [
          {
            model: DiscussionPost,
            as: "post",
            attributes: ["id"],
          },
        ],
      });

      if (!reply || reply.is_deleted) {
        res.status(404).json({ success: false, error: "Reply not found" });
        return;
      }

      const postId = (reply as any).post?.id as string;

      const existingVote = await UserVote.findOne({
        where: {
          user_id: req.user.id,
          target_type: "reply",
          target_id: replyId,
        },
      });

      let voteChange = { upvotes: 0, downvotes: 0 } as any;
      let finalUserVote: "upvote" | "downvote" | null = vote_type;

      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // Toggle off
          await existingVote.destroy({ transaction });
          voteChange[
            existingVote.vote_type === "upvote" ? "upvotes" : "downvotes"
          ] = -1;
          finalUserVote = null;
        } else {
          const oldType = existingVote.vote_type;
          existingVote.vote_type = vote_type;
          await existingVote.save({ transaction });
          voteChange[oldType === "upvote" ? "upvotes" : "downvotes"] = -1;
          voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
        }
      } else {
        await UserVote.create(
          {
            user_id: req.user.id,
            target_type: "reply",
            target_id: replyId,
            vote_type,
          },
          { transaction }
        );
        voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
      }

      await reply.increment(voteChange, { transaction });
      await transaction.commit();

      // Reload counts
      const updated = await DiscussionReply.findByPk(replyId, {
        attributes: ["upvotes", "downvotes", "post_id"],
      });

      try {
        const ws = getWebSocketService();
        ws.broadcastReplyVote({
          replyId,
          postId: postId || (updated as any)?.post_id,
          userId: req.user.id,
          voteType: finalUserVote,
          upvotes: updated?.upvotes || 0,
          downvotes: updated?.downvotes || 0,
        });

        if (finalUserVote) {
          await notificationService.notifyReplyVote(
            replyId,
            req.user.id,
            finalUserVote
          );
        }
      } catch (e) {
        console.error("WebSocket/notification error (reply:vote):", e);
      }

      res.json({
        success: true,
        data: {
          upvotes: updated?.upvotes || 0,
          downvotes: updated?.downvotes || 0,
          userVote: finalUserVote,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error voting on reply:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to vote on reply" });
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

      // Validation (relaxed): require at least one non-whitespace character
      const trimmedContent = (content || "").trim();
      if (!trimmedContent) {
        res.status(400).json({
          success: false,
          error: "Reply content is required",
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
          content: trimmedContent,
          post_id: postId,
          author_id: req.user.id,
          parent_reply_id: parent_reply_id || undefined,
          depth,
        },
        { transaction }
      );

      // Increment the post's replies_count
      await DiscussionPost.increment(
        { replies_count: 1 },
        { where: { id: postId }, transaction }
      );

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
          created_at: (reply as any).createdAt.toISOString(),
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

  private static formatTimeAgo(
    date: Date | string | number | null | undefined
  ): string {
    if (!date) return "now";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "now";
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;

    return d.toLocaleDateString();
  }
  /**
   * Upload media files for a post
   * POST /api/discussions/posts/:id/media
   */
  async uploadMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ success: false, error: "Authentication required" });
        return;
      }

      const { id: postId } = req.params as any;
      const post = await DiscussionPost.findByPk(postId);
      if (!post || post.is_deleted) {
        res.status(404).json({ success: false, error: "Post not found" });
        return;
      }

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (files.length === 0) {
        res.status(400).json({ success: false, error: "No files provided" });
        return;
      }

      // Business rules
      const hasVideo = files.some((f) => f.mimetype.startsWith("video/"));
      const hasImage = files.some((f) => f.mimetype.startsWith("image/"));
      if (hasVideo && hasImage) {
        res.status(400).json({
          success: false,
          error: "Cannot upload images and video together",
        });
        return;
      }
      if (hasVideo && files.length > 1) {
        res
          .status(400)
          .json({ success: false, error: "Only one video allowed" });
        return;
      }

      const storage = getStorageInstance();
      const created: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const mediaType = f.mimetype.startsWith("video/")
          ? "video"
          : ("image" as const);
        const result = await storage.upload(f.buffer, {
          postId: post.id,
          mediaType,
          fileName: f.originalname,
          mimeType: f.mimetype,
          fileSize: f.size,
        });
        const pm = await PostMedia.create({
          post_id: post.id,
          media_type: mediaType,
          storage_key: result.storageKey,
          url: result.url,
          thumbnail_url: result.thumbnailUrl,
          file_name: f.originalname,
          file_size: f.size,
          mime_type: f.mimetype,
          display_order: i,
          status: "ready",
        });
        created.push({
          id: pm.id,
          media_type: pm.media_type,
          storage_key: pm.storage_key,
          file_name: pm.file_name,
          file_size: Number(pm.file_size || 0),
          mime_type: pm.mime_type,
          display_order: pm.display_order || 0,
        });
      }

      res.status(201).json({ success: true, data: { media: created } });
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ success: false, error: "Failed to upload media" });
    }
  }

  /**
   * Get media file by storage key
   * GET /api/discussions/media/:storageKey
   */
  async getMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { storageKey } = req.params as any;
      const storage = getStorageInstance();
      const url = await storage.getUrl(storageKey);
      // Redirect to the actual storage URL
      res.redirect(url);
    } catch (error) {
      console.error("Error getting media:", error);
      res.status(404).json({ success: false, error: "Media not found" });
    }
  }

  /**
   * Get media thumbnail by storage key
   * GET /api/discussions/media/:storageKey/thumbnail
   */
  async getMediaThumbnail(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { storageKey } = req.params as any;
      const storage = getStorageInstance();
      const url = await storage.generateThumbnail(storageKey);
      res.redirect(url);
    } catch (error) {
      console.error("Error getting thumbnail:", error);
      res.status(404).json({ success: false, error: "Thumbnail not found" });
    }
  }

  /**
   * Get all available tags
   * GET /api/discussions/tags
   */
  async getTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tags = await Tag.findAll({
        attributes: ["id", "name", "color"],
        order: [["name", "ASC"]],
      });

      res.json({
        success: true,
        data: {
          tags: tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tags",
      });
    }
  }
}

export default new DiscussionController();
