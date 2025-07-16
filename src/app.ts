import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { testConnection } from "./config/database";
import { runBasicSeeds } from "./seeders/basicSeeds";
import sequelize from "./config/database";
import "./models"; // Import all models to register associations

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";

class App {
  public app: Application;
  private port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await testConnection();

      // Sync database models (create tables)
      console.log("Syncing database models...");
      await sequelize.sync({ force: false }); // Set to true to drop and recreate tables
      console.log("Database models synced successfully");

      // Run basic seeds (roles and levels)
      await runBasicSeeds();
    } catch (error) {
      console.error("Failed to initialize database connection:", error);
      process.exit(1);
    }
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      })
    );

    // Logging middleware
    this.app.use(morgan("combined"));

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    // Health check route
    this.app.use("/api/health", healthRoutes);

    // Authentication routes
    this.app.use("/api/auth", authRoutes);

    // Welcome route
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "Farm Connect Backend API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
      });
    });

    // Global error handler
    this.app.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        console.error("Error:", error);
        res.status(500).json({
          error: "Internal server error",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Something went wrong",
        });
      }
    );
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(` Farm Connect Backend running on port ${this.port}`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(` Access at: http://localhost:${this.port}`);
    });
  }
}

export default App;
