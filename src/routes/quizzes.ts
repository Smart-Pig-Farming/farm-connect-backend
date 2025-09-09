/**
 * @swagger
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         title:
 *           type: string
 *           example: "Pig Nutrition Basics"
 *         description:
 *           type: string
 *           example: "Test your knowledge of basic pig nutrition principles"
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           example: "medium"
 *         category:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *           example: "feeding"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["nutrition", "feeding", "basics"]
 *         timeLimit:
 *           type: integer
 *           example: 1800
 *           description: "Time limit in seconds (null for unlimited)"
 *         passingScore:
 *           type: number
 *           format: float
 *           example: 70.0
 *           description: "Minimum percentage to pass"
 *         maxAttempts:
 *           type: integer
 *           example: 3
 *           description: "Maximum attempts allowed (null for unlimited)"
 *         isActive:
 *           type: boolean
 *           example: true
 *         questionCount:
 *           type: integer
 *           example: 10
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     QuizQuestion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         question:
 *           type: string
 *           example: "What percentage of a pig's diet should consist of protein?"
 *         type:
 *           type: string
 *           enum: [multiple_choice, true_false]
 *           example: "multiple_choice"
 *         points:
 *           type: integer
 *           example: 10
 *         explanation:
 *           type: string
 *           example: "Adult pigs typically require 12-18% protein in their diet"
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuizQuestionOption'
 *         correctOptionId:
 *           type: string
 *           format: uuid
 *           description: "Only returned to quiz creators/managers"
 *
 *     QuizQuestionOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         text:
 *           type: string
 *           example: "12-18%"
 *         isCorrect:
 *           type: boolean
 *           example: true
 *           description: "Only returned to quiz creators/managers"
 *
 *     QuizAttempt:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         quizId:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [in_progress, completed, expired]
 *           example: "completed"
 *         score:
 *           type: number
 *           format: float
 *           example: 85.5
 *           description: "Percentage score (null if in progress)"
 *         totalPoints:
 *           type: integer
 *           example: 100
 *         earnedPoints:
 *           type: integer
 *           example: 85
 *         passed:
 *           type: boolean
 *           example: true
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         timeSpent:
 *           type: integer
 *           example: 1245
 *           description: "Time spent in seconds"
 *
 *     CreateQuiz:
 *       type: object
 *       required: [title, description, difficulty, category]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           example: "Pig Nutrition Basics"
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           example: "Test your knowledge of basic pig nutrition principles"
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           example: "medium"
 *         category:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *           example: "feeding"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 5
 *           example: ["nutrition", "feeding"]
 *         timeLimit:
 *           type: integer
 *           minimum: 60
 *           maximum: 7200
 *           example: 1800
 *           description: "Time limit in seconds"
 *         passingScore:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           example: 70.0
 *         maxAttempts:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           example: 3
 *
 *     CreateQuizQuestion:
 *       type: object
 *       required: [question, type, options]
 *       properties:
 *         question:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           example: "What percentage of a pig's diet should consist of protein?"
 *         type:
 *           type: string
 *           enum: [multiple_choice, true_false]
 *           example: "multiple_choice"
 *         points:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           example: 10
 *         explanation:
 *           type: string
 *           maxLength: 1000
 *           example: "Adult pigs typically require 12-18% protein in their diet"
 *         options:
 *           type: array
 *           minItems: 2
 *           maxItems: 6
 *           items:
 *             type: object
 *             required: [text, isCorrect]
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "12-18%"
 *               isCorrect:
 *                 type: boolean
 *                 example: true
 */

import { Router } from "express";
import quizController from "../controllers/quizController";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { requireAnyPermission } from "../middleware/permissions";

const CREATE = "CREATE:QUIZZES";
const READ = "READ:QUIZZES";
const UPDATE = "UPDATE:QUIZZES";
const MANAGE = "MANAGE:QUIZZES";

const router = Router();

// Optional auth middleware (same pattern as best practices)
const optionalAuth = (req: any, res: any, next: any) => {
  if (req.cookies?.accessToken || req.cookies?.refreshToken) {
    return authenticateWithCookies(req, res, next);
  }
  return next();
};

/**
 * @swagger
 * /api/quizzes/stats:
 *   get:
 *     summary: Get quiz statistics by tag
 *     description: Get aggregated statistics for quizzes grouped by tags
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by specific tag
 *     responses:
 *       200:
 *         description: Quiz statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tagStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tag:
 *                             type: string
 *                             example: "nutrition"
 *                           quizCount:
 *                             type: integer
 *                             example: 15
 *                           totalAttempts:
 *                             type: integer
 *                             example: 234
 *                           averageScore:
 *                             type: number
 *                             example: 78.5
 */
router.get("/stats", optionalAuth, quizController.stats.bind(quizController));

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: List all quizzes
 *     description: |
 *       Get a paginated list of active quizzes with optional filtering by category, difficulty, and search.
 *       Shows additional data for authenticated users.
 *     tags: [Quizzes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [feeding, health, housing, breeding, marketing, general]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in quiz title and description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     quizzes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Quiz'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *   post:
 *     summary: Create a new quiz
 *     description: Create a new quiz. Requires CREATE:QUIZZES or MANAGE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuiz'
 *     responses:
 *       201:
 *         description: Quiz created successfully
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
 *                         quiz:
 *                           $ref: '#/components/schemas/Quiz'
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
router.get("/", optionalAuth, quizController.list.bind(quizController));

router.post(
  "/",
  authenticateWithCookies,
  requireAnyPermission([CREATE, MANAGE]),
  quizController.create.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get quiz details
 *     description: Get detailed information about a specific quiz including questions (for authenticated users)
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     quiz:
 *                       $ref: '#/components/schemas/Quiz'
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizQuestion'
 *                       description: "Only included for authenticated users"
 *                     userStats:
 *                       type: object
 *                       properties:
 *                         attemptsCount:
 *                           type: integer
 *                           example: 2
 *                         bestScore:
 *                           type: number
 *                           example: 85.5
 *                         canAttempt:
 *                           type: boolean
 *                           example: true
 *                       description: "Only included for authenticated users"
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update quiz
 *     description: Update quiz details. Requires UPDATE:QUIZZES or MANAGE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               category:
 *                 type: string
 *                 enum: [feeding, health, housing, breeding, marketing, general]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeLimit:
 *                 type: integer
 *               passingScore:
 *                 type: number
 *               maxAttempts:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Quiz updated successfully
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
 *                         quiz:
 *                           $ref: '#/components/schemas/Quiz'
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
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Deactivate quiz
 *     description: Soft delete (deactivate) a quiz. Requires MANAGE:QUIZZES or UPDATE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quiz deactivated successfully
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
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", optionalAuth, quizController.getOne.bind(quizController));

router.patch(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  quizController.update.bind(quizController)
);

router.delete(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([MANAGE, UPDATE]),
  quizController.remove.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{quizId}/questions:
 *   post:
 *     summary: Add question to quiz
 *     description: Add a new question to a specific quiz. Requires CREATE:QUIZZES, MANAGE:QUIZZES, or UPDATE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizQuestion'
 *     responses:
 *       201:
 *         description: Question added successfully
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
 *                         question:
 *                           $ref: '#/components/schemas/QuizQuestion'
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
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     summary: Get quiz questions
 *     description: Get all questions for a specific quiz
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizQuestion'
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:quizId/questions",
  authenticateWithCookies,
  requireAnyPermission([CREATE, MANAGE, UPDATE]),
  quizController.createQuestion.bind(quizController)
);

router.get(
  "/:quizId/questions",
  optionalAuth,
  quizController.listQuestions.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/questions/by-tag:
 *   get:
 *     summary: Get questions by tag
 *     description: Get questions from all quizzes that match specific tags
 *     tags: [Quizzes]
 *     parameters:
 *       - in: query
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag to filter questions by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of questions to return
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/QuizQuestion'
 *                           - type: object
 *                             properties:
 *                               quiz:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   title:
 *                                     type: string
 *                                   category:
 *                                     type: string
 *       400:
 *         description: Tag parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/questions/by-tag",
  optionalAuth,
  quizController.listQuestionsByTag.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/attempts/by-tag:
 *   post:
 *     summary: Start quiz attempt by tag
 *     description: |
 *       Start a quiz attempt using questions from all quizzes that match specific tags.
 *       Creates an aggregated quiz experience across multiple quizzes.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tag]
 *             properties:
 *               tag:
 *                 type: string
 *                 example: "nutrition"
 *                 description: "Tag to filter questions by"
 *               questionCount:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 50
 *                 default: 20
 *                 description: "Number of questions to include in the attempt"
 *     responses:
 *       201:
 *         description: Quiz attempt started successfully
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
 *                         attempt:
 *                           $ref: '#/components/schemas/QuizAttempt'
 *                         questions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/QuizQuestion'
 *       400:
 *         description: Validation error or insufficient questions for tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/attempts/by-tag",
  authenticateWithCookies,
  requireAnyPermission([READ, CREATE, MANAGE, UPDATE]),
  quizController.startAttemptByTag.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/question/{id}:
 *   get:
 *     summary: Get individual question
 *     description: Get details of a specific question by ID
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     question:
 *                       $ref: '#/components/schemas/QuizQuestion'
 *       404:
 *         description: Question not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update question
 *     description: Update an existing question. Requires UPDATE:QUIZZES or MANAGE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               type:
 *                 type: string
 *                 enum: [multiple_choice, true_false]
 *               points:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *               explanation:
 *                 type: string
 *                 maxLength: 1000
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Question updated successfully
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
 *                         question:
 *                           $ref: '#/components/schemas/QuizQuestion'
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
 *         description: Question not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete question
 *     description: Delete a question from a quiz. Requires UPDATE:QUIZZES or MANAGE:QUIZZES permission.
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Question deleted successfully
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
 *         description: Question not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/question/:id",
  optionalAuth,
  quizController.getQuestion.bind(quizController)
);

router.patch(
  "/question/:id",
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  quizController.updateQuestion.bind(quizController)
);

router.delete(
  "/question/:id",
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  quizController.removeQuestion.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}/attempts:
 *   post:
 *     summary: Start quiz attempt
 *     description: Start a new attempt for a specific quiz
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       201:
 *         description: Quiz attempt started successfully
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
 *                         attempt:
 *                           $ref: '#/components/schemas/QuizAttempt'
 *                         questions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/QuizQuestion'
 *       400:
 *         description: Maximum attempts reached or quiz not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/attempts",
  authenticateWithCookies,
  quizController.startAttempt.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}/attempts/{attemptId}:
 *   get:
 *     summary: Get quiz attempt details
 *     description: Get details of a specific quiz attempt including current progress
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Attempt details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     attempt:
 *                       $ref: '#/components/schemas/QuizAttempt'
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizQuestion'
 *                     answers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionId:
 *                             type: string
 *                           selectedOptionId:
 *                             type: string
 *                           isCorrect:
 *                             type: boolean
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quiz or attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Save answer to quiz attempt
 *     description: Save an answer for a specific question in the quiz attempt
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attempt ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionId, selectedOptionId]
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the question being answered
 *               selectedOptionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the selected answer option
 *     responses:
 *       200:
 *         description: Answer saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid question or option ID, or attempt already completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quiz or attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id/attempts/:attemptId",
  authenticateWithCookies,
  quizController.getAttempt.bind(quizController)
);

router.patch(
  "/:id/attempts/:attemptId/answers",
  authenticateWithCookies,
  quizController.saveAttemptAnswer.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}/attempts/{attemptId}/submit:
 *   post:
 *     summary: Submit quiz attempt
 *     description: Submit a quiz attempt for final scoring
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
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
 *                         attempt:
 *                           $ref: '#/components/schemas/QuizAttempt'
 *                         results:
 *                           type: object
 *                           properties:
 *                             score:
 *                               type: number
 *                               example: 85.5
 *                             passed:
 *                               type: boolean
 *                               example: true
 *                             correctAnswers:
 *                               type: integer
 *                               example: 17
 *                             totalQuestions:
 *                               type: integer
 *                               example: 20
 *       400:
 *         description: Attempt already submitted or invalid state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quiz or attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/attempts/:attemptId/submit",
  authenticateWithCookies,
  quizController.submitAttempt.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}/attempts/{attemptId}/review:
 *   get:
 *     summary: Review quiz attempt
 *     description: Get detailed review of a completed quiz attempt including correct answers and explanations
 *     tags: [Quizzes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Attempt review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     attempt:
 *                       $ref: '#/components/schemas/QuizAttempt'
 *                     review:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           question:
 *                             $ref: '#/components/schemas/QuizQuestion'
 *                           userAnswer:
 *                             type: object
 *                             properties:
 *                               selectedOptionId:
 *                                 type: string
 *                               selectedText:
 *                                 type: string
 *                               isCorrect:
 *                                 type: boolean
 *                           correctAnswer:
 *                             type: object
 *                             properties:
 *                               optionId:
 *                                 type: string
 *                               text:
 *                                 type: string
 *                           explanation:
 *                             type: string
 *                             nullable: true
 *       400:
 *         description: Attempt not completed yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quiz or attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id/attempts/:attemptId/review",
  authenticateWithCookies,
  quizController.reviewAttempt.bind(quizController)
);

/**
 * @swagger
 * /api/quizzes/{id}/stats:
 *   get:
 *     summary: Get quiz statistics
 *     description: Get statistical information about a specific quiz
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalAttempts:
 *                           type: integer
 *                           example: 145
 *                         completedAttempts:
 *                           type: integer
 *                           example: 132
 *                         averageScore:
 *                           type: number
 *                           example: 78.5
 *                         passRate:
 *                           type: number
 *                           example: 85.2
 *                         averageTimeSpent:
 *                           type: integer
 *                           example: 1245
 *                           description: "Average time in seconds"
 *       404:
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id/stats",
  optionalAuth,
  quizController.quizStats.bind(quizController)
);

export default router;
