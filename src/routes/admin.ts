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
router.post(
  "/actions",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.createAction
);
router.put(
  "/actions/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.updateAction
);
router.delete(
  "/actions/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.deleteAction
);

router.get(
  "/resources",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.getResources
);
router.post(
  "/resources",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.createResource
);
router.put(
  "/resources/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.updateResource
);
router.delete(
  "/resources/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.deleteResource
);

router.get(
  "/permissions",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.getPermissions
);
router.post(
  "/permissions",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.createPermission
);
router.put(
  "/permissions/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.updatePermission
);
router.delete(
  "/permissions/:id",
  requirePermission("MANAGE:PERMISSIONS"),
  adminController.deletePermission
);

// Routes for role management
router.get(
  "/roles",
  requirePermission("MANAGE:ROLES"),
  adminController.getRoles
);
router.post(
  "/roles",
  requirePermission("MANAGE:ROLES"),
  adminController.createRole
);
router.put(
  "/roles/:id",
  requirePermission("MANAGE:ROLES"),
  adminController.updateRole
);
router.delete(
  "/roles/:id",
  requirePermission("MANAGE:ROLES"),
  adminController.deleteRole
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
