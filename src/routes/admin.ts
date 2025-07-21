import { Router } from "express";
import adminController from "../controllers/adminController";
import { requirePermission } from "../middleware/permissions";
import { authenticateWithCookies } from "../middleware/cookieAuth";

const router = Router();

// All admin routes require authentication
router.use(authenticateWithCookies);

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

// ***** USER MANAGEMENT ROUTES *****

// Get all users with pagination, search, and filtering
router.get(
  "/users",
  requirePermission("MANAGE:USERS"),
  adminController.getUsers
);

// Get user by ID
router.get(
  "/users/:id",
  requirePermission("MANAGE:USERS"),
  adminController.getUserById
);

// Create new user
router.post(
  "/users",
  requirePermission("MANAGE:USERS"),
  adminController.createUser
);

// Update user
router.put(
  "/users/:id",
  requirePermission("MANAGE:USERS"),
  adminController.updateUser
);

// Delete user
router.delete(
  "/users/:id",
  requirePermission("MANAGE:USERS"),
  adminController.deleteUser
);

// Lock/unlock user
router.patch(
  "/users/:id/lock",
  requirePermission("MANAGE:USERS"),
  adminController.toggleUserLock
);

// Verify user email
router.patch(
  "/users/:id/verify",
  requirePermission("MANAGE:USERS"),
  adminController.verifyUser
);

// Resend user credentials
router.post(
  "/users/:id/resend-credentials",
  requirePermission("MANAGE:USERS"),
  adminController.resendUserCredentials
);

// Get user statistics
router.get(
  "/users-stats",
  requirePermission("MANAGE:USERS"),
  adminController.getUserStats
);

export default router;
