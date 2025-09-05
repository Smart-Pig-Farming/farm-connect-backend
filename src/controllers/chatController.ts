import { Request, Response } from "express";
import chatService, { ChatRequest } from "../services/chat/ChatService";

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; permissions: string[] };
}

interface ChatMessageRequest {
  message: string;
  conversationHistory?: Array<{
    id: string;
    text: string;
    isUser: boolean;
    timestamp: string;
  }>;
  pageContext?: string;
  categories?: string[];
}

interface WelcomeRequest {
  pageContext?: string;
  categories?: string[];
}

class ChatController {
  /**
   * POST /api/chat/message
   * Process a user message and return AI response
   */
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const {
        message,
        conversationHistory = [],
        pageContext,
        categories: requestCategories,
      }: ChatMessageRequest = req.body;

      // Validate message
      const validation = chatService.validateMessage(message);
      if (!validation.isValid) {
        return res.status(400).json({
          error: validation.error,
          success: false,
        });
      }

      // Extract categories from page context if not provided
      const categories =
        requestCategories ||
        chatService.extractCategoriesFromContext(pageContext);

      // Convert conversation history to proper format
      const formattedHistory = conversationHistory.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      // Build chat request
      const chatRequest: ChatRequest = {
        message,
        conversationHistory: formattedHistory,
        userId: req.user?.id,
        categories: categories.length > 0 ? categories : undefined,
      };

      // Process message
      const response = await chatService.processMessage(chatRequest);

      return res.json(response);
    } catch (error) {
      console.error("Chat Controller - Send Message Error:", error);
      return res.status(500).json({
        error: "Failed to process message",
        success: false,
      });
    }
  }

  /**
   * GET /api/chat/welcome
   * Get welcome message with context-specific information
   */
  async getWelcomeMessage(req: AuthRequest, res: Response) {
    try {
      const { pageContext, categories: queryCategories } =
        req.query as Partial<WelcomeRequest>;

      // Extract categories from page context or query
      let categories: string[] = [];
      if (queryCategories) {
        // Handle categories passed as comma-separated string or array
        categories = Array.isArray(queryCategories)
          ? queryCategories
          : (queryCategories as string)
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean);
      } else if (pageContext) {
        categories = chatService.extractCategoriesFromContext(pageContext);
      }

      const welcomeMessage = await chatService.getWelcomeMessage(
        categories.length > 0 ? categories : undefined
      );

      return res.json({
        message: welcomeMessage,
        success: true,
      });
    } catch (error) {
      console.error("Chat Controller - Welcome Message Error:", error);

      // Return a basic welcome message as fallback
      const fallbackMessage = {
        id: "welcome",
        text: "Hello! I'm here to help you with farming and agricultural best practices. What would you like to know?",
        isUser: false,
        timestamp: new Date(),
      };

      return res.json({
        message: fallbackMessage,
        success: true,
      });
    }
  }

  /**
   * GET /api/chat/health
   * Check if chat service is properly configured and healthy
   */
  async getHealth(req: AuthRequest, res: Response) {
    try {
      const isGeminiConfigured =
        require("../services/gemini/GeminiService").default.isConfigured();

      const health = {
        status: "healthy",
        services: {
          gemini: isGeminiConfigured ? "configured" : "not_configured",
          rag: "available",
          database: "connected",
        },
        features: {
          chatbot: isGeminiConfigured,
          contextualSearch: true,
          bestPracticesIntegration: true,
        },
        timestamp: new Date(),
      };

      return res.json(health);
    } catch (error) {
      console.error("Chat Controller - Health Check Error:", error);
      return res.status(500).json({
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date(),
      });
    }
  }

  /**
   * GET /api/chat/categories
   * Get available categories for context-specific chat
   */
  async getCategories(req: AuthRequest, res: Response) {
    try {
      const categories = [
        {
          key: "feeding_nutrition",
          label: "Feeding & Nutrition",
          description: "Feed types, nutrition requirements, feeding schedules",
        },
        {
          key: "disease_control",
          label: "Disease Control",
          description: "Disease prevention, treatment, health monitoring",
        },
        {
          key: "growth_weight",
          label: "Growth & Weight Management",
          description: "Growth tracking, weight optimization, performance",
        },
        {
          key: "environment_management",
          label: "Environment Management",
          description: "Housing, temperature, ventilation, cleanliness",
        },
        {
          key: "breeding_insemination",
          label: "Breeding & Insemination",
          description: "Breeding practices, artificial insemination, genetics",
        },
        {
          key: "farrowing_management",
          label: "Farrowing Management",
          description: "Birth process, newborn care, sow management",
        },
        {
          key: "record_management",
          label: "Record & Farm Management",
          description: "Record keeping, farm planning, operational management",
        },
        {
          key: "marketing_finance",
          label: "Marketing & Finance",
          description: "Market analysis, pricing, financial planning",
        },
      ];

      return res.json({
        categories,
        total: categories.length,
        success: true,
      });
    } catch (error) {
      console.error("Chat Controller - Get Categories Error:", error);
      return res.status(500).json({
        error: "Failed to get categories",
        success: false,
      });
    }
  }

  /**
   * POST /api/chat/feedback
   * Collect user feedback on chat responses (for future improvements)
   */
  async submitFeedback(req: AuthRequest, res: Response) {
    try {
      const { messageId, rating, feedback, helpful } = req.body;

      // For now, just log the feedback
      // In a production system, you'd want to store this in a database
      console.log("Chat Feedback Received:", {
        messageId,
        rating,
        feedback,
        helpful,
        userId: req.user?.id,
        timestamp: new Date(),
      });

      return res.json({
        message: "Feedback received successfully",
        success: true,
      });
    } catch (error) {
      console.error("Chat Controller - Submit Feedback Error:", error);
      return res.status(500).json({
        error: "Failed to submit feedback",
        success: false,
      });
    }
  }
}

export default new ChatController();
