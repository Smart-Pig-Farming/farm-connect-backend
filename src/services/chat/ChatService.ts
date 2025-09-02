import geminiService, { GeminiMessage } from "../gemini/GeminiService";
import ragService, { RAGContext } from "../rag/RAGService";

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  context?: {
    sources: Array<{
      id: number;
      title: string;
      description: string;
      categories: string[];
      relevanceScore: number;
      readCount?: number;
    }>;
    totalSources: number;
  };
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  userId?: number;
  categories?: string[];
}

export interface ChatResponse {
  message: ChatMessage;
  success: boolean;
  error?: string;
}

class ChatService {
  private readonly MAX_HISTORY = 10; // Limit conversation history to prevent token overflow
  private readonly MAX_CONTEXT_SOURCES = 5;
  private readonly MIN_RELEVANCE_THRESHOLD = 0.5; // Minimum relevance score for context inclusion

  /**
   * Process a user message and generate a response using RAG + Gemini
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      if (!geminiService.isConfigured()) {
        return {
          message: this.createErrorMessage(
            "AI service is not properly configured. Please contact support."
          ),
          success: false,
          error: "GEMINI_NOT_CONFIGURED",
        };
      }

      const { message, conversationHistory = [], categories } = request;

      // Validate and sanitize input
      if (!message?.trim()) {
        return {
          message: this.createErrorMessage("Please provide a valid message."),
          success: false,
          error: "INVALID_INPUT",
        };
      }

      const sanitizedMessage = message.trim().substring(0, 1000); // Limit message length

      // Extract topics and get relevant context with enhanced strategy
      const topics = ragService.extractTopics(sanitizedMessage);
      const searchCategories = categories || topics.categories;

      console.log(
        `[RAG] Query analysis: ${topics.keywords.length} keywords, ${searchCategories.length} categories`
      );

      let ragContext: RAGContext;

      // Enhanced search strategy - try multiple approaches and combine results
      if (topics.keywords.length > 0) {
        // Primary: Search based on user query with enhanced matching
        ragContext = await ragService.searchRelevantContent(
          sanitizedMessage,
          this.MAX_CONTEXT_SOURCES,
          searchCategories.length > 0 ? searchCategories : undefined
        );

        // If we didn't get enough high-quality results, supplement with category search
        if (ragContext.results.length < 3 && searchCategories.length > 0) {
          const categoryContext = await ragService.getContentByCategory(
            searchCategories,
            this.MAX_CONTEXT_SOURCES - ragContext.results.length
          );

          // Merge results, avoiding duplicates
          const existingIds = new Set(ragContext.results.map((r) => r.id));
          const newResults = categoryContext.results.filter(
            (r) => !existingIds.has(r.id)
          );

          ragContext.results.push(...newResults);
          ragContext.contextText.push(...categoryContext.contextText);
          ragContext.totalResults += categoryContext.totalResults;

          console.log(
            `[RAG] Enhanced with ${newResults.length} category results`
          );
        }
      } else if (searchCategories.length > 0) {
        // Category-based search if no clear keywords
        ragContext = await ragService.getContentByCategory(
          searchCategories,
          this.MAX_CONTEXT_SOURCES
        );
      } else {
        // General context as fallback
        ragContext = await ragService.getGeneralContext(
          this.MAX_CONTEXT_SOURCES
        );
      }

      // Filter results by relevance threshold
      const filteredResults = ragContext.results.filter(
        (result) => result.relevanceScore >= this.MIN_RELEVANCE_THRESHOLD
      );

      console.log(
        `[RAG] Found ${ragContext.results.length} results, ${filteredResults.length} above threshold`
      );

      // Update context with filtered results
      ragContext.results = filteredResults;
      ragContext.contextText = filteredResults
        .map(
          (result) => ragContext.contextText[ragContext.results.indexOf(result)]
        )
        .filter(Boolean);

      // Build conversation for Gemini
      const geminiMessages = this.buildGeminiConversation(
        sanitizedMessage,
        conversationHistory
      );

      // Create system prompt with context
      const systemPrompt = geminiService.createSystemPrompt(
        ragContext.contextText
      );

      // Generate response
      const aiResponse = await geminiService.generateResponse(
        geminiMessages,
        systemPrompt
      );

      // Create response message with context
      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        context: {
          sources: ragContext.results.map((result) => ({
            id: result.id,
            title: result.title,
            description: result.description,
            categories: result.categories,
            relevanceScore: result.relevanceScore,
            readCount: (result as any).readCount,
          })),
          totalSources: ragContext.totalResults,
        },
      };

      const processingTime = Date.now() - startTime;
      console.log(`[ChatService] Request processed in ${processingTime}ms`);

      return {
        message: responseMessage,
        success: true,
      };
    } catch (error) {
      console.error("Chat Service Error:", error);

      let errorMessage =
        "I apologize, but I encountered an error while processing your message. Please try again.";
      let errorCode = "UNKNOWN_ERROR";

      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          errorMessage =
            "I'm currently experiencing high demand. Please wait a moment and try again.";
          errorCode = "RATE_LIMIT";
        } else if (error.message.includes("authentication")) {
          errorMessage =
            "There's an issue with the AI service configuration. Please contact support.";
          errorCode = "AUTH_ERROR";
        }
      }

      return {
        message: this.createErrorMessage(errorMessage),
        success: false,
        error: errorCode,
      };
    }
  }

  /**
   * Get initial greeting message with general farming context
   */
  async getWelcomeMessage(categories?: string[]): Promise<ChatMessage> {
    try {
      let ragContext: RAGContext;

      if (categories && categories.length > 0) {
        ragContext = await ragService.getContentByCategory(categories, 3);
      } else {
        ragContext = await ragService.getGeneralContext(3);
      }

      const topics = ragContext.results.map((r) => r.title).slice(0, 3);
      const welcomeText = this.buildWelcomeMessage(topics);

      return {
        id: "welcome",
        text: welcomeText,
        isUser: false,
        timestamp: new Date(),
        context: {
          sources: ragContext.results.map((result) => ({
            id: result.id,
            title: result.title,
            description: result.description,
            categories: result.categories,
            relevanceScore: result.relevanceScore,
            readCount: (result as any).readCount,
          })),
          totalSources: ragContext.totalResults,
        },
      };
    } catch (error) {
      console.error("Welcome Message Error:", error);
      return {
        id: "welcome",
        text: "Hello! I'm here to help you with farming and agricultural best practices. What would you like to know?",
        isUser: false,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Build conversation history for Gemini API
   */
  private buildGeminiConversation(
    currentMessage: string,
    history: ChatMessage[]
  ): GeminiMessage[] {
    const messages: GeminiMessage[] = [];

    // Add recent conversation history (excluding system messages)
    const recentHistory = history
      .filter((msg) => msg.id !== "welcome")
      .slice(-this.MAX_HISTORY);

    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.isUser ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    });

    // Add current user message
    messages.push({
      role: "user",
      parts: [{ text: currentMessage }],
    });

    return messages;
  }

  /**
   * Create error message
   */
  private createErrorMessage(text: string): ChatMessage {
    return {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };
  }

  /**
   * Build welcome message with available topics
   */
  private buildWelcomeMessage(topics: string[]): string {
    const baseMessage =
      "Hello! I'm here to help you with farming and agricultural best practices.";

    if (topics.length === 0) {
      return `${baseMessage} What would you like to know?`;
    }

    const topicList = topics
      .map((topic, index) => `${index + 1}. ${topic}`)
      .join("\n");

    return `${baseMessage} Here are some topics I can help you with:

${topicList}

Feel free to ask me about any aspect of farming and agriculture, or choose from the topics above!`;
  }

  /**
   * Validate and sanitize user input
   */
  validateMessage(message: string): { isValid: boolean; error?: string } {
    if (!message || typeof message !== "string") {
      return { isValid: false, error: "Message is required" };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: "Message cannot be empty" };
    }

    if (trimmed.length > 1000) {
      return {
        isValid: false,
        error: "Message is too long (max 1000 characters)",
      };
    }

    return { isValid: true };
  }

  /**
   * Extract categories from user context (useful for page-specific chat)
   */
  extractCategoriesFromContext(pageContext?: string): string[] {
    if (!pageContext) return [];

    const categoryMap: { [key: string]: string } = {
      feeding: "feeding_nutrition",
      nutrition: "feeding_nutrition",
      disease: "disease_control",
      health: "disease_control",
      growth: "growth_weight",
      weight: "growth_weight",
      environment: "environment_management",
      housing: "environment_management",
      breeding: "breeding_insemination",
      reproduction: "breeding_insemination",
      farrowing: "farrowing_management",
      birth: "farrowing_management",
      management: "record_management",
      records: "record_management",
      finance: "marketing_finance",
      marketing: "marketing_finance",
    };

    const normalizedContext = pageContext.toLowerCase();
    const categories: string[] = [];

    Object.entries(categoryMap).forEach(([keyword, category]) => {
      if (
        normalizedContext.includes(keyword) &&
        !categories.includes(category)
      ) {
        categories.push(category);
      }
    });

    return categories;
  }
}

export default new ChatService();
