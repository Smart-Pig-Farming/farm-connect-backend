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
  authenticateWithCookies,
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
  authenticateWithCookies,
  requireAnyPermission([UPDATE, MANAGE]),
  uploadSingle,
  bestPracticeController.update.bind(bestPracticeController)
);

// Delete (soft)
router.delete(
  "/:id",
  authenticateWithCookies,
  requireAnyPermission([DELETE_P, MANAGE]),
  bestPracticeController.remove.bind(bestPracticeController)
);

export default router;
