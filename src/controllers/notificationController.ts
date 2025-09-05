import { Request, Response } from "express";
import notificationService from "../services/notificationService";

class NotificationController {
  constructor() {
    // Bind methods to ensure proper 'this' context
    this.getNotifications = this.getNotifications.bind(this);
    this.getUnreadCount = this.getUnreadCount.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.clearAll = this.clearAll.bind(this);
  }

  /**
   * Get user notifications with pagination
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getUserNotifications(
        userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get notifications",
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const count = await notificationService.getUnreadNotificationCount(
        userId
      );

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get unread count",
      });
    }
  }

  /**
   * Mark specific notifications as read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { notificationIds } = req.body;
      if (!Array.isArray(notificationIds)) {
        res.status(400).json({
          success: false,
          error: "notificationIds must be an array",
        });
        return;
      }

      await notificationService.markNotificationsAsRead(
        userId,
        notificationIds
      );

      res.json({
        success: true,
        message: "Notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({
        success: false,
        error: "Failed to mark notifications as read",
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await notificationService.markAllNotificationsAsRead(userId);

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({
        success: false,
        error: "Failed to mark all notifications as read",
      });
    }
  }

  /**
   * Clear all notifications (delete from database)
   */
  async clearAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await notificationService.clearAllNotifications(userId);

      res.json({
        success: true,
        message: "All notifications cleared",
      });
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear all notifications",
      });
    }
  }
}

export default new NotificationController();
