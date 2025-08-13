import { Router } from "express";
import notificationController from "../controllers/notificationController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

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
