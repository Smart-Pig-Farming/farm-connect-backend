/**
 * @swagger
 * components:
 *   schemas:
 *     ContentReport:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         content_type:
 *           type: string
 *           example: "post"
 *           enum:
 *             - post
 *             - reply
 *         content_id:
 *           type: string
 *           format: uuid
 *           example: "456e7890-e89b-12d3-a456-426614174000"
 *         reporter_id:
 *           type: integer
 *           example: 123
 *         reason:
 *           type: string
 *           example: "inappropriate"
 *           enum:
 *             - inappropriate
 *             - spam
 *             - fraudulent
 *             - misinformation
 *             - technical
 *             - other
 *         details:
 *           type: string
 *           maxLength: 1000
 *           example: "This post contains offensive language"
 *         status:
 *           type: string
 *           example: "pending"
 *           enum:
 *             - pending
 *             - reviewed
 *             - resolved
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         reporter:
 *           $ref: '#/components/schemas/User'
 *         content:
 *           oneOf:
 *             - $ref: '#/components/schemas/DiscussionPost'
 *             - $ref: '#/components/schemas/DiscussionReply'
 *
 *     ModerationCase:
 *       type: object
 *       properties:
 *         post_id:
 *           type: string
 *           format: uuid
 *         post:
 *           $ref: '#/components/schemas/DiscussionPost'
 *         reports:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentReport'
 *         report_count:
 *           type: integer
 *           example: 3
 *         first_report_at:
 *           type: string
 *           format: date-time
 *         last_report_at:
 *           type: string
 *           format: date-time
 *         priority_score:
 *           type: number
 *           example: 8.5
 *           description: "Calculated priority score for moderation queue"
 *
 *     ModerationDecision:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         post_id:
 *           type: string
 *           format: uuid
 *         moderator_id:
 *           type: integer
 *         decision:
 *           type: string
 *           example: "retained"
 *           enum:
 *             - retained
 *             - deleted
 *             - warned
 *         justification:
 *           type: string
 *           maxLength: 1000
 *           example: "Content meets community guidelines after review"
 *         created_at:
 *           type: string
 *           format: date-time
 *         moderator:
 *           $ref: '#/components/schemas/User'
 *         post:
 *           $ref: '#/components/schemas/DiscussionPost'
 *
 *     CreateReportRequest:
 *       type: object
 *       required: [reason]
 *       properties:
 *         reason:
 *           type: string
 *           enum:
 *             - inappropriate
 *             - spam
 *             - fraudulent
 *             - misinformation
 *             - technical
 *             - other
 *           example: "inappropriate"
 *           description: "Reason for reporting the content"
 *         details:
 *           type: string
 *           maxLength: 1000
 *           example: "This content contains offensive language and violates community guidelines"
 *           description: "Optional detailed explanation"
 *
 *     ModerationDecisionRequest:
 *       type: object
 *       required: [decision]
 *       properties:
 *         decision:
 *           type: string
 *           description: "Moderation decision"
 *           example: "retained"
 *           enum:
 *             - retained
 *             - deleted
 *             - warned
 *         justification:
 *           type: string
 *           maxLength: 1000
 *           example: "Content reviewed and found to comply with community guidelines"
 *           description: "Required justification for the decision"
 */

import { Router } from "express";
import {
  authenticateWithCookies,
  csrfProtection,
} from "../middleware/cookieAuth";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/permissions";
import { handleValidationErrors } from "../middleware/validation";
import { body, param, query } from "express-validator";
import moderationController from "../controllers/moderationController";

const router = Router();

/**
 * @swagger
 * /api/moderation/posts/{id}/report:
 *   post:
 *     summary: Report a discussion post
 *     description: |
 *       Report a discussion post for violating community guidelines.
 *       Creates a report for moderator review.
 *     tags: [Content Moderation]
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
 *         description: Discussion post ID to report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportRequest'
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Report submitted successfully"
 *                 report:
 *                   $ref: '#/components/schemas/ContentReport'
 *       400:
 *         description: Validation error or invalid reason
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires CREATE:REPORTS)
 *       404:
 *         description: Post not found
 *       409:
 *         description: Already reported by this user
 */
/**
 * @swagger
 * /api/moderation/replies/{id}/report:
 *   post:
 *     summary: Report a reply
 *     description: |
 *       Report a reply to a discussion post for violating community guidelines.
 *       Creates a report for moderator review.
 *     tags: [Content Moderation]
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
 *         description: Reply ID to report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportRequest'
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Report submitted successfully"
 *                 report:
 *                   $ref: '#/components/schemas/ContentReport'
 *       400:
 *         description: Validation error or invalid reason
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires CREATE:REPORTS)
 *       404:
 *         description: Reply not found
 *       409:
 *         description: Already reported by this user
 */
/**
 * @swagger
 * /api/moderation/pending:
 *   get:
 *     summary: Get pending moderation queue
 *     description: |
 *       Retrieve posts that have been reported and are awaiting moderation.
 *       Posts are grouped with their associated reports and prioritized by severity.
 *     tags: [Content Moderation]
 *     security:
 *       - cookieAuth: []
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
 *           default: 20
 *         description: Number of cases per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search in post content or reporter information
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum:
 *             - high
 *             - medium
 *             - low
 *         description: Filter by priority level
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum:
 *             - inappropriate
 *             - spam
 *             - fraudulent
 *             - misinformation
 *             - technical
 *             - other
 *         description: Filter by report reason
 *     responses:
 *       200:
 *         description: Pending moderation cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ModerationCase'
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
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_pending:
 *                       type: integer
 *                       example: 47
 *                     high_priority:
 *                       type: integer
 *                       example: 12
 *                     medium_priority:
 *                       type: integer
 *                       example: 23
 *                     low_priority:
 *                       type: integer
 *                       example: 12
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires moderation permissions)
 */
/**
 * @swagger
 * /api/moderation/posts/{postId}/decision:
 *   post:
 *     summary: Apply moderation decision
 *     description: |
 *       Apply a moderation decision to a reported post. This resolves all reports
 *       for the post and takes appropriate action based on the decision.
 *     tags: [Content Moderation]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID to apply decision to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationDecisionRequest'
 *     responses:
 *       200:
 *         description: Moderation decision applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Moderation decision applied successfully"
 *                 decision:
 *                   $ref: '#/components/schemas/ModerationDecision'
 *                 affected_reports:
 *                   type: integer
 *                   example: 3
 *                   description: "Number of reports resolved by this decision"
 *       400:
 *         description: Validation error or invalid decision
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires moderation permissions)
 *       404:
 *         description: Post not found or no pending reports
 *       409:
 *         description: Post already has a moderation decision
 */
/**
 * @swagger
 * /api/moderation/history:
 *   get:
 *     summary: Get moderation history
 *     description: |
 *       Retrieve the history of moderation decisions made by moderators.
 *       Useful for auditing and performance tracking.
 *     tags: [Content Moderation]
 *     security:
 *       - cookieAuth: []
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
 *           default: 20
 *         description: Number of decisions per page
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601 format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601 format)
 *       - in: query
 *         name: decision
 *         schema:
 *           type: string
 *           enum:
 *             - retained
 *             - deleted
 *             - warned
 *         description: Filter by decision type
 *       - in: query
 *         name: moderator_id
 *         schema:
 *           type: integer
 *         description: Filter by specific moderator
 *     responses:
 *       200:
 *         description: Moderation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 decisions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ModerationDecision'
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
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     total_decisions:
 *                       type: integer
 *                       example: 245
 *                     retained:
 *                       type: integer
 *                       example: 156
 *                     deleted:
 *                       type: integer
 *                       example: 67
 *                     warned:
 *                       type: integer
 *                       example: 22
 *                     average_response_time_hours:
 *                       type: number
 *                       example: 4.7
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires moderation permissions)
 */

// Report content (post)
router.post(
  "/posts/:id/report",
  authenticateWithCookies,
  requirePermission("CREATE:REPORTS"),
  csrfProtection,
  param("id").isUUID(),
  body("reason")
    .isIn([
      "inappropriate",
      "spam",
      "fraudulent",
      "misinformation",
      "technical",
      "other",
    ])
    .withMessage("Invalid reason"),
  body("details").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.createReport
);

// Report content (reply)
router.post(
  "/replies/:id/report",
  authenticateWithCookies,
  requirePermission("CREATE:REPORTS"),
  csrfProtection,
  param("id").isUUID(),
  body("reason")
    .isIn([
      "inappropriate",
      "spam",
      "fraudulent",
      "misinformation",
      "technical",
      "other",
    ])
    .withMessage("Invalid reason"),
  body("details").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.createReport
);

// Get pending moderation queue (posts grouped with reports)
router.get(
  "/pending",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  query("search").optional().isLength({ max: 255 }),
  handleValidationErrors,
  moderationController.getPending
);

// Apply decision to a post moderation case
router.post(
  "/posts/:postId/decision",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  csrfProtection,
  param("postId").isUUID(),
  body("decision")
    .isIn(["retained", "deleted", "warned"])
    .withMessage("Invalid decision"),
  body("justification").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.decide
);

// Moderation history
router.get(
  "/history",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("decision").optional().isIn(["retained", "deleted", "warned"]),
  handleValidationErrors,
  moderationController.getHistory
);

// Metrics endpoint removed

export default router;
