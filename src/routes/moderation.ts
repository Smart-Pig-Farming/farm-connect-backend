import { Router } from "express";
import {
  authenticateWithCookies,
  csrfProtection,
} from "../middleware/cookieAuth";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/permissions";
import { handleValidationErrors } from "../middleware/validation";
import { body, param, query } from "express-validator";
import moderationController from "../controllers/moderationController";

const router = Router();

// Report content (post)
router.post(
  "/posts/:id/report",
  authenticateWithCookies,
  requirePermission("CREATE:REPORTS"),
  csrfProtection,
  param("id").isUUID(),
  body("reason")
    .isIn([
      "inappropriate",
      "spam",
      "fraudulent",
      "misinformation",
      "technical",
      "other",
    ])
    .withMessage("Invalid reason"),
  body("details").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.createReport
);

// Report content (reply)
router.post(
  "/replies/:id/report",
  authenticateWithCookies,
  requirePermission("CREATE:REPORTS"),
  csrfProtection,
  param("id").isUUID(),
  body("reason")
    .isIn([
      "inappropriate",
      "spam",
      "fraudulent",
      "misinformation",
      "technical",
      "other",
    ])
    .withMessage("Invalid reason"),
  body("details").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.createReport
);

// Get pending moderation queue (posts grouped with reports)
router.get(
  "/pending",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  query("search").optional().isLength({ max: 255 }),
  handleValidationErrors,
  moderationController.getPending
);

// Apply decision to a post moderation case
router.post(
  "/posts/:postId/decision",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  csrfProtection,
  param("postId").isUUID(),
  body("decision")
    .isIn(["retained", "deleted", "warned"])
    .withMessage("Invalid decision"),
  body("justification").optional().isLength({ max: 1000 }),
  handleValidationErrors,
  moderationController.decide
);

// Moderation history
router.get(
  "/history",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("decision").optional().isIn(["retained", "deleted", "warned"]),
  handleValidationErrors,
  moderationController.getHistory
);

// Metrics
router.get(
  "/metrics",
  authenticateWithCookies,
  requireAnyPermission([
    "MANAGE:MODERATION",
    "MODERATE:REPORTS",
    "MODERATE:POSTS",
  ]),
  moderationController.getMetrics
);

export default router;
