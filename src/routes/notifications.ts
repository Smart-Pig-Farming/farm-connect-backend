/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         user_id:
 *           type: integer
 *           example: 123
 *         type:
 *           type: string
 *           description: "Type of notification"
 *           example: "reply_to_post"
 *           enum:
 *             - reply_to_post
 *             - reply_to_reply
 *             - post_liked
 *             - reply_liked
 *             - mention
 *             - quiz_available
 *             - best_practice_published
 *             - moderation_decision
 *             - system_announcement
 *             - score_milestone
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: "New reply to your post"
 *         message:
 *           type: string
 *           maxLength: 1000
 *           example: "John Doe replied to your post about pig feeding schedules"
 *         data:
 *           type: object
 *           description: "Additional notification data (post ID, user info, etc.)"
 *           example:
 *             post_id: "456e7890-e89b-12d3-a456-426614174000"
 *             reply_id: "789e0123-e89b-12d3-a456-426614174000"
 *             author_name: "John Doe"
 *             author_id: 456
 *         is_read:
 *           type: boolean
 *           default: false
 *           example: false
 *         read_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T14:30:00Z"
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-04-15T14:30:00Z"
 *           description: "Optional expiration date for time-sensitive notifications"
 *
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 123
 *         email_notifications:
 *           type: boolean
 *           default: true
 *           example: true
 *         push_notifications:
 *           type: boolean
 *           default: true
 *           example: true
 *         notification_types:
 *           type: object
 *           properties:
 *             replies:
 *               type: boolean
 *               default: true
 *             likes:
 *               type: boolean
 *               default: true
 *             mentions:
 *               type: boolean
 *               default: true
 *             quizzes:
 *               type: boolean
 *               default: true
 *             best_practices:
 *               type: boolean
 *               default: true
 *             moderation:
 *               type: boolean
 *               default: true
 *             system:
 *               type: boolean
 *               default: true
 *             scores:
 *               type: boolean
 *               default: true
 *         quiet_hours:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               default: false
 *             start_time:
 *               type: string
 *               format: time
 *               example: "22:00"
 *             end_time:
 *               type: string
 *               format: time
 *               example: "07:00"
 *             timezone:
 *               type: string
 *               example: "Africa/Kigali"
 */

import { Router } from "express";
import notificationController from "../controllers/notificationController";
import { authenticateWithCookies } from "../middleware/cookieAuth";

const router = Router();

// All notification routes require authentication (cookie-based to align with other routes)
router.use(authenticateWithCookies);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: |
 *       Retrieve notifications for the authenticated user with pagination and filtering.
 *       Notifications are sorted by creation date (newest first).
 *     tags: [Notifications]
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
 *         description: Number of notifications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum:
 *             - reply_to_post
 *             - reply_to_reply
 *             - post_liked
 *             - reply_liked
 *             - mention
 *             - quiz_available
 *             - best_practice_published
 *             - moderation_decision
 *             - system_announcement
 *             - score_milestone
 *         description: Filter by notification type
 *       - in: query
 *         name: read_status
 *         schema:
 *           type: string
 *           enum:
 *             - all
 *             - read
 *             - unread
 *           default: all
 *         description: Filter by read status
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Only show notifications from the last N days
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
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
 *                     total_notifications:
 *                       type: integer
 *                       example: 156
 *                     unread_count:
 *                       type: integer
 *                       example: 23
 *                     today_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Authentication required
 */
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: |
 *       Get the count of unread notifications for the authenticated user.
 *       This is useful for badge indicators in the UI.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unread_count:
 *                   type: integer
 *                   example: 7
 *                 has_urgent:
 *                   type: boolean
 *                   example: true
 *                   description: "Whether there are urgent/high-priority unread notifications"
 *                 last_notification_at:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: "2024-03-15T14:30:00Z"
 *                   description: "Timestamp of the most recent notification"
 *       401:
 *         description: Authentication required
 */
/**
 * @swagger
 * /api/notifications/mark-read:
 *   post:
 *     summary: Mark specific notifications as read
 *     description: |
 *       Mark one or more notifications as read by providing their IDs.
 *       This updates the is_read status and sets the read_at timestamp.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notification_ids]
 *             properties:
 *               notification_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *                 example: [
 *                   "123e4567-e89b-12d3-a456-426614174000",
 *                   "456e7890-e89b-12d3-a456-426614174001"
 *                 ]
 *                 description: "Array of notification IDs to mark as read"
 *     responses:
 *       200:
 *         description: Notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "2 notifications marked as read"
 *                 marked_count:
 *                   type: integer
 *                   example: 2
 *                   description: "Number of notifications actually marked as read"
 *                 already_read_count:
 *                   type: integer
 *                   example: 0
 *                   description: "Number of notifications that were already read"
 *       400:
 *         description: Validation error or invalid notification IDs
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CSRF token required
 */
/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   post:
 *     summary: Mark all notifications as read
 *     description: |
 *       Mark all notifications for the authenticated user as read.
 *       This is useful for a "mark all as read" button in the UI.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               before_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-15T14:30:00Z"
 *                 description: "Optional: only mark notifications before this date as read"
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - reply_to_post
 *                     - reply_to_reply
 *                     - post_liked
 *                     - reply_liked
 *                     - mention
 *                     - quiz_available
 *                     - best_practice_published
 *                     - moderation_decision
 *                     - system_announcement
 *                     - score_milestone
 *                 description: "Optional: only mark notifications of these types as read"
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All notifications marked as read"
 *                 marked_count:
 *                   type: integer
 *                   example: 23
 *                   description: "Number of notifications marked as read"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CSRF token required
 */
/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     summary: Clear all notifications
 *     description: |
 *       Permanently delete all notifications for the authenticated user.
 *       This action cannot be undone. Use with caution.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               older_than_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 example: 30
 *                 description: "Optional: only delete notifications older than N days"
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - reply_to_post
 *                     - reply_to_reply
 *                     - post_liked
 *                     - reply_liked
 *                     - mention
 *                     - quiz_available
 *                     - best_practice_published
 *                     - moderation_decision
 *                     - system_announcement
 *                     - score_milestone
 *                 description: "Optional: only delete notifications of these types"
 *               read_only:
 *                 type: boolean
 *                 default: false
 *                 description: "Optional: only delete read notifications"
 *     responses:
 *       200:
 *         description: Notifications cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All notifications cleared"
 *                 deleted_count:
 *                   type: integer
 *                   example: 156
 *                   description: "Number of notifications deleted"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CSRF token required
 */

// Get user notifications with pagination
router.get("/", notificationController.getNotifications);

// Get unread notification count
router.get("/unread-count", notificationController.getUnreadCount);

// Mark specific notifications as read
router.post("/mark-read", notificationController.markAsRead);

// Mark all notifications as read
router.post("/mark-all-read", notificationController.markAllAsRead);

// Clear all notifications (delete from database)
router.delete("/clear-all", notificationController.clearAll);

export default router;
