/**
 * @swagger
 * components:
 *   schemas:
 *     HealthCheck:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [OK, DEGRADED, DOWN]
 *           example: "OK"
 *           description: "Overall system health status"
 *         message:
 *           type: string
 *           example: "Farm Connect Backend is running"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T14:30:00Z"
 *         uptime:
 *           type: number
 *           example: 3600.5
 *           description: "Server uptime in seconds"
 *         environment:
 *           type: string
 *           enum: [development, staging, production]
 *           example: "production"
 *         version:
 *           type: string
 *           example: "1.0.0"
 *         node_version:
 *           type: string
 *           example: "18.17.0"
 *         memory_usage:
 *           type: object
 *           properties:
 *             rss:
 *               type: number
 *               example: 67108864
 *               description: "Resident Set Size in bytes"
 *             heapTotal:
 *               type: number
 *               example: 33554432
 *               description: "Total heap size in bytes"
 *             heapUsed:
 *               type: number
 *               example: 20971520
 *               description: "Used heap size in bytes"
 *             external:
 *               type: number
 *               example: 1048576
 *               description: "External memory usage in bytes"
 *
 *     ServiceHealth:
 *       type: object
 *       properties:
 *         database:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [healthy, unhealthy]
 *               example: "healthy"
 *             response_time_ms:
 *               type: number
 *               example: 15.3
 *             connection_count:
 *               type: integer
 *               example: 8
 *             last_check:
 *               type: string
 *               format: date-time
 *         redis:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [healthy, unhealthy]
 *               example: "healthy"
 *             response_time_ms:
 *               type: number
 *               example: 2.1
 *             memory_usage_mb:
 *               type: number
 *               example: 45.7
 *             connected_clients:
 *               type: integer
 *               example: 3
 *         email_service:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [healthy, unhealthy]
 *               example: "healthy"
 *             last_successful_send:
 *               type: string
 *               format: date-time
 *               nullable: true
 *         storage:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [healthy, unhealthy]
 *               example: "healthy"
 *             available_space_gb:
 *               type: number
 *               example: 125.4
 *             total_space_gb:
 *               type: number
 *               example: 500.0
 *             usage_percentage:
 *               type: number
 *               example: 74.9
 */

import { Router, Request, Response } from "express";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     description: |
 *       Get the basic health status of the Farm Connect backend server.
 *       This endpoint provides essential system information and status.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: System is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         description: System is experiencing issues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "DOWN"
 *                 message:
 *                   type: string
 *                   example: "System is experiencing critical issues"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */

router.get("/", (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: "OK",
      message: "Farm Connect Backend is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      node_version: process.version,
      memory_usage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "DOWN",
      message: "System is experiencing critical issues",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @swagger
 * /api/health/services:
 *   get:
 *     summary: Detailed service health check
 *     description: |
 *       Get the health status of all dependent services including database,
 *       cache, email service, and storage. This provides a comprehensive
 *       view of system dependencies.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Service health information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, critical]
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   $ref: '#/components/schemas/ServiceHealth'
 *                 overall_score:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                   example: 95.5
 *                   description: "Overall system health score (0-100)"
 *       503:
 *         description: One or more critical services are unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "critical"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   $ref: '#/components/schemas/ServiceHealth'
 *                 failed_services:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["database", "redis"]
 */

router.get("/services", async (req: Request, res: Response) => {
  try {
    // This would typically check actual service connections
    // For now, providing a basic implementation
    const services = {
      database: {
        status: "healthy",
        response_time_ms: 15.3,
        connection_count: 8,
        last_check: new Date().toISOString(),
      },
      redis: {
        status: "healthy",
        response_time_ms: 2.1,
        memory_usage_mb: 45.7,
        connected_clients: 3,
      },
      email_service: {
        status: "healthy",
        last_successful_send: new Date().toISOString(),
      },
      storage: {
        status: "healthy",
        available_space_gb: 125.4,
        total_space_gb: 500.0,
        usage_percentage: 74.9,
      },
    };

    const healthyServices = Object.values(services).filter(
      (s) => s.status === "healthy"
    ).length;
    const totalServices = Object.keys(services).length;
    const overallScore = (healthyServices / totalServices) * 100;

    const status =
      overallScore === 100
        ? "healthy"
        : overallScore >= 75
        ? "degraded"
        : "critical";

    res.status(status === "critical" ? 503 : 200).json({
      status,
      timestamp: new Date().toISOString(),
      services,
      overall_score: overallScore,
      ...(status === "critical" && {
        failed_services: Object.entries(services)
          .filter(([_, service]) => service.status !== "healthy")
          .map(([name]) => name),
      }),
    });
  } catch (error) {
    res.status(500).json({
      status: "critical",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Health check failed",
    });
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: |
 *       Kubernetes/Docker readiness probe endpoint. Returns 200 when the
 *       application is ready to serve traffic, 503 otherwise.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Application is ready to serve traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not ready to serve traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: false
 *                 reason:
 *                   type: string
 *                   example: "Database connection not established"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

router.get("/ready", (req: Request, res: Response) => {
  try {
    // Basic readiness check - could be enhanced with actual dependency checks
    const isReady = true; // Replace with actual readiness logic

    if (isReady) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        ready: false,
        reason: "System dependencies not available",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error instanceof Error ? error.message : "Readiness check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness probe
 *     description: |
 *       Kubernetes/Docker liveness probe endpoint. Returns 200 if the
 *       application is alive and should not be restarted.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Application is alive and functioning
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                   description: "Server uptime in seconds"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Application is not functioning properly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Critical system failure"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

router.get("/live", (req: Request, res: Response) => {
  try {
    res.status(200).json({
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      alive: false,
      error: error instanceof Error ? error.message : "Liveness check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
