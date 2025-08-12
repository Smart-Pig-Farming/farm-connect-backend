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
  body("is_available")
    .optional()
    .isBoolean()
    .withMessage("is_available must be a boolean"),
];

const createReplyValidation = [
  body("content")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Reply content must be between 10 and 2,000 characters"),
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
 * @route   GET /api/discussions/posts
 * @desc    Get all discussion posts with pagination, search, and filtering
 * @access  Public (but shows more data if authenticated)
 */
router.get(
  "/posts",
  queryValidation,
  handleValidationErrors,
  discussionController.getPosts
);

/**
 * @route   GET /api/discussions/my-posts
 * @desc    Get posts created by the authenticated user
 * @access  Private (authenticated users only)
 */
router.get(
  "/my-posts",
  authenticateWithCookies,
  queryValidation,
  handleValidationErrors,
  discussionController.getMyPosts
);

/**
 * @route   GET /api/discussions/my-posts/stats
 * @desc    Get stats for authenticated user's posts (total, today, approved, pending, market)
 * @access  Private (authenticated users only)
 */
router.get(
  "/my-posts/stats",
  authenticateWithCookies,
  discussionController.getMyPostsStats
);

/**
 * @route   GET /api/discussions/posts/stats
 * @desc    Get stats for discussions (total approved, posts today)
 * @access  Public
 */
router.get("/posts/stats", discussionController.getStats);

/**
 * @route   POST /api/discussions/posts
 * @desc    Create a new discussion post with optional media upload
 * @business_rules:
 *   - Text content: Required (20-10,000 chars)
 *   - Images: 0-4 allowed (jpg, png, gif, webp)
 *   - Video: 0-1 allowed (mp4, mov, avi, webm)
 *   - Cannot have both images AND video in same post
 *   - Tags: Maximum 3 allowed
 * @access  Private (authenticated users only)
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
 * @route   POST /api/discussions/posts/:id/vote
 * @desc    Vote on a post (upvote/downvote)
 * @access  Private (authenticated users only)
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
 * @route   PATCH /api/discussions/posts/:id
 * @desc    Update a post (owner-only). Supports updating title, content, tags, is_available
 * @access  Private (authenticated users only)
 */
router.patch(
  "/posts/:id",
  authenticateWithCookies,
  csrfProtection,
  uuidValidation,
  updatePostValidation,
  handleValidationErrors,
  discussionController.updatePost
);

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

export default router;
