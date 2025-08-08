import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import User from "../models/User";

// WebSocket event types
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;

  // Discussion events
  "post:create": (data: PostCreateData) => void;
  "post:update": (data: PostUpdateData) => void;
  "post:delete": (data: { postId: string }) => void;
  "post:vote": (data: PostVoteData) => void;

  // Reply events
  "reply:create": (data: ReplyCreateData) => void;
  "reply:update": (data: ReplyUpdateData) => void;
  "reply:delete": (data: { replyId: string; postId: string }) => void;
  "reply:vote": (data: ReplyVoteData) => void;

  // User activity events
  "user:online": (data: { userId: number; socketId: string }) => void;
  "user:offline": (data: { userId: number }) => void;
  "user:typing": (data: {
    userId: number;
    postId: string;
    isTyping: boolean;
  }) => void;

  // Notification events
  "notification:new": (data: NotificationData) => void;
  "notification:read": (data: { notificationId: string }) => void;

  // Moderation events
  "moderation:content_reported": (data: ContentReportData) => void;
  "moderation:content_approved": (data: {
    contentId: string;
    contentType: "post" | "reply";
  }) => void;
  "moderation:content_rejected": (data: {
    contentId: string;
    contentType: "post" | "reply";
  }) => void;
}

// Data interfaces
export interface PostCreateData {
  id: string;
  title: string;
  content: string;
  author: {
    id: number;
    firstname: string;
    lastname: string;
  };
  tags: string[];
  is_market_post: boolean;
  upvotes: number;
  downvotes: number;
  replies_count: number;
  created_at: string;
}

export interface PostUpdateData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_market_post: boolean;
  updated_at: string;
}

export interface PostVoteData {
  postId: string;
  userId: number;
  voteType: "upvote" | "downvote" | null;
  upvotes: number;
  downvotes: number;
}

export interface ReplyCreateData {
  id: string;
  content: string;
  postId: string;
  parentReplyId?: string;
  author: {
    id: number;
    firstname: string;
    lastname: string;
  };
  upvotes: number;
  downvotes: number;
  depth: number;
  created_at: string;
}

export interface ReplyUpdateData {
  id: string;
  content: string;
  postId: string;
  updated_at: string;
}

export interface ReplyVoteData {
  replyId: string;
  postId: string;
  userId: number;
  voteType: "upvote" | "downvote" | null;
  upvotes: number;
  downvotes: number;
}

export interface NotificationData {
  id: string;
  userId: number;
  type:
    | "post_vote"
    | "reply_created"
    | "reply_vote"
    | "post_approved"
    | "mention"
    | "post_reported";
  title: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
}

export interface ContentReportData {
  id: string;
  contentId: string;
  contentType: "post" | "reply";
  reason: string;
  details?: string;
  reporterId: number;
  created_at: string;
}

// Connected users tracking
const connectedUsers = new Map<number, Set<string>>(); // userId -> Set of socketIds
const socketToUser = new Map<string, number>(); // socketId -> userId
const typingUsers = new Map<string, Set<number>>(); // postId -> Set of typing userIds

export class WebSocketService {
  private io: Server;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          throw new Error("No authentication token provided");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: number;
        };
        const user = await User.findByPk(decoded.userId, {
          attributes: ["id", "firstname", "lastname", "email"],
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Attach user to socket
        socket.data.user = user;
        next();
      } catch (error) {
        console.error("WebSocket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const user = socket.data.user;
      console.log(
        `✅ User ${user.firstname} ${user.lastname} (${user.id}) connected via WebSocket`
      );

      // Track connected user
      this.addConnectedUser(user.id, socket.id);

      // Broadcast user online status
      this.broadcastUserOnline(user.id, socket.id);

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(
          `❌ User ${user.firstname} ${user.lastname} (${user.id}) disconnected: ${reason}`
        );
        this.removeConnectedUser(user.id, socket.id);
        this.broadcastUserOffline(user.id);
      });

      // Handle typing indicators
      socket.on("typing:start", (data: { postId: string }) => {
        this.handleTypingStart(user.id, data.postId, socket);
      });

      socket.on("typing:stop", (data: { postId: string }) => {
        this.handleTypingStop(user.id, data.postId, socket);
      });

      // Handle joining/leaving discussion rooms
      socket.on("discussion:join", (data: { postId: string }) => {
        socket.join(`post:${data.postId}`);
        console.log(`👀 User ${user.id} joined discussion ${data.postId}`);
      });

      socket.on("discussion:leave", (data: { postId: string }) => {
        socket.leave(`post:${data.postId}`);
        console.log(`👋 User ${user.id} left discussion ${data.postId}`);
      });

      // Handle real-time voting
      socket.on(
        "vote:cast",
        (data: {
          contentId: string;
          contentType: "post" | "reply";
          voteType: "upvote" | "downvote" | null;
        }) => {
          // This will be handled by the HTTP API, but we can acknowledge receipt
          socket.emit("vote:acknowledged", { contentId: data.contentId });
        }
      );
    });
  }

  // User connection management
  private addConnectedUser(userId: number, socketId: string) {
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socketId);
    socketToUser.set(socketId, userId);
  }

  private removeConnectedUser(userId: number, socketId: string) {
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        connectedUsers.delete(userId);
      }
    }
    socketToUser.delete(socketId);
  }

  // Typing indicators
  private handleTypingStart(userId: number, postId: string, socket: any) {
    if (!typingUsers.has(postId)) {
      typingUsers.set(postId, new Set());
    }
    typingUsers.get(postId)!.add(userId);

    // Broadcast to others in the discussion room
    socket.to(`post:${postId}`).emit("user:typing", {
      userId,
      postId,
      isTyping: true,
    });
  }

  private handleTypingStop(userId: number, postId: string, socket: any) {
    const postTypingUsers = typingUsers.get(postId);
    if (postTypingUsers) {
      postTypingUsers.delete(userId);
      if (postTypingUsers.size === 0) {
        typingUsers.delete(postId);
      }
    }

    // Broadcast to others in the discussion room
    socket.to(`post:${postId}`).emit("user:typing", {
      userId,
      postId,
      isTyping: false,
    });
  }

  // Broadcasting methods
  private broadcastUserOnline(userId: number, socketId: string) {
    this.io.emit("user:online", { userId, socketId });
  }

  private broadcastUserOffline(userId: number) {
    // Only broadcast if user has no more connections
    if (!connectedUsers.has(userId)) {
      this.io.emit("user:offline", { userId });
    }
  }

  // Public methods for broadcasting events from API routes
  public broadcastPostCreate(data: PostCreateData) {
    console.log("📡 Broadcasting new post creation:", data.id);
    this.io.emit("post:create", data);
  }

  public broadcastPostUpdate(data: PostUpdateData) {
    console.log("📡 Broadcasting post update:", data.id);
    this.io.emit("post:update", data);
  }

  public broadcastPostDelete(postId: string) {
    console.log("📡 Broadcasting post deletion:", postId);
    this.io.emit("post:delete", { postId });
  }

  public broadcastPostVote(data: PostVoteData) {
    console.log("📡 Broadcasting post vote:", data.postId, data.voteType);
    this.io.emit("post:vote", data);
    // Also broadcast to specific discussion room
    this.io.to(`post:${data.postId}`).emit("post:vote", data);
  }

  public broadcastReplyCreate(data: ReplyCreateData) {
    console.log("📡 Broadcasting new reply:", data.id, "to post", data.postId);
    this.io.emit("reply:create", data);
    // Broadcast to specific discussion room
    this.io.to(`post:${data.postId}`).emit("reply:create", data);
  }

  public broadcastReplyUpdate(data: ReplyUpdateData) {
    console.log("📡 Broadcasting reply update:", data.id);
    this.io.emit("reply:update", data);
    this.io.to(`post:${data.postId}`).emit("reply:update", data);
  }

  public broadcastReplyDelete(replyId: string, postId: string) {
    console.log("📡 Broadcasting reply deletion:", replyId);
    this.io.emit("reply:delete", { replyId, postId });
    this.io.to(`post:${postId}`).emit("reply:delete", { replyId, postId });
  }

  public broadcastReplyVote(data: ReplyVoteData) {
    console.log("📡 Broadcasting reply vote:", data.replyId, data.voteType);
    this.io.emit("reply:vote", data);
    this.io.to(`post:${data.postId}`).emit("reply:vote", data);
  }

  public sendNotificationToUser(
    userId: number,
    notification: NotificationData
  ) {
    const userSockets = connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit("notification:new", notification);
      });
      console.log(
        "📬 Notification sent to user",
        userId,
        ":",
        notification.title
      );
    }
  }

  public broadcastContentReport(data: ContentReportData) {
    console.log("🚨 Broadcasting content report:", data.id);
    // Send to moderators only (you'd need to track moderator sockets)
    this.io.emit("moderation:content_reported", data);
  }

  public broadcastContentModeration(
    contentId: string,
    contentType: "post" | "reply",
    action: "approved" | "rejected"
  ) {
    console.log("⚖️ Broadcasting content moderation:", contentId, action);
    this.io.emit(`moderation:content_${action}`, { contentId, contentType });
  }

  // Utility methods
  public getConnectedUsers(): number[] {
    return Array.from(connectedUsers.keys());
  }

  public isUserOnline(userId: number): boolean {
    return connectedUsers.has(userId);
  }

  public getUserSocketCount(userId: number): number {
    return connectedUsers.get(userId)?.size || 0;
  }

  public getTypingUsers(postId: string): number[] {
    return Array.from(typingUsers.get(postId) || []);
  }

  // Get the Socket.IO instance for advanced operations
  public getIO(): Server {
    return this.io;
  }
}

// Export singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (
  httpServer: HttpServer
): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
    console.log("🌐 WebSocket service initialized");
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error(
      "WebSocket service not initialized. Call initializeWebSocket first."
    );
  }
  return webSocketService;
};

export default WebSocketService;
