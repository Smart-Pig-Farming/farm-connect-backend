import { Router } from 'express';
import chatController from '../controllers/chatController';
import { authenticateWithCookies } from '../middleware/cookieAuth';
import { requireAnyPermission } from '../middleware/permissions';

const router = Router();

// Permission strings (for future use if needed)
const READ_BEST_PRACTICES = 'READ:BEST_PRACTICES';

// Optional auth wrapper - allows both authenticated and anonymous users
const optionalAuth = (req: any, _res: any, next: any) => {
  if (req.cookies?.accessToken || req.cookies?.refreshToken) {
    return authenticateWithCookies(req, _res, next);
  }
  return next();
};

/**
 * POST /api/chat/message
 * Send a message to the chat assistant
 * Body: { message: string, conversationHistory?: ChatMessage[], pageContext?: string, categories?: string[] }
 */
router.post(
  '/message',
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.sendMessage.bind(chatController)
);

/**
 * GET /api/chat/welcome
 * Get context-specific welcome message
 * Query: ?pageContext=string&categories=string (comma-separated)
 */
router.get(
  '/welcome',
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.getWelcomeMessage.bind(chatController)
);

/**
 * GET /api/chat/health
 * Check chat service health and configuration
 */
router.get(
  '/health',
  chatController.getHealth.bind(chatController)
);

/**
 * GET /api/chat/categories
 * Get available categories for context-specific chat
 */
router.get(
  '/categories',
  chatController.getCategories.bind(chatController)
);

/**
 * POST /api/chat/feedback
 * Submit feedback on chat responses
 * Body: { messageId: string, rating?: number, feedback?: string, helpful?: boolean }
 */
router.post(
  '/feedback',
  optionalAuth, // Allow both authenticated and anonymous users
  chatController.submitFeedback.bind(chatController)
);

export default router;
