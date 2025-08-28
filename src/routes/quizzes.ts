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

// Stats per tag
router.get("/stats", optionalAuth, quizController.stats.bind(quizController));

// List quizzes
router.get("/", optionalAuth, quizController.list.bind(quizController));

// Create quiz
router.post(
  "/",
  authenticateWithCookies,
  requireAnyPermission([CREATE, MANAGE]),
  quizController.create.bind(quizController)
);

// Quiz detail
router.get("/:id", optionalAuth, quizController.getOne.bind(quizController));

// Update quiz
router.patch(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  quizController.update.bind(quizController)
);

// Delete (soft deactivate)
router.delete(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([MANAGE, UPDATE]),
  quizController.remove.bind(quizController)
);

// Questions sub-routes
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
// Aggregate questions across all quizzes for a tag (inclusive if any_tag_id provided)
router.get(
  "/questions/by-tag",
  optionalAuth,
  quizController.listQuestionsByTag.bind(quizController)
);
// Aggregated attempt across all quizzes for a tag
router.post(
  "/attempts/by-tag",
  authenticateWithCookies,
  requireAnyPermission([READ, CREATE, MANAGE, UPDATE]),
  quizController.startAttemptByTag.bind(quizController)
);

// Standalone question operations
router.get(
  "/question/:id",
  optionalAuth,
  quizController.getQuestion.bind(quizController)
);
// Attempt lifecycle
router.post(
  "/:id/attempts",
  authenticateWithCookies,
  quizController.startAttempt.bind(quizController)
);
router.post(
  "/:id/attempts/:attemptId/submit",
  authenticateWithCookies,
  quizController.submitAttempt.bind(quizController)
);
router.patch(
  "/:id/attempts/:attemptId/answers",
  authenticateWithCookies,
  quizController.saveAttemptAnswer.bind(quizController)
);
router.get(
  "/:id/attempts/:attemptId",
  authenticateWithCookies,
  quizController.getAttempt.bind(quizController)
);
router.get(
  "/:id/attempts/:attemptId/review",
  authenticateWithCookies,
  quizController.reviewAttempt.bind(quizController)
);
router.get(
  "/:id/stats",
  optionalAuth,
  quizController.quizStats.bind(quizController)
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

export default router;
