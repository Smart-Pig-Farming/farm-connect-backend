import swaggerJSDoc from "swagger-jsdoc";
import { SwaggerDefinition } from "swagger-jsdoc";

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Farm Connect API",
    version: "1.0.0",
    description:
      "Backend API for Farm Connect - Precision Pig Farming Application",
    contact: {
      name: "Farm Connect Team",
      email: "piggydata@gmail.com",
    },
    license: {
      name: "ISC",
      url: "https://opensource.org/licenses/ISC",
    },
  },
  servers: [
    {
      url: process.env.API_URL || "http://localhost:5000",
      description: "Development server",
    },
    {
      url: "http://54.157.236.77/api",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
        description: "Cookie-based authentication using JWT access token",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Bearer token authentication (if using Authorization header)",
      },
      csrfToken: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description:
          "CSRF protection token (required for state-changing operations)",
      },
    },
    schemas: {
      // Common response schemas
      SuccessResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
            example: "Operation completed successfully",
          },
          data: {
            type: "object",
            description: "Response data (structure varies by endpoint)",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            example: "Error message",
          },
          code: {
            type: "string",
            example: "ERROR_CODE",
          },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            example: "Validation failed",
          },
          code: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  example: "email",
                },
                message: {
                  type: "string",
                  example: "Invalid email format",
                },
              },
            },
          },
        },
      },
      // User schemas
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          email: {
            type: "string",
            format: "email",
            example: "farmer@example.com",
          },
          firstname: {
            type: "string",
            example: "John",
          },
          lastname: {
            type: "string",
            example: "Doe",
          },
          role: {
            type: "string",
            enum: ["farmer", "admin", "moderator", "expert"],
            example: "farmer",
          },
          province: {
            type: "string",
            nullable: true,
            example: "Kigali",
          },
          district: {
            type: "string",
            nullable: true,
            example: "Nyarugenge",
          },
          sector: {
            type: "string",
            nullable: true,
            example: "Kimisagara",
          },
          isVerified: {
            type: "boolean",
            example: true,
          },
          isActive: {
            type: "boolean",
            example: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2023-01-01T00:00:00.000Z",
          },
        },
      },
      UserRegistration: {
        type: "object",
        required: [
          "email",
          "firstname",
          "lastname",
          "province",
          "district",
          "sector",
        ],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "farmer@example.com",
          },
          firstname: {
            type: "string",
            example: "John",
          },
          lastname: {
            type: "string",
            example: "Doe",
          },
          province: {
            type: "string",
            example: "Kigali",
          },
          district: {
            type: "string",
            example: "Nyarugenge",
          },
          sector: {
            type: "string",
            example: "Kimisagara",
          },
        },
      },
      LoginCredentials: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "farmer@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "securepassword123",
          },
        },
      },
      // Discussion schemas
      DiscussionPost: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          title: {
            type: "string",
            example: "Best practices for pig feeding",
          },
          content: {
            type: "string",
            example:
              "I would like to discuss the best feeding practices for pigs...",
          },
          category: {
            type: "string",
            enum: [
              "feeding",
              "health",
              "housing",
              "breeding",
              "marketing",
              "general",
            ],
            example: "feeding",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["nutrition", "feeding", "best-practices"],
          },
          mediaUrls: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
            example: [
              "https://res.cloudinary.com/example/image/upload/v123/sample.jpg",
            ],
          },
          thumbnailUrls: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            example: "published",
          },
          likesCount: {
            type: "integer",
            example: 15,
          },
          repliesCount: {
            type: "integer",
            example: 8,
          },
          viewsCount: {
            type: "integer",
            example: 234,
          },
          authorId: {
            type: "string",
            format: "uuid",
          },
          author: {
            $ref: "#/components/schemas/User",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      // Best Practice schemas
      BestPractice: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          title: {
            type: "string",
            example: "Proper Pig Vaccination Schedule",
          },
          description: {
            type: "string",
            example: "A comprehensive guide to pig vaccination schedules...",
          },
          category: {
            type: "string",
            enum: [
              "feeding",
              "health",
              "housing",
              "breeding",
              "marketing",
              "general",
            ],
            example: "health",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
          },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            example: "intermediate",
          },
          estimatedTime: {
            type: "string",
            example: "2-3 hours",
          },
          imageUrl: {
            type: "string",
            format: "uri",
            nullable: true,
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            example: "published",
          },
          readTime: {
            type: "integer",
            example: 10,
          },
          likesCount: {
            type: "integer",
            example: 45,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      // Scoring schemas
      UserScore: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            format: "uuid",
          },
          totalPoints: {
            type: "integer",
            example: 1250,
          },
          currentLevel: {
            type: "integer",
            example: 3,
          },
          levelName: {
            type: "string",
            example: "Experienced Farmer",
          },
          weeklyPoints: {
            type: "integer",
            example: 150,
          },
          monthlyPoints: {
            type: "integer",
            example: 450,
          },
          streak: {
            type: "integer",
            example: 7,
          },
          badges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "Discussion Starter",
                },
                description: {
                  type: "string",
                  example: "Started 10 discussions",
                },
                earnedAt: {
                  type: "string",
                  format: "date-time",
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: "Authentication",
      description: "User authentication and authorization endpoints",
    },
    {
      name: "Users",
      description: "User management endpoints",
    },
    {
      name: "Discussions",
      description: "Discussion posts and replies management",
    },
    {
      name: "Best Practices",
      description: "Best practices content management",
    },
    {
      name: "Quizzes",
      description: "Quiz and assessment endpoints",
    },
    {
      name: "Chat",
      description: "AI chat assistant endpoints",
    },
    {
      name: "Scoring",
      description: "User scoring, gamification, and leaderboards",
    },
    {
      name: "Moderation",
      description: "Content moderation and reporting endpoints",
    },
    {
      name: "Notifications",
      description: "User notification management",
    },
    {
      name: "Admin",
      description: "Administrative endpoints (admin access required)",
    },
    {
      name: "Health",
      description: "System health and status endpoints",
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
