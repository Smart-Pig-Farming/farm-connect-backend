import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import * as jwt from "jsonwebtoken";
import User from "../models/User";
import { fromScaled } from "./scoring/ScoreTypes";
import ScoreEvent from "../models/ScoreEvent";

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
  "moderation:decision": (data: ModerationDecisionEvent) => void;
  // Scoring (unified batch) events
  "score:events": (data: { events: ScoreEventWs[] }) => void;
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
  // Availability and moderation status
  is_available: boolean;
  is_approved: boolean;
  upvotes: number;
  downvotes: number;
  replies_count: number;
  // Author scoring snapshot (optional)
  author_points?: number;
  author_level?: number;
  author_points_delta?: number; // usually 2 for creation
  // Minimal media info for clients to render without refetching
  media?: Array<{
    id: string | number;
    media_type: "image" | "video";
    url: string;
    thumbnail_url?: string;
    display_order?: number;
  }>;
  created_at: string;
}

export interface PostUpdateData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_market_post: boolean;
  // Optional fields that may change during moderation or edits
  is_available?: boolean;
  is_approved?: boolean;
  media?: Array<{
    id: string | number;
    media_type: "image" | "video";
    url: string;
    thumbnail_url?: string;
    display_order?: number;
  }>;
  updated_at: string;
}

export interface PostVoteData {
  postId: string;
  userId: number;
  voteType: "upvote" | "downvote" | null;
  upvotes: number;
  downvotes: number;
  // Enriched scoring fields
  previous_vote?: "upvote" | "downvote" | null;
  is_switch?: boolean;
  author_points?: number;
  author_points_delta?: number;
  author_level?: number;
  actor_points?: number;
  actor_points_delta?: number;
  // Alias used by some frontend handlers; kept for backward compatibility
  userVote?: "upvote" | "downvote" | null;
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
  previous_vote?: "upvote" | "downvote" | null;
  is_switch?: boolean;
  reply_author_points?: number;
  reply_author_points_delta?: number;
  actor_points?: number;
  actor_points_delta?: number;
  trickle?: Array<{ userId: number; delta: number }>;
  reply_classification?: "supportive" | "contradictory" | null;
  trickle_roles?: {
    parent?: { userId: number; delta: number };
    grandparent?: { userId: number; delta: number };
    root?: { userId: number; delta: number };
  };
  userVote?: "upvote" | "downvote" | null;
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
    | "post_reported"
    | "moderation_decision_reporter"
    | "moderation_decision_owner";
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

export interface ModerationDecisionEvent {
  postId: string;
  decision: "retained" | "deleted" | "warned";
  justification: string;
  moderatorId: number;
  decidedAt: string;
  reportCount: number;
}

// Unified scoring event (broadcast shape – unscaled deltas & totals)
export interface ScoreEventWs {
  id: string;
  userId: number;
  actorUserId?: number | null;
  type: string; // ScoreEventType
  refType?: string | null;
  refId?: string | null;
  delta: number; // unscaled delta
  totalPoints?: number; // unscaled running total for that user after applying this event batch
  meta?: any;
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
        origin:
          process.env.FRONTEND_URL ||
          process.env.CLIENT_URL ||
          "http://localhost:5173",
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
        // Prefer explicit token in auth, then Authorization header, then accessToken cookie
        let token =
          (socket.handshake.auth && (socket.handshake.auth as any).token) ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          const cookieHeader = socket.handshake.headers.cookie || "";
          const cookies = Object.fromEntries(
            cookieHeader
              .split(/;\s*/)
              .filter(Boolean)
              .map((c) => {
                const idx = c.indexOf("=");
                const k = decodeURIComponent(c.slice(0, idx));
                const v = decodeURIComponent(c.slice(idx + 1));
                return [k, v];
              })
          );
          token = cookies["accessToken"]; // httpOnly cookies aren't accessible in browser JS; this works for server-initiated connections
        }

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
    // Emit only to room to avoid double delivery (clients listening both globally and in-room produced duplicates)
    this.io
      .to(`post:${data.postId}`)
      .emit("reply:create", { ...data, scope: "room" });
  }

  public broadcastReplyUpdate(data: ReplyUpdateData) {
    console.log("📡 Broadcasting reply update:", data.id);
    this.io
      .to(`post:${data.postId}`)
      .emit("reply:update", { ...data, scope: "room" });
  }

  public broadcastReplyDelete(replyId: string, postId: string) {
    console.log("📡 Broadcasting reply deletion:", replyId);
    this.io
      .to(`post:${postId}`)
      .emit("reply:delete", { replyId, postId, scope: "room" });
  }

  public broadcastReplyVote(data: ReplyVoteData) {
    console.log("📡 Broadcasting reply vote:", data.replyId, data.voteType);
    this.io
      .to(`post:${data.postId}`)
      .emit("reply:vote", { ...data, scope: "room" });
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

  public broadcastModerationDecision(data: ModerationDecisionEvent) {
    console.log(
      "📡 Broadcasting moderation decision:",
      data.postId,
      data.decision
    );
    this.io.emit("moderation:decision", data);
  }

  /**
   * Broadcast a batch of score events produced by a single logical scoring action.
   * The caller supplies the raw ScoreEvent instances and the updated totals (scaled).
   */
  public broadcastScoreEvents(batch: {
    events: ScoreEvent[];
    totals: { userId: number; totalPoints: number }[];
  }) {
    if (!batch?.events?.length) return;
    try {
      const totalMap = new Map<number, number>();
      batch.totals.forEach((t) => {
        totalMap.set(t.userId, fromScaled(t.totalPoints));
      });
      const out: ScoreEventWs[] = batch.events.map((ev) => {
        const createdAt: any = (ev as any).created_at || (ev as any).createdAt;
        return {
          id: ev.id,
          userId: (ev as any).user_id,
          actorUserId: (ev as any).actor_user_id ?? null,
          type: (ev as any).event_type,
          refType: (ev as any).ref_type ?? null,
          refId: (ev as any).ref_id ?? null,
          delta: fromScaled((ev as any).delta),
          totalPoints: totalMap.get((ev as any).user_id),
          meta: (ev as any).meta || null,
          created_at: createdAt
            ? new Date(createdAt).toISOString()
            : new Date().toISOString(),
        };
      });
      console.log("📡 Broadcasting score events batch (count=)", out.length);
      this.io.emit("score:events", { events: out });
    } catch (e) {
      console.error("[ws] failed to broadcast score events", e);
    }
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
