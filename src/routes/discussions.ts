import { Router } from "express";
import discussionController from "../controllers/discussionController";
import { authenticateToken } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";
import { body, query, param } from "express-validator";

const router = Router();

// Validation rules
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
    .isIn(["up", "down"])
    .withMessage('vote_type must be either "up" or "down"'),
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

const reportValidation = [
  body("content_type")
    .isIn(["post", "reply"])
    .withMessage('content_type must be either "post" or "reply"'),
  body("content_id").isUUID().withMessage("content_id must be a valid UUID"),
  body("reason")
    .isIn([
      "inappropriate",
      "spam",
      "fraudulent",
      "misinformation",
      "technical",
      "other",
    ])
    .withMessage("Invalid report reason"),
  body("details")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Details must be less than 1000 characters"),
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
 * @route   POST /api/discussions/posts
 * @desc    Create a new discussion post
 * @access  Private (authenticated users only)
 */
router.post(
  "/posts",
  authenticateToken,
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
  authenticateToken,
  uuidValidation,
  voteValidation,
  handleValidationErrors,
  discussionController.votePost
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
  authenticateToken,
  uuidValidation,
  createReplyValidation,
  handleValidationErrors,
  discussionController.createReply
);

/**
 * @route   POST /api/discussions/reports
 * @desc    Report content (post or reply)
 * @access  Private (authenticated users only)
 */
router.post(
  "/reports",
  authenticateToken,
  reportValidation,
  handleValidationErrors,
  discussionController.reportContent
);

export default router;
