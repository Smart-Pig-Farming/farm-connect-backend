/**
 * @swagger
 * components:
 *   schemas:
 *     CreateBestPractice:
 *       type: object
 *       required: [title, description, category]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 10
 *           maxLength: 255
 *           example: "Proper Pig Vaccination Schedule"
 *         description:
 *           type: string
 *           minLength: 50
 *           example: "A comprehensive guide to establishing and maintaining an effective vaccination schedule for pigs..."
 *         category:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *           example: "health"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 5
 *           example: ["vaccination", "health", "prevention"]
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "intermediate"
 *         estimatedTime:
 *           type: string
 *           example: "2-3 hours"
 *         image:
 *           type: string
 *           format: binary
 *           description: "Optional cover image for the best practice"
 */

import { Router } from "express";
import bestPracticeController from "../controllers/bestPracticeController";
import { requireAnyPermission } from "../middleware/permissions";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { uploadSingle } from "../middleware/upload";

// Permission strings
const CREATE = "CREATE:BEST_PRACTICES";
const READ = "READ:BEST_PRACTICES";
const UPDATE = "UPDATE:BEST_PRACTICES";
const DELETE_P = "DELETE:BEST_PRACTICES";
const MANAGE = "MANAGE:BEST_PRACTICES";

const router = Router();

// Optional auth wrapper (if token provided) to annotate read status
// Optional auth: attempt cookie-based auth if access token cookie present; otherwise continue
const optionalAuth = (req: any, _res: any, next: any) => {
  if (req.cookies?.accessToken || req.cookies?.refreshToken) {
    return authenticateWithCookies(req, _res, next);
  }
  return next();
};

/**
 * @swagger
 * /api/best-practices:
 *   get:
 *     summary: Get all best practices
 *     description: |
 *       Retrieve all published best practices. Public access with optional authentication
 *       to track reading progress and provide personalized recommendations.
 *     tags: [Best Practices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of best practices per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title and description
 *     responses:
 *       200:
 *         description: Best practices retrieved successfully
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
 *                     bestPractices:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BestPractice'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get(
  "/",
  optionalAuth,
  bestPracticeController.list.bind(bestPracticeController)
);

/**
 * @swagger
 * /api/best-practices/categories:
 *   get:
 *     summary: Get best practice categories with counts
 *     description: Get all available categories with the count of published best practices in each
 *     tags: [Best Practices]
 *     responses:
 *       200:
 *         description: Categories with counts retrieved successfully
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
 *                       category:
 *                         type: string
 *                         enum: [feeding, health, housing, breeding, marketing, general]
 *                       count:
 *                         type: integer
 *                         example: 15
 */
router.get(
  "/categories",
  optionalAuth,
  bestPracticeController.categories.bind(bestPracticeController)
);

/**
 * @swagger
 * /api/best-practices:
 *   post:
 *     summary: Create a new best practice
 *     description: |
 *       Create a new best practice. Requires appropriate permissions.
 *       Supports optional image upload for the cover image.
 *     tags: [Best Practices]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateBestPractice'
 *     responses:
 *       201:
 *         description: Best practice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         bestPractice:
 *                           $ref: '#/components/schemas/BestPractice'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  authenticateWithCookies,
  requireAnyPermission([CREATE, MANAGE]),
  uploadSingle,
  bestPracticeController.create.bind(bestPracticeController)
);

/**
 * @swagger
 * /api/best-practices/{id}:
 *   get:
 *     summary: Get a specific best practice
 *     description: |
 *       Retrieve a specific best practice by ID. If user is authenticated,
 *       their reading progress will be recorded for tracking purposes.
 *     tags: [Best Practices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Best practice ID
 *     responses:
 *       200:
 *         description: Best practice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         bestPractice:
 *                           $ref: '#/components/schemas/BestPractice'
 *                         isLiked:
 *                           type: boolean
 *                           example: false
 *                           description: "Whether current user has liked this (if authenticated)"
 *                         hasRead:
 *                           type: boolean
 *                           example: true
 *                           description: "Whether current user has read this (if authenticated)"
 *       404:
 *         description: Best practice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id",
  optionalAuth,
  bestPracticeController.getOne.bind(bestPracticeController)
);

/**
 * @swagger
 * /api/best-practices/{id}:
 *   patch:
 *     summary: Update a best practice
 *     description: |
 *       Update a specific best practice. Requires appropriate permissions.
 *       Supports updating the cover image.
 *     tags: [Best Practices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Best practice ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 minLength: 50
 *               category:
 *                 type: string
 *                 enum: [feeding, health, housing, breeding, marketing, general]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 5
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               estimatedTime:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "New cover image (optional)"
 *     responses:
 *       200:
 *         description: Best practice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         bestPractice:
 *                           $ref: '#/components/schemas/BestPractice'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Best practice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  uploadSingle,
  bestPracticeController.update.bind(bestPracticeController)
);

/**
 * @swagger
 * /api/best-practices/{id}:
 *   delete:
 *     summary: Delete a best practice
 *     description: |
 *       Soft delete a best practice. Requires appropriate permissions.
 *       The best practice will be marked as deleted but not permanently removed.
 *     tags: [Best Practices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Best practice ID to delete
 *     responses:
 *       200:
 *         description: Best practice deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Best practice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([DELETE_P, MANAGE]),
  bestPracticeController.remove.bind(bestPracticeController)
);

export default router;
