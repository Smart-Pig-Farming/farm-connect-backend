import { Op } from "sequelize";
import BestPracticeContent from "../../models/BestPracticeContent";
import { BestPracticeContentAttributes } from "../../models/BestPracticeContent";

export interface RAGSearchResult {
  id: number;
  title: string;
  description: string;
  steps: Array<{ text: string; order?: number } | string>;
  benefits: string[];
  categories: string[];
  relevanceScore: number;
  content: string; // Combined content for context
  readCount?: number;
  createdAt?: Date;
}

export interface RAGContext {
  results: RAGSearchResult[];
  contextText: string[];
  totalResults: number;
}

class RAGService {
  /**
   * Search for relevant best practices based on user query
   * Uses enhanced text matching with improved relevance scoring
   */
  async searchRelevantContent(
    query: string,
    limit: number = 5,
    categories?: string[]
  ): Promise<RAGContext> {
    try {
      // Preprocess the query for better matching
      const processedQuery = this.preprocessQuery(query);
      const normalizedQuery = processedQuery.cleanedQuery;
      const queryWords = processedQuery.keywords;
      const phrases = processedQuery.phrases;

      // Build search conditions
      const searchConditions: any = {
        is_published: true,
        is_deleted: false,
      };

      // Add category filter if provided
      if (categories && categories.length > 0) {
        searchConditions.categories = {
          [Op.overlap]: categories,
        };
      }

      // Enhanced search conditions with phrase and keyword matching
      const searchQueries: any[] = [];

      // Search for exact phrases first (if any)
      if (phrases.length > 0) {
        phrases.forEach((phrase: string) => {
          searchQueries.push({
            [Op.or]: [
              { title: { [Op.iLike]: `%${phrase}%` } },
              { description: { [Op.iLike]: `%${phrase}%` } },
              // Use raw SQL for JSONB search
              BestPracticeContent.sequelize!.literal(
                `LOWER(steps_json::text) LIKE LOWER('%${phrase}%')`
              ),
              BestPracticeContent.sequelize!.literal(
                `LOWER(benefits_json::text) LIKE LOWER('%${phrase}%')`
              ),
            ]
          });
        });
      }

      // Search for individual keywords
      if (queryWords.length > 0) {
        queryWords.forEach((word: string) => {
          searchQueries.push({
            [Op.or]: [
              { title: { [Op.iLike]: `%${word}%` } },
              { description: { [Op.iLike]: `%${word}%` } },
              // Use raw SQL for JSONB search with escaped content
              BestPracticeContent.sequelize!.literal(
                `LOWER(steps_json::text) LIKE LOWER('%${word.replace(/'/g, "''")}%')`
              ),
              BestPracticeContent.sequelize!.literal(
                `LOWER(benefits_json::text) LIKE LOWER('%${word.replace(/'/g, "''")}%')`
              ),
            ]
          });
        });
      }

      // Use OR logic - at least one search term should match
      const whereCondition = {
        ...searchConditions,
        [Op.or]: searchQueries.length > 0 ? searchQueries : [
          { title: { [Op.iLike]: `%${normalizedQuery}%` } }
        ],
      };

      // Get more results than needed to allow for better scoring and filtering
      const bestPractices = await BestPracticeContent.findAll({
        where: whereCondition,
        limit: limit * 3, // Get more to allow for scoring
        order: [["created_at", "DESC"]],
      });

      // Score and rank results with enhanced algorithm
      const scoredResults = bestPractices.map((bp) => {
        const score = this.calculateRelevanceScore(
          bp,
          normalizedQuery,
          queryWords
        );
        return this.transformToSearchResult(bp, score);
      });

      // Filter out low-relevance results and sort by score
      const filteredResults = scoredResults
        .filter(result => result.relevanceScore > 0.5) // Filter very low relevance
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // Build context text for the LLM
      const contextText = filteredResults.map((result) =>
        this.buildContextText(result)
      );

      return {
        results: filteredResults,
        contextText,
        totalResults: bestPractices.length,
      };
    } catch (error) {
      console.error("RAG Search Error:", error);
      throw new Error("Failed to search relevant content");
    }
  }

  /**
   * Get best practices by category for context
   */
  async getContentByCategory(
    categories: string[],
    limit: number = 3
  ): Promise<RAGContext> {
    try {
      const bestPractices = await BestPracticeContent.findAll({
        where: {
          categories: {
            [Op.overlap]: categories,
          },
          is_published: true,
          is_deleted: false,
        },
        limit,
        order: [
          ["read_count", "DESC"],
          ["created_at", "DESC"],
        ],
      });

      const results = bestPractices.map(
        (bp) => this.transformToSearchResult(bp, 1.0) // Equal relevance for category-based search
      );

      const contextText = results.map((result) =>
        this.buildContextText(result)
      );

      return {
        results,
        contextText,
        totalResults: results.length,
      };
    } catch (error) {
      console.error("RAG Category Search Error:", error);
      throw new Error("Failed to get content by category");
    }
  }

  /**
   * Get popular/recent content for general context
   */
  async getGeneralContext(limit: number = 3): Promise<RAGContext> {
    try {
      const bestPractices = await BestPracticeContent.findAll({
        where: {
          is_published: true,
          is_deleted: false,
        },
        limit,
        order: [
          ["read_count", "DESC"],
          ["created_at", "DESC"],
        ],
      });

      const results = bestPractices.map(
        (bp) => this.transformToSearchResult(bp, 0.8) // Lower relevance for general context
      );

      const contextText = results.map((result) =>
        this.buildContextText(result)
      );

      return {
        results,
        contextText,
        totalResults: results.length,
      };
    } catch (error) {
      console.error("RAG General Context Error:", error);
      throw new Error("Failed to get general context");
    }
  }

  /**
   * Calculate relevance score for a best practice based on query
   */
  private calculateRelevanceScore(
    bestPractice: BestPracticeContent,
    normalizedQuery: string,
    queryWords: string[]
  ): number {
    let score = 0;
    const bp = bestPractice.toJSON() as any;

    // Extract text content for analysis
    const titleText = (bp.title || "").toLowerCase();
    const descText = (bp.description || "").toLowerCase();
    const stepsText = this.extractTextFromJsonb(bp.steps_json).toLowerCase();
    const benefitsText = this.extractTextFromJsonb(bp.benefits_json).toLowerCase();
    const allContent = `${titleText} ${descText} ${stepsText} ${benefitsText}`;

    // Check for exact phrase matches (highest priority)
    if (normalizedQuery.length > 5 && allContent.includes(normalizedQuery)) {
      score += 15;
    }

    // Title matches (highest weight)
    if (titleText.includes(normalizedQuery)) {
      score += 10;
    }

    let titleMatches = 0;
    queryWords.forEach((word) => {
      if (titleText.includes(word)) {
        score += 3;
        titleMatches++;
      }
    });

    // Description matches
    if (descText.includes(normalizedQuery)) {
      score += 5;
    }
    
    let descMatches = 0;
    queryWords.forEach((word) => {
      if (descText.includes(word)) {
        score += 2;
        descMatches++;
      }
    });

    // Steps and benefits matches
    let contentMatches = 0;
    queryWords.forEach((word) => {
      if (stepsText.includes(word)) {
        score += 1.5;
        contentMatches++;
      }
      if (benefitsText.includes(word)) {
        score += 1.5;
        contentMatches++;
      }
    });

    // Match density bonus - reward content with multiple matching terms
    const totalMatches = titleMatches + descMatches + contentMatches;
    const matchDensity = totalMatches / queryWords.length;
    if (matchDensity > 0.7) score += 3;
    else if (matchDensity > 0.5) score += 2;
    else if (matchDensity > 0.3) score += 1;

    // Word proximity bonus - check if query words appear close together
    if (queryWords.length > 1) {
      const proximityBonus = this.calculateProximityBonus(allContent, queryWords);
      score += proximityBonus;
    }

    // Category relevance
    const categories = bp.categories || [];
    const hasRelevantCategory = this.checkCategoryRelevance(categories, normalizedQuery);
    if (hasRelevantCategory) {
      score += 1;
    }

    // Popularity bonus
    const readCount = bp.read_count || 0;
    if (readCount > 50) score += 2;
    else if (readCount > 20) score += 1;

    // Freshness bonus for recent content
    const createdAt = new Date(bp.created_at);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) score += 0.5;

    return Math.max(score, 0.1); // Minimum score for any matched content
  }

  /**
   * Transform database model to search result
   */
  private transformToSearchResult(
    bestPractice: BestPracticeContent,
    relevanceScore: number
  ): RAGSearchResult {
    const bp = bestPractice.toJSON() as any;

    // Safely handle JSONB fields that might be null, undefined, or invalid
    const steps = Array.isArray(bp.steps_json) ? bp.steps_json : [];
    const benefits = Array.isArray(bp.benefits_json) ? bp.benefits_json : [];
    const categories = Array.isArray(bp.categories) ? bp.categories : [];

    return {
      id: bp.id,
      title: bp.title || "",
      description: bp.description || "",
      steps,
      benefits,
      categories,
      relevanceScore,
      content: this.extractCombinedContent(bp),
      readCount: bp.read_count || 0,
      createdAt: bp.created_at ? new Date(bp.created_at) : undefined,
    };
  }

  /**
   * Extract and combine all text content from a best practice
   */
  private extractCombinedContent(bestPractice: any): string {
    const parts = [bestPractice.title, bestPractice.description];

    // Handle steps_json JSONB field - array of {text, order} objects
    if (Array.isArray(bestPractice.steps_json)) {
      const stepTexts = bestPractice.steps_json
        .map((step: any) => {
          if (typeof step === "string") {
            return step;
          } else if (step && typeof step === "object" && step.text) {
            return step.text;
          }
          return null;
        })
        .filter(Boolean);
      parts.push(...stepTexts);
    }

    // Handle benefits_json JSONB field
    if (Array.isArray(bestPractice.benefits_json)) {
      const benefitTexts = bestPractice.benefits_json
        .map((benefit: any) => {
          if (typeof benefit === "string") {
            return benefit;
          } else if (benefit && typeof benefit === "object" && benefit.text) {
            return benefit.text;
          }
          return null;
        })
        .filter(Boolean);
      parts.push(...benefitTexts);
    }

    return parts.filter(Boolean).join(" ");
  }

  /**
   * Build formatted context text for LLM
   */
  private buildContextText(result: RAGSearchResult): string {
    const sections = [];

    sections.push(`Title: ${result.title}`);

    // Handle categories safely
    if (Array.isArray(result.categories) && result.categories.length > 0) {
      sections.push(`Categories: ${result.categories.join(", ")}`);
    }

    sections.push(`Description: ${result.description}`);

    // Handle steps safely - they come from JSONB as {text, order} objects
    if (Array.isArray(result.steps) && result.steps.length > 0) {
      const stepTexts = result.steps
        .map((step) => {
          if (typeof step === "string") {
            return step;
          } else if (step && typeof step === "object" && step.text) {
            return step.text;
          }
          return null;
        })
        .filter(Boolean);

      if (stepTexts.length > 0) {
        sections.push(`Steps: ${stepTexts.join(". ")}`);
      }
    }

    // Handle benefits safely
    if (Array.isArray(result.benefits) && result.benefits.length > 0) {
      const benefitTexts = result.benefits
        .map((benefit) =>
          typeof benefit === "string"
            ? benefit
            : (benefit as any)?.text || benefit
        )
        .filter(Boolean);

      if (benefitTexts.length > 0) {
        sections.push(`Benefits: ${benefitTexts.join(". ")}`);
      }
    }

    return sections.join("\n");
  }

  /**
   * Extract key topics from user query for better context retrieval
   */
  extractTopics(query: string): { categories: string[]; keywords: string[] } {
    const normalizedQuery = query.toLowerCase();

    // Map common user terms to our categories
    const categoryMap: { [key: string]: string } = {
      feed: "feeding_nutrition",
      feeding: "feeding_nutrition",
      nutrition: "feeding_nutrition",
      food: "feeding_nutrition",
      diet: "feeding_nutrition",
      meal: "feeding_nutrition",
      disease: "disease_control",
      health: "disease_control",
      sick: "disease_control",
      illness: "disease_control",
      medicine: "disease_control",
      treatment: "disease_control",
      vaccine: "disease_control",
      weight: "growth_weight",
      growth: "growth_weight",
      size: "growth_weight",
      gain: "growth_weight",
      development: "growth_weight",
      environment: "environment_management",
      housing: "environment_management",
      temperature: "environment_management",
      ventilation: "environment_management",
      shelter: "environment_management",
      breeding: "breeding_insemination",
      mating: "breeding_insemination",
      reproduction: "breeding_insemination",
      genetics: "breeding_insemination",
      pregnancy: "farrowing_management",
      birth: "farrowing_management",
      farrowing: "farrowing_management",
      delivery: "farrowing_management",
      record: "record_management",
      management: "record_management",
      tracking: "record_management",
      monitoring: "record_management",
      finance: "marketing_finance",
      cost: "marketing_finance",
      profit: "marketing_finance",
      market: "marketing_finance",
      sale: "marketing_finance",
    };

    const categories: string[] = [];
    const keywords: string[] = [];

    // Extract categories based on keywords
    Object.entries(categoryMap).forEach(([keyword, category]) => {
      if (normalizedQuery.includes(keyword)) {
        if (!categories.includes(category)) {
          categories.push(category);
        }
        keywords.push(keyword);
      }
    });

    // Add general keywords with better filtering
    const words = normalizedQuery
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          ![
            "the",
            "and",
            "for",
            "with",
            "how",
            "what",
            "when",
            "where",
            "why",
            "can",
            "should",
            "will",
            "best",
            "good",
            "better",
          ].includes(word)
      );
    keywords.push(...words);

    return { categories, keywords };
  }

  /**
   * Extract text content from JSONB fields
   */
  private extractTextFromJsonb(jsonbField: any): string {
    if (!Array.isArray(jsonbField)) return "";
    
    return jsonbField
      .map((item) => {
        if (typeof item === "string") {
          return item;
        } else if (item && typeof item === "object" && item.text) {
          return item.text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Calculate proximity bonus based on how close query words appear together
   */
  private calculateProximityBonus(content: string, queryWords: string[]): number {
    if (queryWords.length < 2) return 0;

    let proximityBonus = 0;
    const words = content.split(/\s+/);

    for (let i = 0; i < queryWords.length - 1; i++) {
      for (let j = i + 1; j < queryWords.length; j++) {
        const word1Index = words.findIndex(w => w.includes(queryWords[i]));
        const word2Index = words.findIndex(w => w.includes(queryWords[j]));
        
        if (word1Index !== -1 && word2Index !== -1) {
          const distance = Math.abs(word1Index - word2Index);
          if (distance === 1) proximityBonus += 3; // Adjacent words
          else if (distance <= 3) proximityBonus += 2; // Within 3 words
          else if (distance <= 5) proximityBonus += 1; // Within 5 words
        }
      }
    }

    return Math.min(proximityBonus, 5); // Cap the bonus
  }

  /**
   * Preprocess query to extract phrases, keywords, and clean text
   */
  private preprocessQuery(query: string): {
    cleanedQuery: string;
    phrases: string[];
    keywords: string[];
    intent: string;
  } {
    // Extract phrases in quotes
    const phraseRegex = /"([^"]+)"/g;
    const phrases: string[] = [];
    let match;
    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1].toLowerCase());
    }

    // Remove quotes and normalize
    const cleanedQuery = query
      .replace(/"([^"]+)"/g, '$1') // Remove quotes but keep content
      .toLowerCase()
      .trim();

    // Extract keywords (filter out stop words and short words)
    const stopWords = [
      "the", "and", "for", "with", "how", "what", "when", "where", "why",
      "can", "should", "will", "best", "good", "better", "is", "are", "was",
      "were", "be", "been", "have", "has", "had", "do", "does", "did", "a",
      "an", "this", "that", "these", "those", "to", "of", "in", "on", "at"
    ];

    const keywords = cleanedQuery
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.includes(word) &&
        !/^\d+$/.test(word) // Remove pure numbers
      );

    // Simple intent detection
    let intent = "general";
    if (query.match(/^(how|what|why|when|where)/i)) {
      intent = "question";
    } else if (query.match(/(best|good|recommend|suggest)/i)) {
      intent = "recommendation";
    } else if (query.match(/(problem|issue|trouble|wrong|error)/i)) {
      intent = "troubleshooting";
    }

    return {
      cleanedQuery,
      phrases,
      keywords,
      intent
    };
  }

  /**
   * Check if categories are relevant to the query
   */
  private checkCategoryRelevance(categories: string[], query: string): boolean {
    const agricultureKeywords = [
      "feeding",
      "nutrition",
      "disease",
      "health",
      "growth",
      "management",
      "breeding",
      "environment",
      "housing",
      "finance",
      "cost",
      "record",
      "farrowing",
      "birth",
      "weight",
      "reproduction",
    ];

    // Check if query contains farming-related terms
    const hasAgricultureTerms = agricultureKeywords.some(keyword => 
      query.includes(keyword)
    );

    // Check if any category matches query context
    const categoryRelevant = categories.some((cat: string) =>
      agricultureKeywords.some((keyword) => cat.includes(keyword)) ||
      query.split(/\s+/).some(word => cat.includes(word))
    );

    return hasAgricultureTerms || categoryRelevant;
  }
}

export default new RAGService();
