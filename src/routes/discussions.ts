/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDiscussionPost:
 *       type: object
 *       required: [title, content]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 10
 *           maxLength: 255
 *           example: "Best practices for pig feeding in rainy season"
 *         content:
 *           type: string
 *           minLength: 20
 *           maxLength: 10000
 *           example: "I'm looking for advice on how to adjust pig feeding schedules during the rainy season. What are your experiences?"
 *         tags:
 *           type: array
 *           maxItems: 3
 *           items:
 *             type: string
 *           example: ["feeding", "seasonal", "best-practices"]
 *         is_market_post:
 *           type: boolean
 *           example: false
 *           description: "Whether this is a market-related post"
 *         is_available:
 *           type: boolean
 *           example: true
 *           description: "For market posts, whether the item/service is available"
 *     DiscussionReply:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *           example: "Great question! I usually reduce feeding frequency by 15% during heavy rains..."
 *         authorId:
 *           type: string
 *           format: uuid
 *         author:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         likesCount:
 *           type: integer
 *           example: 5
 *         isLiked:
 *           type: boolean
 *           example: false
 *           description: "Whether current user has liked this reply"
 */

import { Router } from "express";
import discussionController from "../controllers/discussionController";
import { authenticateToken } from "../middleware/auth";
import {
  authenticateWithCookies,
  csrfProtection,
} from "../middleware/cookieAuth";
import { handleValidationErrors } from "../middleware/validation";
import { uploadMedia } from "../middleware/upload";
import { body, query, param } from "express-validator";

const router = Router();

// Validation rules with business logic
const createPostValidation = [
  body("title")
    .isLength({ min: 10, max: 255 })
    .withMessage("Title must be between 10 and 255 characters"),
  body("content")
    .isLength({ min: 20, max: 10000 })
    .withMessage("Content must be between 20 and 10,000 characters"),
  body("tags")
    .optional()
    .isArray({ max: 3 })
    .withMessage("Maximum 3 tags allowed"),
  body("is_market_post")
    .optional()
    .isBoolean()
    .withMessage("is_market_post must be a boolean"),
  body("is_available")
    .optional()
    .isBoolean()
    .withMessage("is_available must be a boolean"),
];

const voteValidation = [
  body("vote_type")
    .isIn(["upvote", "downvote"])
    .withMessage('vote_type must be either "upvote" or "downvote"'),
];

const updatePostValidation = [
  body("title")
    .optional()
    .isLength({ min: 10, max: 255 })
    .withMessage("Title must be between 10 and 255 characters"),
  body("content")
    .optional()
    .isLength({ min: 20, max: 10000 })
    .withMessage("Content must be between 20 and 10,000 characters"),
  body("tags")
    .optional()
    .isArray({ max: 3 })
    .withMessage("tags must be an array with up to 3 items"),
  body("is_market_post")
    .optional()
    .isBoolean()
    .withMessage("is_market_post must be a boolean"),
  body("is_available")
    .optional()
    .isBoolean()
    .withMessage("is_available must be a boolean"),
  // Media update fields (optional)
  body("removedImages")
    .optional()
    .isArray()
    .withMessage("removedImages must be an array of URLs"),
  body("removedVideo")
    .optional()
    .isBoolean()
    .withMessage("removedVideo must be a boolean"),
];

const createReplyValidation = [
  body("content").custom((value) => {
    if (!value || typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        "Reply content cannot be empty or contain only whitespace"
      );
    }
    if (value.length > 2000) {
      throw new Error("Reply content must not exceed 2,000 characters");
    }
    return true;
  }),
  body("parent_reply_id")
    .optional()
    .isUUID()
    .withMessage("parent_reply_id must be a valid UUID"),
];

const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("sort")
    .optional()
    .isIn(["recent", "popular", "replies"])
    .withMessage("Sort must be one of: recent, popular, replies"),
  query("search")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("Search query must be between 1 and 255 characters"),
  query("tag")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Tag name must be between 1 and 50 characters"),
  query("cursor")
    .optional()
    .custom((value) => {
      // Allow empty string for initial infinite scroll request
      if (value === "" || value === undefined || value === null) {
        return true;
      }
      // Validate as ISO8601 if provided
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value)) {
        throw new Error(
          "Cursor must be a valid ISO 8601 timestamp or empty for initial request"
        );
      }
      return true;
    }),
  query("is_market_post")
    .optional()
    .isBoolean()
    .withMessage("is_market_post must be a boolean"),
  query("user_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("user_id must be a positive integer"),
];

const uuidValidation = [
  param("id").isUUID().withMessage("ID must be a valid UUID"),
];

// Routes

/**
 * @swagger
 * /api/discussions/posts:
 *   get:
 *     summary: Get all discussion posts
 *     description: |
 *       Retrieve discussion posts with pagination, search, and filtering.
 *       Shows public data for unauthenticated users, additional data for authenticated users.
 *     tags: [Discussions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and content
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *         description: Filter by category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [latest, oldest, popular, trending]
 *           default: latest
 *         description: Sort order for results
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DiscussionPost'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get(
  "/posts",
  queryValidation,
  handleValidationErrors,
  discussionController.getPosts
);

/**
 * @swagger
 * /api/discussions/posts:
 *   post:
 *     summary: Create new discussion post
 *     description: |
 *       Create a new discussion post with optional media attachments.
 *       Supports regular discussions and market posts with availability status.
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 example: "Best feeding schedule for growing pigs"
 *               content:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 10000
 *                 example: "I'm looking for advice on optimal feeding schedules for pigs weighing 40-60kg. What has worked best for your farm?"
 *               tags:
 *                 type: array
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                 example: ["feeding", "growth", "nutrition"]
 *               is_market_post:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               is_available:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: "Up to 5 image files (JPEG, PNG, WebP)"
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: "Single video file (MP4, WebM, AVI)"
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post created successfully"
 *                 post:
 *                   $ref: '#/components/schemas/DiscussionPost'
 *       400:
 *         description: Validation error or file upload issue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CSRF token required
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported media type
 *       500:
 *         description: Server error during post creation
 *
 * /api/discussions/my-posts:
 *   get:
 *     summary: Get current user's discussion posts
 *     description: Retrieve all discussion posts created by the authenticated user
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by post status
 *     responses:
 *       200:
 *         description: User's posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DiscussionPost'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/my-posts",
  authenticateWithCookies,
  queryValidation,
  handleValidationErrors,
  discussionController.getMyPosts
);

/**
 * @swagger
 * /api/discussions/my-posts/stats:
 *   get:
 *     summary: Get current user's post statistics
 *     description: Get statistics for the authenticated user's posts (total, today, approved, pending, market posts)
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's post statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 15
 *                 today:
 *                   type: integer
 *                   example: 2
 *                 approved:
 *                   type: integer
 *                   example: 12
 *                 pending:
 *                   type: integer
 *                   example: 3
 *                 market:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/my-posts/stats",
  authenticateWithCookies,
  discussionController.getMyPostsStats
);

/**
 * @swagger
 * /api/discussions/posts/stats:
 *   get:
 *     summary: Get general discussion statistics
 *     description: Get public statistics for discussions (total approved posts, posts created today)
 *     tags: [Discussions]
 *     responses:
 *       200:
 *         description: Discussion statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalApproved:
 *                   type: integer
 *                   example: 1250
 *                 postsToday:
 *                   type: integer
 *                   example: 23
 */
router.get("/posts/stats", discussionController.getStats);

/**
 * @swagger
 * /api/discussions/posts:
 *   post:
 *     summary: Create a new discussion post
 *     description: |
 *       Create a new discussion post with optional media upload.
 *
 *       **Business Rules:**
 *       - Text content: Required (20-10,000 characters)
 *       - Images: 0-4 allowed (jpg, png, gif, webp, max 5MB each)
 *       - Video: 0-1 allowed (mp4, mov, avi, webm, max 50MB)
 *       - Cannot have both images AND video in the same post
 *       - Tags: Maximum 3 allowed
 *       - Post requires moderation approval before appearing publicly
 *
 *       **CSRF Protection Required:** Include X-CSRF-Token header
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/CreateDiscussionPost'
 *               - type: object
 *                 properties:
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *                     maxItems: 4
 *                     description: "Image files (max 4, cannot be used with video)"
 *                   video:
 *                     type: string
 *                     format: binary
 *                     description: "Video file (max 1, cannot be used with images)"
 *     responses:
 *       201:
 *         description: Discussion post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         post:
 *                           $ref: '#/components/schemas/DiscussionPost'
 *       400:
 *         description: Validation error or business rule violation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: CSRF token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/posts",
  authenticateWithCookies,
  csrfProtection,
  uploadMedia, // Always include media middleware (handles no files gracefully)
  createPostValidation,
  handleValidationErrors,
  discussionController.createPost
);

/**
 * @swagger
 * /api/discussions/posts/{id}/vote:
 *   post:
 *     summary: Vote on a discussion post
 *     description: |
 *       Cast an upvote or downvote on a discussion post.
 *       Users can change their vote or remove it by voting the same way again.
 *
 *       **CSRF Protection Required:** Include X-CSRF-Token header
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID to vote on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vote_type]
 *             properties:
 *               vote_type:
 *                 type: string
 *                 enum: [upvote, downvote]
 *                 example: "upvote"
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Vote recorded successfully"
 *                         currentVote:
 *                           type: string
 *                           enum: [upvote, downvote, null]
 *                           example: "upvote"
 *       400:
 *         description: Invalid vote type or post ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: CSRF token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/posts/:id/vote",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  voteValidation,
  handleValidationErrors,
  discussionController.votePost
);

/**
 * @route   POST /api/discussions/replies/:id/vote
 * @desc    Vote on a reply (upvote/downvote)
 * @access  Private (authenticated users only)
 */
router.post(
  "/replies/:id/vote",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  voteValidation,
  handleValidationErrors,
  discussionController.voteReply
);

/**
 * @swagger
 * /api/discussions/posts/{id}/replies:
 *   get:
 *     summary: Get replies for a discussion post
 *     description: |
 *       Retrieve all replies for a specific discussion post with pagination.
 *       Shows public data for unauthenticated users, additional data for authenticated users.
 *     tags: [Discussions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discussion post ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular, replies]
 *           default: recent
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 replies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DiscussionReply'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Post not found
 */
/**
 * @route   GET /api/discussions/posts/:id/replies
 * @desc    Get replies for a specific post
 * @access  Public (but shows more data if authenticated)
 */
router.get(
  "/posts/:id/replies",
  uuidValidation,
  queryValidation,
  handleValidationErrors,
  discussionController.getReplies
);

/**
 * @swagger
 * /api/discussions/posts/{id}/replies:
 *   post:
 *     summary: Create reply to discussion post
 *     description: |
 *       Create a new reply to a discussion post. Supports threaded replies
 *       by specifying a parent_reply_id for nested conversations.
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discussion post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "Great point! I've had similar experiences."
 *               parent_reply_id:
 *                 type: string
 *                 format: uuid
 *                 description: "ID of parent reply for threaded conversations"
 *     responses:
 *       201:
 *         description: Reply created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reply created successfully"
 *                 reply:
 *                   $ref: '#/components/schemas/DiscussionReply'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CSRF token required
 *       404:
 *         description: Post not found
 */
/**
 * @route   POST /api/discussions/posts/:id/replies
 * @desc    Create a reply to a post
 * @access  Private (authenticated users only)
 */
router.post(
  "/posts/:id/replies",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  createReplyValidation,
  handleValidationErrors,
  discussionController.createReply
);

/**
 * @swagger
 * /api/discussions/posts/{id}:
 *   patch:
 *     summary: Update discussion post
 *     description: |
 *       Update an existing discussion post. Only the post author can update their posts.
 *       Supports updating text content, tags, media, and availability status.
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discussion post ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *               content:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 10000
 *               tags:
 *                 type: array
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *               is_market_post:
 *                 type: boolean
 *               is_available:
 *                 type: boolean
 *               removedImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "URLs of images to remove"
 *               removedVideo:
 *                 type: boolean
 *                 description: "Set to true to remove video"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "New images to add"
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: "New video to add"
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post updated successfully"
 *                 post:
 *                   $ref: '#/components/schemas/DiscussionPost'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this post
 *       404:
 *         description: Post not found
 *
 *   delete:
 *     summary: Delete discussion post
 *     description: |
 *       Soft delete a discussion post. Only the post author or moderators can delete posts.
 *       This action removes the post from public view but preserves it for moderation.
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discussion post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post deleted successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to delete this post
 *       404:
 *         description: Post not found
 */
/**
 * @route   PATCH /api/discussions/posts/:id
 * @desc    Update a post (owner-only). Supports updating title, content, tags, is_available
 * @access  Private (authenticated users only)
 */
router.patch(
  "/posts/:id",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  // Allow optional media files to be sent with the PATCH request
  uploadMedia,
  updatePostValidation,
  handleValidationErrors,
  discussionController.updatePost
);

/**
 * @swagger
 * /api/discussions/posts/{id}/media:
 *   post:
 *     summary: Upload media files for a post
 *     description: |
 *       Upload media files (images or video) for a specific discussion post.
 *       Only the post author can upload media to their posts.
 *     tags: [Discussions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discussion post ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *                 description: "Image files (cannot be used with video)"
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: "Video file (cannot be used with images)"
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Media uploaded successfully"
 *                 mediaUrls:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *       400:
 *         description: Invalid file or validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to upload media to this post
 *       404:
 *         description: Post not found
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported media type
 */
/**
 * @route   POST /api/discussions/posts/:id/media
 * @desc    Upload media files for a specific post
 * @access  Private (authenticated users only)
 */
router.post(
  "/posts/:id/media",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  handleValidationErrors,
  uploadMedia,
  discussionController.uploadMedia
);

/**
 * @route   DELETE /api/discussions/posts/:id
 * @desc    Soft delete a post (author or users with elevated permissions)
 * @access  Private
 */
router.delete(
  "/posts/:id",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  handleValidationErrors,
  discussionController.deletePost
);

/**
 * @route   GET /api/discussions/media/:storageKey
 * @desc    Get media file by storage key
 * @access  Public
 */
router.get("/media/:storageKey", discussionController.getMedia);

/**
 * @route   GET /api/discussions/media/:storageKey/thumbnail
 * @desc    Get media thumbnail by storage key
 * @access  Public
 */
router.get(
  "/media/:storageKey/thumbnail",
  discussionController.getMediaThumbnail
);

/**
 * @route   GET /api/discussions/tags
 * @desc    Get all available tags
 * @access  Public
 */
router.get("/tags", discussionController.getTags);

/**
 * @route   GET /api/discussions/posts/:id/voters
 * @desc    Get voters for a specific post
 * @access  Private (authenticated users only)
 */
router.get(
  "/posts/:id/voters",
  authenticateWithCookies,
  discussionController.getPostVoters
);

/**
 * @route   GET /api/discussions/replies/:id/voters
 * @desc    Get voters for a specific reply
 * @access  Private (authenticated users only)
 */
router.get(
  "/replies/:id/voters",
  authenticateWithCookies,
  discussionController.getReplyVoters
);

/**
 * @route   POST /api/discussions/replies/voters/bulk
 * @desc    Bulk fetch voter id arrays for multiple replies
 * @access  Private (authenticated users only)
 */
router.post(
  "/replies/voters/bulk",
  authenticateWithCookies,
  discussionController.getReplyVotersBulk
);

/**
 * @route   PATCH /api/discussions/replies/:id
 * @desc    Update a reply (author only)
 * @access  Private (authenticated users only)
 */
router.patch(
  "/replies/:id",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  [
    body("content")
      .isLength({ min: 5, max: 2000 })
      .withMessage("Content must be between 5 and 2000 characters")
      .custom((value) => {
        if (!value || value.trim().length === 0) {
          throw new Error("Content cannot be empty or whitespace only");
        }
        return true;
      }),
  ],
  handleValidationErrors,
  discussionController.updateReply
);

/**
 * @route   DELETE /api/discussions/replies/:id
 * @desc    Delete a reply (author only) - soft delete
 * @access  Private (authenticated users only)
 */
router.delete(
  "/replies/:id",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  handleValidationErrors,
  discussionController.deleteReply
);

export default router;
