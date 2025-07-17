import { Router } from "express";
import adminController from "../controllers/adminController";
import { requirePermission } from "../middleware/permissions";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// Routes for actions, resources, and permissions metadata
router.get(
  "/actions",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.getActions
);
router.get(
  "/resources",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.getResources
);
router.get(
  "/permissions",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.getPermissions
);

// Routes for role permission management
router.get(
  "/roles/:roleId/permissions",
  requirePermission("MANAGE:ROLES"),
  adminController.getRolePermissions
);
router.put(
  "/roles/:roleId/permissions",
  requirePermission("MANAGE:ROLES"),
  adminController.updateRolePermissions
);

// Route for debugging user permissions
router.get(
  "/users/:userId/permissions",
  requirePermission("MANAGE:USERS"),
  adminController.getUserPermissions
);

export default router;
