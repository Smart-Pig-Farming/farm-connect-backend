import { Router } from "express";
import scoreController from "../controllers/scoreController";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { requirePermission } from "../middleware/permissions";
import {
  ACTIONS,
  RESOURCES,
  createPermissionString,
} from "../constants/permissions";

const router = Router();

router.get("/me", authenticateWithCookies, scoreController.getMyScore);
router.get("/events", authenticateWithCookies, scoreController.getMyEvents);
router.get(
  "/me/stats",
  authenticateWithCookies,
  scoreController.getMyDailyStats
);
router.get("/users/:userId", scoreController.getUserPublicScore);
router.get("/leaderboard", scoreController.getLeaderboard);
router.post(
  "/admin/adjust",
  authenticateWithCookies,
  requirePermission(createPermissionString(ACTIONS.MANAGE, RESOURCES.POINTS)),
  scoreController.adminAdjust
);
router.post(
  "/admin/promote-moderator",
  authenticateWithCookies,
  requirePermission(createPermissionString(ACTIONS.MANAGE, RESOURCES.POINTS)),
  scoreController.promoteModerator
);

export default router;
