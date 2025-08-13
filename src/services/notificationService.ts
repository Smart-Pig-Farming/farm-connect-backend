import { getWebSocketService, NotificationData } from "./webSocketService";
import { randomUUID } from "crypto";
import User from "../models/User";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import Notification from "../models/Notification";
import { Op } from "sequelize";

export interface NotificationPayload {
  recipientId: number;
  type:
    | "post_vote"
    | "reply_created"
    | "reply_vote"
    | "post_approved"
    | "mention"
    | "post_reported"
    | "moderation_decision_reporter"
    | "moderation_decision_owner";
  triggerUserId: number;
  data: {
    postId?: string;
    replyId?: string;
    postTitle?: string;
    contentPreview?: string;
    voteType?: "upvote" | "downvote";
    reportReason?: string;
    decision?: "retained" | "deleted" | "warned";
    justification?: string;
  };
}

class NotificationService {
  /**
   * Create and send a notification to a user
   */
  async createNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get trigger user info
      const triggerUser = await User.findByPk(payload.triggerUserId, {
        attributes: ["id", "firstname", "lastname"],
      });

      if (!triggerUser) {
        console.error("Trigger user not found:", payload.triggerUserId);
        return;
      }

      // Generate notification content based on type
      const notificationContent = this.generateNotificationContent(
        payload,
        triggerUser
      );

      // Use a proper UUID so it persists cleanly into the notifications table (UUID PK)
      const notificationId = randomUUID();

      const notification: NotificationData = {
        id: notificationId,
        userId: payload.recipientId,
        type: payload.type,
        title: notificationContent.title,
        message: notificationContent.message,
        data: {
          ...payload.data,
          triggerUser: {
            id: triggerUser.id,
            name: `${triggerUser.firstname} ${triggerUser.lastname}`,
          },
        },
        created_at: new Date().toISOString(),
      };

      // Send via WebSocket if user is online
      const webSocketService = getWebSocketService();
      webSocketService.sendNotificationToUser(
        payload.recipientId,
        notification
      );

      // Save to database for persistence
      await this.saveNotificationToDatabase(notification);

      console.log(
        `📬 Notification sent to user ${payload.recipientId}: ${notification.title}`
      );
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  /**
   * Generate notification title and message based on type
   */
  private generateNotificationContent(
    payload: NotificationPayload,
    triggerUser: any
  ): { title: string; message: string } {
    const userName = `${triggerUser.firstname} ${triggerUser.lastname}`;
    const { data } = payload;

    switch (payload.type) {
      case "post_vote":
        return {
          title: "Your post received a vote!",
          message: `${userName} ${
            data.voteType === "upvote" ? "upvoted" : "downvoted"
          } your post "${data.postTitle}"`,
        };

      case "reply_created":
        return {
          title: "New reply on your post",
          message: `${userName} replied to your post "${
            data.postTitle
          }": "${data.contentPreview?.substring(0, 50)}..."`,
        };

      case "reply_vote":
        return {
          title: "Your reply received a vote!",
          message: `${userName} ${
            data.voteType === "upvote" ? "upvoted" : "downvoted"
          } your reply`,
        };

      case "post_approved":
        return {
          title: "Post approved!",
          message: `Your post "${data.postTitle}" has been approved and is now visible to the community`,
        };

      case "mention":
        return {
          title: "You were mentioned",
          message: `${userName} mentioned you in a ${
            data.replyId ? "reply" : "post"
          }`,
        };

      case "post_reported":
        return {
          title: "Content reported",
          message: `Your post "${data.postTitle}" was reported for: ${data.reportReason}`,
        };

      case "moderation_decision_reporter":
        return {
          title: "Update on your report",
          message: `Post "${data.postTitle}" decision: ${
            data.decision
          }. Reason: ${data.justification || "No additional details"}`,
        };

      case "moderation_decision_owner":
        return {
          title: "Moderation decision on your post",
          message: `Your post "${data.postTitle}" was ${
            data.decision
          }. Reason: ${data.justification || "No additional details"}`,
        };

      default:
        return {
          title: "New notification",
          message: `You have a new notification from ${userName}`,
        };
    }
  }

  /**
   * Notify when someone votes on a post
   */
  async notifyPostVote(
    postId: string,
    voterUserId: number,
    voteType: "upvote" | "downvote"
  ): Promise<void> {
    try {
      const post = await DiscussionPost.findByPk(postId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id"],
          },
        ],
      });

      if (!post) return;

      const postData = post as any;
      const authorId = postData.author.id;

      // Don't notify if user voted on their own post
      if (authorId === voterUserId) return;

      await this.createNotification({
        recipientId: authorId,
        type: "post_vote",
        triggerUserId: voterUserId,
        data: {
          postId,
          postTitle: post.title,
          voteType,
        },
      });
    } catch (error) {
      console.error("Error notifying post vote:", error);
    }
  }

  /**
   * Notify when someone creates a reply
   */
  async notifyReplyCreated(
    replyId: string,
    authorUserId: number
  ): Promise<void> {
    try {
      const reply = await DiscussionReply.findByPk(replyId, {
        include: [
          {
            model: DiscussionPost,
            as: "post",
            include: [
              {
                model: User,
                as: "author",
                attributes: ["id"],
              },
            ],
          },
        ],
      });

      if (!reply) return;

      const replyData = reply as any;
      const postAuthorId = replyData.post.author.id;

      // Don't notify if user replied to their own post
      if (postAuthorId === authorUserId) return;

      await this.createNotification({
        recipientId: postAuthorId,
        type: "reply_created",
        triggerUserId: authorUserId,
        data: {
          postId: replyData.post.id,
          replyId,
          postTitle: replyData.post.title,
          contentPreview: reply.content,
        },
      });
    } catch (error) {
      console.error("Error notifying reply created:", error);
    }
  }

  /**
   * Notify when someone votes on a reply
   */
  async notifyReplyVote(
    replyId: string,
    voterUserId: number,
    voteType: "upvote" | "downvote"
  ): Promise<void> {
    try {
      const reply = await DiscussionReply.findByPk(replyId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id"],
          },
          {
            model: DiscussionPost,
            as: "post",
            attributes: ["id", "title"],
          },
        ],
      });

      if (!reply) return;

      const replyData = reply as any;
      const authorId = replyData.author.id;

      // Don't notify if user voted on their own reply
      if (authorId === voterUserId) return;

      await this.createNotification({
        recipientId: authorId,
        type: "reply_vote",
        triggerUserId: voterUserId,
        data: {
          postId: replyData.post.id,
          replyId,
          postTitle: replyData.post.title,
          voteType,
        },
      });
    } catch (error) {
      console.error("Error notifying reply vote:", error);
    }
  }

  /**
   * Notify when a post is approved by moderator
   */
  async notifyPostApproved(postId: string): Promise<void> {
    try {
      const post = await DiscussionPost.findByPk(postId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id"],
          },
        ],
      });

      if (!post) return;

      const postData = post as any;

      await this.createNotification({
        recipientId: postData.author.id,
        type: "post_approved",
        triggerUserId: 1, // System user ID
        data: {
          postId,
          postTitle: post.title,
        },
      });
    } catch (error) {
      console.error("Error notifying post approved:", error);
    }
  }

  /**
   * Notify when content is reported
   */
  async notifyContentReported(
    contentId: string,
    contentType: "post" | "reply",
    reportReason: string
  ): Promise<void> {
    try {
      let authorId: number;
      let postTitle: string;

      if (contentType === "post") {
        const post = await DiscussionPost.findByPk(contentId, {
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id"],
            },
          ],
        });

        if (!post) return;

        const postData = post as any;
        authorId = postData.author.id;
        postTitle = post.title;
      } else {
        const reply = await DiscussionReply.findByPk(contentId, {
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id"],
            },
            {
              model: DiscussionPost,
              as: "post",
              attributes: ["title"],
            },
          ],
        });

        if (!reply) return;

        const replyData = reply as any;
        authorId = replyData.author.id;
        postTitle = replyData.post.title;
      }

      await this.createNotification({
        recipientId: authorId,
        type: "post_reported",
        triggerUserId: 1, // System user ID
        data: {
          postId: contentType === "post" ? contentId : undefined,
          replyId: contentType === "reply" ? contentId : undefined,
          postTitle,
          reportReason,
        },
      });
    } catch (error) {
      console.error("Error notifying content reported:", error);
    }
  }

  /**
   * Get notification count for a user (for badges)
   */
  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      const count = await Notification.count({
        where: {
          user_id: userId,
          read: false,
        },
      });
      return count;
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      return 0;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.findAll({
          where: { user_id: userId },
          order: [["created_at", "DESC"]],
          limit,
          offset,
        }),
        Notification.count({ where: { user_id: userId } }),
        Notification.count({ where: { user_id: userId, read: false } }),
      ]);

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          read: n.read,
          createdAt: n.created_at.toISOString(),
        })),
        total,
        unreadCount,
      };
    } catch (error) {
      console.error("Error getting user notifications:", error);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(
    userId: number,
    notificationIds: string[]
  ): Promise<void> {
    try {
      await Notification.update(
        { read: true },
        {
          where: {
            user_id: userId,
            id: {
              [Op.in]: notificationIds,
            },
          },
        }
      );
      console.log(
        `Marked ${notificationIds.length} notifications as read for user ${userId}`
      );
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await Notification.update(
        { read: true },
        {
          where: {
            user_id: userId,
            read: false,
          },
        }
      );
      console.log(`Marked all notifications as read for user ${userId}`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  /**
   * Clear all notifications for a user (delete from database)
   */
  async clearAllNotifications(userId: number): Promise<void> {
    try {
      await Notification.destroy({
        where: {
          user_id: userId,
        },
      });
      console.log(`Cleared all notifications for user ${userId}`);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }

  /**
   * Save notification to database
   */
  private async saveNotificationToDatabase(
    notification: NotificationData
  ): Promise<void> {
    try {
      await Notification.create({
  id: notification.id, // already a UUID
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false,
      });
    } catch (error) {
      console.error("Error saving notification to database:", error);
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
