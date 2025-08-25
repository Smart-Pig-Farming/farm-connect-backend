import { Router } from "express";
import bestPracticeController from "../controllers/bestPracticeController";
import { requireAnyPermission } from "../middleware/permissions";
import { authenticateToken } from "../middleware/auth";
import { uploadSingle } from "../middleware/upload";

// Permission strings
const CREATE = "CREATE:BEST_PRACTICES";
const READ = "READ:BEST_PRACTICES";
const UPDATE = "UPDATE:BEST_PRACTICES";
const DELETE_P = "DELETE:BEST_PRACTICES";
const MANAGE = "MANAGE:BEST_PRACTICES";

const router = Router();

// Optional auth wrapper (if token provided) to annotate read status
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) return authenticateToken(req, res, next);
  return next();
};

// Public read list (published only). Uses optional auth.
router.get(
  "/",
  optionalAuth,
  bestPracticeController.list.bind(bestPracticeController)
);

// Category counts (published & not deleted)
router.get(
  "/categories",
  optionalAuth,
  bestPracticeController.categories.bind(bestPracticeController)
);

// Create
router.post(
  "/",
  authenticateToken,
  requireAnyPermission([CREATE, MANAGE]),
  uploadSingle,
  bestPracticeController.create.bind(bestPracticeController)
);

// Detail (records read if authed)
router.get(
  "/:id",
  optionalAuth,
  bestPracticeController.getOne.bind(bestPracticeController)
);

// Update
router.patch(
  "/:id",
  authenticateToken,
  requireAnyPermission([UPDATE, MANAGE]),
  uploadSingle,
  bestPracticeController.update.bind(bestPracticeController)
);

// Delete (soft)
router.delete(
  "/:id",
  authenticateToken,
  requireAnyPermission([DELETE_P, MANAGE]),
  bestPracticeController.remove.bind(bestPracticeController)
);

export default router;
