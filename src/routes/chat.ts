/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, assistant]
 *           example: "user"
 *         content:
 *           type: string
 *           example: "What's the best way to prevent pig diseases?"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:30:00Z"
 *     SendChatMessage:
 *       type: object
 *       required: [message]
 *       properties:
 *         message:
 *           type: string
 *           minLength: 1
 *           maxLength: 2000
 *           example: "What are the best feeding practices for pregnant sows?"
 *         conversationHistory:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChatMessage'
 *           maxItems: 20
 *           description: "Previous conversation context (optional, max 20 messages)"
 *         pageContext:
 *           type: string
 *           example: "best-practices"
 *           description: "Current page context for better responses"
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["feeding", "health"]
 *           description: "Relevant categories to focus the response"
 *     ChatResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "For pregnant sows, it's important to provide high-quality feed with adequate protein..."
 *             context:
 *               type: string
 *               example: "feeding"
 *             relatedTopics:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["sow nutrition", "pregnancy care", "feeding schedule"]
 *             responseTime:
 *               type: number
 *               example: 1.2
 *               description: "Response time in seconds"
 */

import { Router } from "express";
import chatController from "../controllers/chatController";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { requireAnyPermission } from "../middleware/permissions";

const router = Router();

// Permission strings (for future use if needed)
const READ_BEST_PRACTICES = "READ:BEST_PRACTICES";

// Optional auth wrapper - allows both authenticated and anonymous users
const optionalAuth = (req: any, _res: any, next: any) => {
  if (req.cookies?.accessToken || req.cookies?.refreshToken) {
    return authenticateWithCookies(req, _res, next);
  }
  return next();
};

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message to the AI chat assistant
 *     description: |
 *       Send a message to the AI-powered farming assistant. The assistant provides
 *       expert advice on pig farming based on the knowledge base of best practices.
 *
 *       **Features:**
 *       - Context-aware responses based on page context
 *       - Conversation history support (up to 20 messages)
 *       - Category-specific responses
 *       - Available to both authenticated and anonymous users
 *       - Personalized responses for authenticated users
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendChatMessage'
 *     responses:
 *       200:
 *         description: Chat response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Invalid message or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emptyMessage:
 *                 value:
 *                   success: false
 *                   error: "Message cannot be empty"
 *                   code: "INVALID_MESSAGE"
 *               messageTooLong:
 *                 value:
 *                   success: false
 *                   error: "Message too long (max 2000 characters)"
 *                   code: "MESSAGE_TOO_LONG"
 *       500:
 *         description: AI service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serviceError:
 *                 value:
 *                   success: false
 *                   error: "Chat service temporarily unavailable"
 *                   code: "CHAT_SERVICE_ERROR"
 */
router.post(
  "/message",
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.sendMessage.bind(chatController)
);

/**
 * @swagger
 * /api/chat/welcome:
 *   get:
 *     summary: Get context-specific welcome message
 *     description: |
 *       Get a personalized welcome message from the AI assistant based on the current
 *       page context and selected categories. Useful for onboarding users to the chat feature.
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: pageContext
 *         schema:
 *           type: string
 *           enum: [home, best-practices, discussions, marketplace, dashboard]
 *         description: Current page context
 *         example: "best-practices"
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of relevant categories
 *         example: "feeding,health"
 *     responses:
 *       200:
 *         description: Welcome message generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Hello! I'm your farming assistant. I can help you with pig feeding and health questions. What would you like to know?"
 *                     suggestedQuestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["What's the best feeding schedule for growing pigs?", "How can I prevent common pig diseases?", "What are signs of healthy pigs?"]
 */
router.get(
  "/welcome",
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.getWelcomeMessage.bind(chatController)
);

/**
 * @swagger
 * /api/chat/health:
 *   get:
 *     summary: Check chat service health
 *     description: Check the health and configuration status of the AI chat service
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Chat service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unavailable]
 *                       example: "healthy"
 *                     provider:
 *                       type: string
 *                       example: "gemini"
 *                     features:
 *                       type: object
 *                       properties:
 *                         contextAware:
 *                           type: boolean
 *                         conversationHistory:
 *                           type: boolean
 *                         ragEnabled:
 *                           type: boolean
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 */
router.get("/health", chatController.getHealth.bind(chatController));

/**
 * @swagger
 * /api/chat/categories:
 *   get:
 *     summary: Get available chat categories
 *     description: Get the list of available categories that can be used for context-specific chat responses
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Available categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "feeding"
 *                       name:
 *                         type: string
 *                         example: "Pig Feeding"
 *                       description:
 *                         type: string
 *                         example: "Questions about pig nutrition and feeding practices"
 *                       icon:
 *                         type: string
 *                         example: "🐷"
 */
router.get("/categories", chatController.getCategories.bind(chatController));

/**
 * @swagger
 * /api/chat/feedback:
 *   post:
 *     summary: Submit feedback on chat responses
 *     description: |
 *       Submit feedback on the quality and helpfulness of chat assistant responses.
 *       This helps improve the AI model's performance over time.
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messageId]
 *             properties:
 *               messageId:
 *                 type: string
 *                 example: "msg_123456789"
 *                 description: "Unique identifier for the message being rated"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: "Rating from 1 (poor) to 5 (excellent)"
 *               feedback:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Very helpful response, but could use more specific examples"
 *                 description: "Optional written feedback"
 *               helpful:
 *                 type: boolean
 *                 example: true
 *                 description: "Whether the response was helpful (thumbs up/down)"
 *               category:
 *                 type: string
 *                 enum: [accuracy, relevance, completeness, clarity, tone]
 *                 example: "accuracy"
 *                 description: "Category of feedback"
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Thank you for your feedback!"
 *       400:
 *         description: Invalid feedback data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/feedback",
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.submitFeedback.bind(chatController)
);

export default router;
