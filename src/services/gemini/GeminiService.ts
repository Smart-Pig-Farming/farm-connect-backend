import axios, { AxiosResponse } from "axios";

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

class GeminiService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.baseUrl = "https://generativelanguage.googleapis.com";
    this.model = "gemini-1.5-flash-latest"; // Using flash model for faster responses

    if (!this.apiKey) {
      console.warn("GEMINI_API_KEY not found in environment variables");
    }
  }

  /**
   * Generate a response using Gemini API
   */
  async generateResponse(
    messages: GeminiMessage[],
    systemPrompt?: string
  ): Promise<string> {
    try {
      // If system prompt is provided, prepend it as the first message
      const contents = systemPrompt
        ? [
            {
              role: "user" as const,
              parts: [{ text: systemPrompt }],
            },
            {
              role: "model" as const,
              parts: [
                {
                  text: "I understand. I will help with farming and agricultural questions based on the provided context, covering all aspects of modern agriculture including livestock management, crop production, and sustainable farming practices.",
                },
              ],
            },
            ...messages,
          ]
        : messages;

      const requestData: GeminiRequest = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      const response: AxiosResponse<GeminiResponse> = await axios.post(
        `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.candidates && response.data.candidates.length > 0) {
        const candidate = response.data.candidates[0];
        if (
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          return candidate.content.parts[0].text;
        }
      }

      throw new Error("No valid response generated");
    } catch (error) {
      console.error("Gemini API Error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (error.response?.status === 401) {
          throw new Error("Invalid API key or authentication failed.");
        }
        if (error.response?.data) {
          console.error("Gemini API Error Response:", error.response.data);
        }
      }

      throw new Error("Failed to generate response from Gemini API");
    }
  }

  /**
   * Create a system prompt for farming context
   */
  createSystemPrompt(contextualContent: string[]): string {
    return `You are a helpful AI assistant specializing in modern farming and agricultural best practices. You have access to the following contextual information from our comprehensive farming knowledge base:

${contextualContent
  .map(
    (content, index) => `
Context ${index + 1}:
${content}
`
  )
  .join("\n")}

Instructions:
1. Answer questions about all aspects of farming including livestock management (pigs, cattle, poultry, etc.), crop production, 
   sustainable agriculture, and related agricultural practices
2. Use the provided context to give accurate and helpful advice based on proven farming methods
3. If the question is outside your knowledge or the provided context, acknowledge it and provide general farming guidance when possible
4. Keep responses practical, clear, and actionable for farmers of all experience levels
5. Cite specific practices from the context when relevant and explain how they can be adapted to different farming situations
6. If you're unsure about something, acknowledge it rather than guessing, and suggest consulting with agricultural experts
7. Focus on health, nutrition, housing, breeding, management practices, crop rotation, soil health, pest management, and sustainable farming methods
8. Consider environmental impact and sustainability in your recommendations
9. Provide both traditional and modern farming approaches when relevant

Please respond in a helpful, professional manner suitable for farmers seeking practical advice across all areas of agriculture.`;
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default new GeminiService();
