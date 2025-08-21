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
import scoringActionService from "../services/scoring/ScoringActionService";
import UserScoreTotal from "../models/UserScoreTotal";
import { fromScaled } from "../services/scoring/ScoreTypes"; // for converting totals when returning authorPoints
import { mapPointsToLevel } from "../services/scoring/LevelService";
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
      // NOTE: We no longer include per-post user vote via an association include.
      // Instead we perform one compact batch query AFTER fetching the page of posts
      // to avoid N additional queries from `separate: true` includes and keep the
      // main result set stable for pagination (especially cursor mode).

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
      // Prepare userVote map AND aggregate full voter id arrays for highlighting
      let userVoteMap: Map<string, string> | undefined;
      let upvotersMap: Map<string, number[]> | undefined;
      let downvotersMap: Map<string, number[]> | undefined;
      if (finalPosts.length) {
        try {
          const allVotes: any[] = await UserVote.findAll({
            where: {
              target_type: "post",
              target_id: finalPosts.map((p: any) => p.id),
            } as any,
            attributes: ["target_id", "user_id", "vote_type"],
          });
          upvotersMap = new Map();
          downvotersMap = new Map();
          if (req.user) userVoteMap = new Map();
          for (const v of allVotes) {
            const pid = String(v.target_id);
            if (v.vote_type === "upvote") {
              const arr = upvotersMap.get(pid) || [];
              arr.push(v.user_id);
              upvotersMap.set(pid, arr);
            } else if (v.vote_type === "downvote") {
              const arr = downvotersMap.get(pid) || [];
              arr.push(v.user_id);
              downvotersMap.set(pid, arr);
            }
            if (req.user && v.user_id === req.user.id) {
              userVoteMap!.set(pid, v.vote_type);
            }
          }
        } catch (e) {
          console.error("[discussions:getPosts] voter aggregation failed", e);
        }
      }

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
            points: 0, // placeholder replaced later
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
          userVote: userVoteMap?.get(String(post.id)) || null,
          upvoterIds: upvotersMap?.get(String(post.id)) || [],
          downvoterIds: downvotersMap?.get(String(post.id)) || [],
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

      // Resolve author score totals in batch
      try {
        const uniqueAuthorIds = Array.from(
          new Set(
            transformedPosts.map((p: any) => p.author.id).filter((id) => !!id)
          )
        );
        if (uniqueAuthorIds.length) {
          const totals = await UserScoreTotal.findAll({
            where: { user_id: uniqueAuthorIds } as any,
          });
          const totalMap = new Map<number, number>();
          for (const t of totals as any[]) {
            totalMap.set(t.user_id, fromScaled(t.total_points));
          }
          for (const p of transformedPosts) {
            const pts = totalMap.get(p.author.id) || 0;
            p.author.points = pts;
            // Derive dynamic level id from points
            p.author.level_id = mapPointsToLevel(Math.floor(pts)).level;
          }
        }
      } catch (e) {
        console.error("[scoring] failed to hydrate author points", e);
      }

      // Build response with appropriate pagination metadata
      const responseData: any = { posts: transformedPosts };

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
      // User vote inclusion removed; will batch query after fetch.

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
      // Batch load user's votes for these posts (single query)
      let userVoteMap: Map<string, string> | undefined;
      // Maps of postId -> array of user ids for each vote type (for client highlighting)
      let upvotersMap: Map<string, number[]> | undefined;
      let downvotersMap: Map<string, number[]> | undefined;
      try {
        if (finalPosts.length) {
          // 1. Fetch just the current user's votes for quick userVote resolution
          const myVoteRows: any[] = await UserVote.findAll({
            where: {
              user_id: req.user.id,
              target_type: "post",
              target_id: finalPosts.map((p: any) => p.id),
            } as any,
            attributes: ["target_id", "vote_type"],
          });
          userVoteMap = new Map(
            myVoteRows.map((r: any) => [String(r.target_id), r.vote_type])
          );

          // 2. Fetch all voters for these posts in a single batched query
          const allVoteRows: any[] = await UserVote.findAll({
            where: {
              target_type: "post",
              target_id: finalPosts.map((p: any) => p.id),
            } as any,
            attributes: ["target_id", "user_id", "vote_type"],
          });
          upvotersMap = new Map();
          downvotersMap = new Map();
          for (const r of allVoteRows) {
            const key = String(r.target_id);
            if (r.vote_type === "upvote") {
              const arr = upvotersMap.get(key) || [];
              arr.push(r.user_id);
              upvotersMap.set(key, arr);
            } else if (r.vote_type === "downvote") {
              const arr = downvotersMap.get(key) || [];
              arr.push(r.user_id);
              downvotersMap.set(key, arr);
            }
          }
        }
      } catch (e) {
        console.error(
          "[discussions:getMyPosts] failed to batch load user votes",
          e
        );
      }

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
            points: 0, // placeholder replaced later
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
          userVote: userVoteMap?.get(String(post.id)) || null,
          // New voter id arrays (may be undefined if query failed)
          upvoterIds: upvotersMap?.get(String(post.id)) || [],
          // keep arrays always (empty if none) for simpler client logic
          downvoterIds: downvotersMap?.get(String(post.id)) || [],
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

      // Hydrate author points
      try {
        const uniqueAuthorIds = Array.from(
          new Set(
            transformedPosts.map((p: any) => p.author.id).filter((id) => !!id)
          )
        );
        if (uniqueAuthorIds.length) {
          const totals = await UserScoreTotal.findAll({
            where: { user_id: uniqueAuthorIds } as any,
          });
          const totalMap = new Map<number, number>();
          for (const t of totals as any[])
            totalMap.set(t.user_id, fromScaled(t.total_points));
          for (const p of transformedPosts) {
            const pts = totalMap.get(p.author.id) || 0;
            p.author.points = pts;
            p.author.level_id = mapPointsToLevel(Math.floor(pts)).level;
          }
        }
      } catch (e) {
        console.error(
          "[scoring] failed to hydrate author points (user posts)",
          e
        );
      }

      // Build response with appropriate pagination metadata
      const responseData: any = { posts: transformedPosts };

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
        is_available = false,
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
          is_available: is_market_post ? is_available : false,
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

      // Scoring: award post creation (now awaited so we can push points to clients immediately)
      let authorPoints: number | undefined;
      let authorLevel: number | undefined;
      let authorPointsDelta: number | undefined;
      try {
        const scoringResult: any = await scoringActionService.awardPostCreated(
          post.id,
          req.user.id
        );
        const authorTotal = scoringResult?.totals?.find(
          (t: any) => t.userId === req.user!.id
        );
        if (authorTotal) {
          authorPoints = fromScaled(authorTotal.totalPoints);
          authorLevel = mapPointsToLevel(Math.floor(authorPoints)).level;
          authorPointsDelta = 2; // POST_CREATED constant (unscaled)
        }
      } catch (e) {
        console.error("[scoring] post create failed", e);
      }

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

      // Emit WebSocket event for real-time updates including scoring snapshot
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
          author_points: authorPoints,
          author_level: authorLevel,
          author_points_delta: authorPointsDelta,
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
          authorPoints,
          authorLevel,
          authorPointsDelta,
          authorId: req.user.id,
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

      // Fetch existing vote and capture original state BEFORE mutating
      const existingVote = await UserVote.findOne({
        where: {
          user_id: req.user.id,
          target_type: "post",
          target_id: postId,
        },
      });
      const originalVoteType: "upvote" | "downvote" | null = existingVote
        ? existingVote.vote_type
        : null;

      // Capture author's points BEFORE scoring (raw points, scaled conversion after fetch)
      let authorPointsBefore: number | undefined = undefined;
      try {
        const authorIdPre = (post as any).author_id;
        if (authorIdPre) {
          const { default: UserScoreTotal } = await import(
            "../models/UserScoreTotal"
          );
          const totalRow: any = await UserScoreTotal.findByPk(authorIdPre);
          if (totalRow) {
            const { fromScaled } = await import(
              "../services/scoring/ScoreTypes"
            );
            authorPointsBefore = fromScaled(totalRow.total_points || 0);
          }
        }
      } catch (e) {
        console.warn("[votePost] unable to load author pre-vote points", e);
      }

      let finalUserVote: "upvote" | "downvote" | null = null;
      const voteChange = { upvotes: 0, downvotes: 0 };
      const isToggleOff =
        !!existingVote && existingVote.vote_type === vote_type; // same vote clicked again
      const isSwitch = !!existingVote && existingVote.vote_type !== vote_type; // different vote clicked

      if (!existingVote) {
        // New vote
        await UserVote.create(
          {
            user_id: req.user.id,
            target_type: "post",
            target_id: postId,
            vote_type,
          },
          { transaction }
        );
        finalUserVote = vote_type;
        voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
      } else if (isToggleOff) {
        // Remove vote
        await existingVote.destroy({ transaction });
        finalUserVote = null;
        voteChange[
          existingVote.vote_type === "upvote" ? "upvotes" : "downvotes"
        ] = -1;
      } else if (isSwitch) {
        // Switch vote type
        existingVote.vote_type = vote_type;
        await existingVote.save({ transaction });
        finalUserVote = vote_type;
        voteChange[originalVoteType === "upvote" ? "upvotes" : "downvotes"] =
          -1;
        voteChange[vote_type === "upvote" ? "upvotes" : "downvotes"] = 1;
      }

      await post.increment(voteChange, { transaction });
      await transaction.commit();

      // Compute scoring with correct previous/new states
      let authorPoints: number | undefined = undefined;
      let authorLevel: number | undefined = undefined;
      let authorPointsDelta: number | undefined = undefined;
      let actorPoints: number | undefined = undefined;
      let actorPointsDelta: number | undefined = undefined;
      let postVoteScoringResult: any = undefined;
      try {
        const scoringResult: any = await scoringActionService.handlePostVote({
          actorId: req.user.id,
          post,
          previousVote: originalVoteType,
          newVote: finalUserVote,
        });
        postVoteScoringResult = scoringResult;
        if (scoringResult && Array.isArray(scoringResult.totals)) {
          const authorId = (post as any).author_id;
          const authorTotal = scoringResult.totals.find(
            (t: any) => t.userId === authorId
          );
          if (authorTotal) {
            authorPoints = fromScaled(authorTotal.totalPoints);
            authorLevel = mapPointsToLevel(Math.floor(authorPoints)).level;
            if (authorPointsBefore !== undefined) {
              authorPointsDelta = authorPoints - authorPointsBefore;
            }
          }
          const actorTotal = req.user
            ? scoringResult.totals.find((t: any) => t.userId === req.user!.id)
            : undefined;
          if (actorTotal) {
            const before = undefined; // (optional: could fetch prior if needed for precision)
            actorPoints = fromScaled(actorTotal.totalPoints);
            // If engagement event triggered, delta will usually be +1; fallback to 0
            if (before !== undefined) actorPointsDelta = actorPoints - before;
            else if (
              scoringResult.events?.some(
                (e: any) => e.type === "REACTION_ENGAGEMENT"
              )
            ) {
              actorPointsDelta = 1;
            }
          }
        }
      } catch (e) {
        console.error("[scoring] post vote processing error", e);
      }

      // Get updated post data
      const updatedPost = await DiscussionPost.findByPk(postId, {
        attributes: ["upvotes", "downvotes"],
      });

      // Construct incremental voter diff (preferred) instead of loading all votes
      let diff:
        | {
            addedUp?: number[];
            removedUp?: number[];
            addedDown?: number[];
            removedDown?: number[];
          }
        | undefined;
      try {
        const actorId = req.user.id;
        if (!existingVote && finalUserVote === "upvote") {
          diff = { addedUp: [actorId] };
        } else if (!existingVote && finalUserVote === "downvote") {
          diff = { addedDown: [actorId] };
        } else if (isToggleOff && originalVoteType === "upvote") {
          diff = { removedUp: [actorId] };
        } else if (isToggleOff && originalVoteType === "downvote") {
          diff = { removedDown: [actorId] };
        } else if (
          isSwitch &&
          originalVoteType === "upvote" &&
          finalUserVote === "downvote"
        ) {
          diff = { removedUp: [actorId], addedDown: [actorId] };
        } else if (
          isSwitch &&
          originalVoteType === "downvote" &&
          finalUserVote === "upvote"
        ) {
          diff = { removedDown: [actorId], addedUp: [actorId] };
        }
      } catch (e) {
        console.warn("[votePost] diff build failed", e);
      }

      // Emit WebSocket event for real-time vote updates
      try {
        const webSocketService = getWebSocketService();
        webSocketService.broadcastPostVote({
          postId,
          userId: req.user.id,
          voteType: finalUserVote,
          upvotes: updatedPost?.upvotes || 0,
          downvotes: updatedPost?.downvotes || 0,
          previous_vote: originalVoteType,
          is_switch:
            !!originalVoteType &&
            !!finalUserVote &&
            originalVoteType !== finalUserVote,
          author_points: authorPoints,
          author_points_delta: authorPointsDelta,
          author_level: authorLevel,
          actor_points: actorPoints,
          actor_points_delta: actorPointsDelta,
          // Mirror field name used in frontend onPostVote handler for consistency
          userVote: finalUserVote,
          emitted_at: new Date().toISOString(),
          diff,
        });
        if (postVoteScoringResult?.events?.length) {
          try {
            webSocketService.broadcastScoreEvents({
              events: postVoteScoringResult.events,
              totals: postVoteScoringResult.totals || [],
            });
          } catch (e) {
            console.warn("[ws] score:events broadcast failed (post vote)");
          }
        }

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
          authorPoints: authorPoints,
          authorLevel: authorLevel,
          authorPointsDelta: authorPointsDelta,
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
          res.status(400).json({
            success: false,
            error: "is_market_post must be a boolean",
          });
          return;
        }
        post.is_market_post = is_market_post;
        // If switching to non-market, force available to false
        if (!is_market_post) {
          post.is_available = false;
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
        } else {
          post.is_available = false; // enforce rule
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
              ],
              required: false,
            },
          ],
          required: false,
        },
      ];

      // Add user vote information if authenticated
      // (Removed per-reply UserVote includes; we now aggregate all votes in a single query below for performance.)

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

      // Collect all reply ids (top-level + nested up to depth 3) for voter aggregation
      const collectIds = (arr: any[]): string[] => {
        const out: string[] = [];
        for (const r of arr) {
          out.push(r.id);
          if (Array.isArray(r.childReplies) && r.childReplies.length) {
            out.push(...collectIds(r.childReplies));
          }
        }
        return out;
      };
      const rawReplyIds = collectIds(replies as any);
      // Maps for voter ids
      const upvotersMap: Map<string, number[]> = new Map();
      const downvotersMap: Map<string, number[]> = new Map();
      let userVoteLookup: Map<string, string> | undefined;
      try {
        if (rawReplyIds.length) {
          const voteRows: any[] = await UserVote.findAll({
            where: { target_type: "reply", target_id: rawReplyIds } as any,
            attributes: ["target_id", "user_id", "vote_type"],
          });
          if (req.user) userVoteLookup = new Map();
          for (const v of voteRows) {
            const rid = String(v.target_id);
            if (v.vote_type === "upvote") {
              const arr = upvotersMap.get(rid) || [];
              arr.push(v.user_id);
              upvotersMap.set(rid, arr);
            } else if (v.vote_type === "downvote") {
              const arr = downvotersMap.get(rid) || [];
              arr.push(v.user_id);
              downvotersMap.set(rid, arr);
            }
            if (req.user && v.user_id === req.user.id) {
              userVoteLookup!.set(rid, v.vote_type);
            }
          }
        }
      } catch (e) {
        console.error("[discussions:getReplies] voter aggregation failed", e);
      }

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
        userVote: userVoteLookup?.get(String(r.id)) || null,
        upvoterIds: upvotersMap.get(String(r.id)) || [],
        downvoterIds: downvotersMap.get(String(r.id)) || [],
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
              userVote: userVoteLookup?.get(String(c.id)) || null,
              upvoterIds: upvotersMap.get(String(c.id)) || [],
              downvoterIds: downvotersMap.get(String(c.id)) || [],
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
                    userVote: userVoteLookup?.get(String(gc.id)) || null,
                    upvoterIds: upvotersMap.get(String(gc.id)) || [],
                    downvoterIds: downvotersMap.get(String(gc.id)) || [],
                    childReplies: [],
                  }))
                : [],
            }))
          : [],
      });

      const transformedReplies = replies.map(mapReply);

      // Dynamic level computation for replies (top-level + nested up to depth 3)
      try {
        // Collect all unique author ids across all reply depths
        const collectAuthorIds = (arr: any[]): number[] => {
          const ids: number[] = [];
          for (const r of arr) {
            if (r.author?.id) ids.push(r.author.id);
            if (Array.isArray(r.childReplies) && r.childReplies.length) {
              ids.push(...collectAuthorIds(r.childReplies));
            }
          }
          return ids;
        };
        const allAuthorIds = Array.from(
          new Set(collectAuthorIds(transformedReplies))
        );
        if (allAuthorIds.length) {
          const totals = await UserScoreTotal.findAll({
            where: { user_id: allAuthorIds } as any,
          });
          const totalMap = new Map<number, number>();
          for (const t of totals as any[])
            totalMap.set(t.user_id, fromScaled(t.total_points));
          const applyLevels = (arr: any[]) => {
            for (const r of arr) {
              const pts = totalMap.get(r.author?.id) || 0;
              if (r.author) {
                r.author.points = pts; // optional, may be unused by client
                r.author.level_id = mapPointsToLevel(Math.floor(pts)).level;
              }
              if (Array.isArray(r.childReplies) && r.childReplies.length) {
                applyLevels(r.childReplies);
              }
            }
          };
          applyLevels(transformedReplies);
        }
      } catch (e) {
        console.error("[scoring] failed to hydrate reply author levels", e);
      }

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

      // Scoring integration for reply vote (with trickle) – await to enrich WS
      let replyAuthorPoints: number | undefined;
      let replyAuthorPointsDelta: number | undefined;
      let actorPoints: number | undefined;
      let actorPointsDelta: number | undefined;
      let trickle: Array<{ userId: number; delta: number }> | undefined;
      let replyClassification: string | null = null;
      let trickleRoles:
        | Record<string, { userId: number; delta: number }>
        | undefined;
      let replyVoteScoringResult: any = undefined;
      const previousVote: any = existingVote ? existingVote.vote_type : null;
      // Track toggling/switch meta for diff
      const isToggleOff =
        !!existingVote && existingVote.vote_type === vote_type;
      const isSwitch = !!existingVote && existingVote.vote_type !== vote_type;
      try {
        const scoringResult: any = await scoringActionService.handleReplyVote({
          actorId: req.user.id,
          reply,
          post:
            (reply as any).post ||
            (await DiscussionPost.findByPk(reply.post_id))!,
          previousVote,
          newVote: finalUserVote,
        });
        replyVoteScoringResult = scoringResult;
        if (scoringResult?.totals) {
          // Extract classification (from any REACTION_RECEIVED event meta)
          (scoringResult.events || []).some((e: any) => {
            if (
              e.event_type === "REACTION_RECEIVED" &&
              e.ref_type === "reply" &&
              e.ref_id === reply.id &&
              e.meta?.classification
            ) {
              replyClassification = e.meta.classification;
              return true;
            }
            return false;
          });
          const replyAuthorId = reply.author_id;
          const replyAuthorTotal = scoringResult.totals.find(
            (t: any) => t.userId === replyAuthorId
          );
          if (replyAuthorTotal) {
            replyAuthorPoints = fromScaled(replyAuthorTotal.totalPoints);
            // delta approximation using events since we didn't snapshot before
            const deltaEvent = scoringResult.events?.filter(
              (e: any) => e.userId === replyAuthorId
            );
            if (deltaEvent?.length) {
              replyAuthorPointsDelta = deltaEvent.reduce(
                (acc: number, e: any) => acc + fromScaled(e.deltaPoints),
                0
              );
            }
          }
          const actorTotal = req.user
            ? scoringResult.totals.find((t: any) => t.userId === req.user!.id)
            : undefined;
          if (actorTotal) {
            actorPoints = fromScaled(actorTotal.totalPoints);
            if (
              scoringResult.events?.some(
                (e: any) =>
                  req.user &&
                  e.userId === req.user!.id &&
                  e.type === "REACTION_ENGAGEMENT"
              )
            ) {
              actorPointsDelta = 1;
            }
          }
          // Collect trickle deltas (exclude reply author & actor duplicates)
          if (Array.isArray(scoringResult.events)) {
            const byUser: Record<number, number> = {};
            const roleAgg: Record<string, { userId: number; delta: number }> =
              {};
            for (const ev of scoringResult.events) {
              if (typeof ev.userId === "number") {
                byUser[ev.userId] =
                  (byUser[ev.userId] || 0) + fromScaled(ev.deltaPoints);
              }
              // Capture role-specific mapping for UI animation clarity
              if (ev.event_type === "TRICKLE_PARENT") {
                roleAgg.parent = {
                  userId: ev.userId,
                  delta:
                    (roleAgg.parent?.delta || 0) + fromScaled(ev.deltaPoints),
                };
              } else if (ev.event_type === "TRICKLE_GRANDPARENT") {
                roleAgg.grandparent = {
                  userId: ev.userId,
                  delta:
                    (roleAgg.grandparent?.delta || 0) +
                    fromScaled(ev.deltaPoints),
                };
              } else if (ev.event_type === "TRICKLE_ROOT") {
                roleAgg.root = {
                  userId: ev.userId,
                  delta:
                    (roleAgg.root?.delta || 0) + fromScaled(ev.deltaPoints),
                };
              }
            }
            trickle = Object.entries(byUser)
              .filter(([uid]) => Number(uid) !== reply.author_id)
              .map(([uid, delta]) => ({ userId: Number(uid), delta }));
            if (!trickle.length) trickle = undefined;

            // Embed classification & role mapping into scoringResult for later broadcast
            trickleRoles = roleAgg;
          }
        }
      } catch (e) {
        console.error("[scoring] reply vote processing error", e);
      }

      // Reload counts
      const updated = await DiscussionReply.findByPk(replyId, {
        attributes: ["upvotes", "downvotes", "post_id"],
      });

      // Build incremental diff mirroring post vote diff structure (for future voter array maintenance)
      let diff:
        | {
            addedUp?: number[];
            removedUp?: number[];
            addedDown?: number[];
            removedDown?: number[];
          }
        | undefined;
      try {
        const actorId = req.user.id;
        if (!existingVote && finalUserVote === "upvote")
          diff = { addedUp: [actorId] };
        else if (!existingVote && finalUserVote === "downvote")
          diff = { addedDown: [actorId] };
        else if (isToggleOff && previousVote === "upvote")
          diff = { removedUp: [actorId] };
        else if (isToggleOff && previousVote === "downvote")
          diff = { removedDown: [actorId] };
        else if (
          isSwitch &&
          previousVote === "upvote" &&
          finalUserVote === "downvote"
        )
          diff = { removedUp: [actorId], addedDown: [actorId] };
        else if (
          isSwitch &&
          previousVote === "downvote" &&
          finalUserVote === "upvote"
        )
          diff = { removedDown: [actorId], addedUp: [actorId] };
      } catch (e) {
        console.warn("[replyVote] diff build failed", e);
      }

      try {
        const ws = getWebSocketService();
        // Use locally captured replyClassification & trickleRoles
        ws.broadcastReplyVote({
          replyId,
          postId: postId || (updated as any)?.post_id,
          userId: req.user.id,
          voteType: finalUserVote,
          upvotes: updated?.upvotes || 0,
          downvotes: updated?.downvotes || 0,
          previous_vote: previousVote,
          is_switch:
            !!previousVote && !!finalUserVote && previousVote !== finalUserVote,
          reply_author_points: replyAuthorPoints,
          reply_author_points_delta: replyAuthorPointsDelta,
          actor_points: actorPoints,
          actor_points_delta: actorPointsDelta,
          trickle,
          reply_classification: replyClassification as any,
          trickle_roles: trickleRoles as any,
          diff,
        });
        if (replyVoteScoringResult?.events?.length) {
          try {
            ws.broadcastScoreEvents({
              events: replyVoteScoringResult.events,
              totals: replyVoteScoringResult.totals || [],
            });
          } catch (e) {
            console.warn("[ws] score:events broadcast failed (reply vote)");
          }
        }

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
        { where: { id: postId } }
      );

      await transaction.commit();

      // Scoring: award reply creation & parent reward (await for unified broadcast)
      let replyCreateScoringResult: any = undefined;
      try {
        const parentReply = parent_reply_id
          ? await DiscussionReply.findByPk(parent_reply_id)
          : null;
        replyCreateScoringResult = await scoringActionService.awardReplyCreated(
          reply,
          post,
          parentReply
        );
      } catch (e) {
        console.error("[scoring] reply create scoring dispatch error", e);
      }

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
        if (replyCreateScoringResult?.events?.length) {
          try {
            webSocketService.broadcastScoreEvents({
              events: replyCreateScoringResult.events,
              totals: replyCreateScoringResult.totals || [],
            });
          } catch (e) {
            console.warn("[ws] score:events broadcast failed (reply create)");
          }
        }

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

  async getPostVoters(req: any, res: any) {
    try {
      const { id } = req.params;
      const { type = "upvote", limit = 50, cursor } = req.query;
      if (!["upvote", "downvote"].includes(type))
        return res.status(400).json({ success: false, error: "Invalid type" });
      const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const { default: UserVote } = await import("../models/UserVote");
      const { default: User } = await import("../models/User");
      const where: any = {
        target_type: "post",
        target_id: id,
        vote_type: type,
      };
      if (cursor) where.created_at = { $lt: new Date(cursor as string) } as any;
      const rows: any[] = await UserVote.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ["id", "username", "firstname", "lastname"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: lim + 1,
      });
      const slice = rows.slice(0, lim);
      res.json({
        success: true,
        data: slice.map((r) => ({
          userId: r.user_id,
          voteType: r.vote_type,
          votedAt: r.created_at,
          username: r.User?.username,
          firstname: r.User?.firstname,
          lastname: r.User?.lastname,
        })),
        meta: {
          hasMore: rows.length > lim,
          nextCursor:
            rows.length > lim ? slice[slice.length - 1].created_at : null,
        },
      });
    } catch (e) {
      console.error("getPostVoters error", e);
      res.status(500).json({ success: false, error: "Failed to fetch voters" });
    }
  }

  async getReplyVoters(req: any, res: any) {
    try {
      const { id } = req.params;
      const { type = "upvote", limit = 50, cursor } = req.query;
      if (!["upvote", "downvote"].includes(type))
        return res.status(400).json({ success: false, error: "Invalid type" });
      const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const { default: UserVote } = await import("../models/UserVote");
      const { default: User } = await import("../models/User");
      const where: any = {
        target_type: "reply",
        target_id: id,
        vote_type: type,
      };
      if (cursor) where.created_at = { $lt: new Date(cursor as string) } as any;
      const rows: any[] = await UserVote.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ["id", "username", "firstname", "lastname"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: lim + 1,
      });
      const slice = rows.slice(0, lim);
      res.json({
        success: true,
        data: slice.map((r) => ({
          userId: r.user_id,
          voteType: r.vote_type,
          votedAt: r.created_at,
          username: r.User?.username,
          firstname: r.User?.firstname,
          lastname: r.User?.lastname,
        })),
        meta: {
          hasMore: rows.length > lim,
          nextCursor:
            rows.length > lim ? slice[slice.length - 1].created_at : null,
        },
      });
    } catch (e) {
      console.error("getReplyVoters error", e);
      res.status(500).json({ success: false, error: "Failed to fetch voters" });
    }
  }

  /**
   * Bulk fetch voter id arrays for multiple replies
   * POST /api/discussions/replies/voters/bulk
   * body: { reply_ids: string[] }
   */
  async getReplyVotersBulk(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { reply_ids } = req.body || {};
      if (!Array.isArray(reply_ids) || !reply_ids.length) {
        res.status(400).json({
          success: false,
          error: "reply_ids must be a non-empty array",
        });
        return;
      }
      // Limit to reasonable number to prevent huge queries
      const ids = reply_ids.slice(0, 500);
      const rows: any[] = await UserVote.findAll({
        where: { target_type: "reply", target_id: ids } as any,
        attributes: ["target_id", "user_id", "vote_type"],
      });
      const up: Record<string, number[]> = {};
      const down: Record<string, number[]> = {};
      for (const r of rows) {
        const key = String(r.target_id);
        if (r.vote_type === "upvote") {
          (up[key] ||= []).push(r.user_id);
        } else if (r.vote_type === "downvote") {
          (down[key] ||= []).push(r.user_id);
        }
      }
      res.json({
        success: true,
        data: ids.map((id: string) => ({
          replyId: id,
          upvoterIds: up[id] || [],
          downvoterIds: down[id] || [],
        })),
      });
    } catch (e) {
      console.error("getReplyVotersBulk error", e);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch reply voters" });
    }
  }

  // Helper methods
  private getUserLevel(postCount: number): number {
    if (postCount >= 50) return 3; // Expert
    if (postCount >= 10) return 2; // Knight
    return 1; // Amateur
  }

  // Removed legacy getUserPoints; scoring now comes from user_score_totals

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
