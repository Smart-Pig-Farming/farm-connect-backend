/**
 * @swagger
 * components:
 *   schemas:
 *     Action:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "CREATE"
 *           description: "Action name (CREATE, READ, UPDATE, DELETE, MANAGE, etc.)"
 *         description:
 *           type: string
 *           example: "Create new resources"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Resource:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "USERS"
 *           description: "Resource name (USERS, POSTS, QUIZZES, etc.)"
 *         description:
 *           type: string
 *           example: "User management resources"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         action_id:
 *           type: integer
 *           example: 1
 *         resource_id:
 *           type: integer
 *           example: 1
 *         permission_string:
 *           type: string
 *           example: "CREATE:USERS"
 *           description: "Formatted permission string"
 *         action:
 *           $ref: '#/components/schemas/Action'
 *         resource:
 *           $ref: '#/components/schemas/Resource'
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "admin"
 *           description: "Role name (admin, moderator, farmer, expert)"
 *         description:
 *           type: string
 *           example: "System administrator with full access"
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Permission'
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     AdminUser:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 123
 *         email:
 *           type: string
 *           format: email
 *           example: "farmer@example.com"
 *         phone_number:
 *           type: string
 *           example: "+250788123456"
 *         first_name:
 *           type: string
 *           example: "Jean"
 *         last_name:
 *           type: string
 *           example: "Uwimana"
 *         role:
 *           type: string
 *           example: "farmer"
 *           enum:
 *             - farmer
 *             - moderator
 *             - admin
 *             - expert
 *         farm_name:
 *           type: string
 *           example: "Green Valley Farm"
 *         province:
 *           type: string
 *           example: "Kigali"
 *         district:
 *           type: string
 *           example: "Gasabo"
 *         is_verified:
 *           type: boolean
 *           example: true
 *         is_locked:
 *           type: boolean
 *           example: false
 *         last_login:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     CreateUserRequest:
 *       type: object
 *       required: [email, first_name, last_name, role]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "newuser@example.com"
 *         phone_number:
 *           type: string
 *           example: "+250788123456"
 *         first_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Jean"
 *         last_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Uwimana"
 *         role:
 *           type: string
 *           example: "farmer"
 *           enum:
 *             - farmer
 *             - moderator
 *             - admin
 *             - expert
 *         farm_name:
 *           type: string
 *           maxLength: 100
 *           example: "Green Valley Farm"
 *         province:
 *           type: string
 *           example: "Kigali"
 *         district:
 *           type: string
 *           example: "Gasabo"
 *         send_credentials:
 *           type: boolean
 *           default: true
 *           description: "Whether to send login credentials via email"
 *
 *     UserStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 1247
 *         verified:
 *           type: integer
 *           example: 1156
 *         unverified:
 *           type: integer
 *           example: 91
 *         locked:
 *           type: integer
 *           example: 12
 *         active_today:
 *           type: integer
 *           example: 89
 *         active_this_week:
 *           type: integer
 *           example: 342
 *         registered_today:
 *           type: integer
 *           example: 7
 *         by_role:
 *           type: object
 *           properties:
 *             farmer:
 *               type: integer
 *               example: 1189
 *             moderator:
 *               type: integer
 *               example: 15
 *             admin:
 *               type: integer
 *               example: 3
 *             expert:
 *               type: integer
 *               example: 40
 */

import { Router } from "express";
import adminController from "../controllers/adminController";
import { requirePermission } from "../middleware/permissions";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import discussionModerationController from "../controllers/discussionModerationController";
import { param, body } from "express-validator";
import { handleValidationErrors } from "../middleware/validation";

const router = Router();

// All admin routes require authentication
router.use(authenticateWithCookies);

/**
 * @swagger
 * /api/admin/actions:
 *   get:
 *     summary: Get all permission actions
 *     description: Retrieve all available actions for the permission system
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Action'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:PERMISSIONS)
 *
 *   post:
 *     summary: Create new permission action
 *     description: Create a new action for the permission system
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "MODERATE"
 *               description:
 *                 type: string
 *                 example: "Moderate content and users"
 *     responses:
 *       201:
 *         description: Action created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Action created successfully"
 *                 action:
 *                   $ref: '#/components/schemas/Action'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Action already exists
 */

/**
 * @swagger
 * /api/admin/actions/{id}:
 *   put:
 *     summary: Update permission action
 *     description: Update an existing permission action
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Action ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "MODERATE"
 *               description:
 *                 type: string
 *                 example: "Moderate content and users"
 *     responses:
 *       200:
 *         description: Action updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Action not found
 *
 *   delete:
 *     summary: Delete permission action
 *     description: Delete a permission action (if not in use)
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Action ID
 *     responses:
 *       200:
 *         description: Action deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Action not found
 *       409:
 *         description: Action in use and cannot be deleted
 */

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

/**
 * @swagger
 * /api/admin/resources:
 *   get:
 *     summary: Get all permission resources
 *     description: Retrieve all available resources for the permission system
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:PERMISSIONS)
 *
 *   post:
 *     summary: Create new permission resource
 *     description: Create a new resource for the permission system
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "REPORTS"
 *               description:
 *                 type: string
 *                 example: "System reports and analytics"
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Resource created successfully"
 *                 resource:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Resource already exists
 */

/**
 * @swagger
 * /api/admin/resources/{id}:
 *   put:
 *     summary: Update permission resource
 *     description: Update an existing permission resource
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resource ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "REPORTS"
 *               description:
 *                 type: string
 *                 example: "System reports and analytics"
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Resource not found
 *
 *   delete:
 *     summary: Delete permission resource
 *     description: Delete a permission resource (if not in use)
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Resource not found
 *       409:
 *         description: Resource in use and cannot be deleted
 */

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

/**
 * @swagger
 * /api/admin/permissions:
 *   get:
 *     summary: Get all permissions
 *     description: Retrieve all permissions (action-resource combinations)
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:PERMISSIONS)
 *
 *   post:
 *     summary: Create new permission
 *     description: Create a new permission by combining an action and resource
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action_id, resource_id]
 *             properties:
 *               action_id:
 *                 type: integer
 *                 example: 1
 *               resource_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Permission already exists
 */

/**
 * @swagger
 * /api/admin/permissions/{id}:
 *   put:
 *     summary: Update permission
 *     description: Update an existing permission
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action_id:
 *                 type: integer
 *                 example: 1
 *               resource_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Permission not found
 *
 *   delete:
 *     summary: Delete permission
 *     description: Delete a permission (if not assigned to roles)
 *     tags: [Admin - Permissions]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission in use and cannot be deleted
 */

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve all roles with their permissions
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:ROLES)
 *
 *   post:
 *     summary: Create new role
 *     description: Create a new role in the system
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "veterinarian"
 *               description:
 *                 type: string
 *                 example: "Veterinarian with medical expertise"
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Role already exists
 */

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   put:
 *     summary: Update role
 *     description: Update an existing role
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "veterinarian"
 *               description:
 *                 type: string
 *                 example: "Veterinarian with medical expertise"
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *
 *   delete:
 *     summary: Delete role
 *     description: Delete a role (if no users are assigned to it)
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role has users and cannot be deleted
 */

/**
 * @swagger
 * /api/admin/roles/{roleId}/permissions:
 *   get:
 *     summary: Get role permissions
 *     description: Get all permissions assigned to a specific role
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 *
 *   put:
 *     summary: Update role permissions
 *     description: Update all permissions for a specific role
 *     tags: [Admin - Role Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permission_ids]
 *             properties:
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 5, 8, 12]
 *                 description: "Array of permission IDs to assign to this role"
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Role permissions updated successfully"
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error or invalid permission IDs
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Role not found
 */

/**
 * @swagger
 * /api/admin/users/{userId}/permissions:
 *   get:
 *     summary: Get user permissions
 *     description: |
 *       Get all permissions for a specific user (for debugging purposes).
 *       Shows both role-based and directly assigned permissions.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["CREATE:POSTS", "READ:POSTS", "UPDATE:OWN_POSTS"]
 *                 role_permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:USERS)
 *       404:
 *         description: User not found
 */

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

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with admin details
 *     description: |
 *       Retrieve all users with pagination, search, and filtering.
 *       Provides comprehensive user information for administrative purposes.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
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
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, or phone
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum:
 *             - farmer
 *             - moderator
 *             - admin
 *             - expert
 *         description: Filter by user role
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: Filter by district
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: locked
 *         schema:
 *           type: boolean
 *         description: Filter by lock status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum:
 *             - created_at
 *             - last_login
 *             - name
 *             - email
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminUser'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:USERS)
 *
 *   post:
 *     summary: Create new user
 *     description: |
 *       Create a new user account with admin privileges.
 *       Optionally sends login credentials to the user's email.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User created successfully"
 *                 user:
 *                   $ref: '#/components/schemas/AdminUser'
 *                 credentials_sent:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Validation error or duplicate email/phone
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve detailed information for a specific user
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:USERS)
 *       404:
 *         description: User not found
 *
 *   put:
 *     summary: Update user
 *     description: Update user information with admin privileges
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               role:
 *                 type: string
 *                 enum:
 *                   - farmer
 *                   - moderator
 *                   - admin
 *                   - expert
 *               farm_name:
 *                 type: string
 *                 maxLength: 100
 *               province:
 *                 type: string
 *               district:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *
 *   delete:
 *     summary: Delete user
 *     description: |
 *       Soft delete a user account. This deactivates the account but preserves
 *       data for audit purposes.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /api/admin/users/{id}/lock:
 *   patch:
 *     summary: Lock or unlock user account
 *     description: |
 *       Toggle the lock status of a user account. Locked users cannot log in.
 *       This is useful for temporary account suspension.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locked]
 *             properties:
 *               locked:
 *                 type: boolean
 *                 example: true
 *                 description: "True to lock, false to unlock"
 *               reason:
 *                 type: string
 *                 example: "Suspicious activity detected"
 *                 description: "Reason for locking (optional)"
 *     responses:
 *       200:
 *         description: User lock status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User locked successfully"
 *                 user:
 *                   $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /api/admin/users/{id}/verify:
 *   patch:
 *     summary: Verify user email
 *     description: Manually verify a user's email address
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User verified successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User already verified
 */
/**
 * @swagger
 * /api/admin/users/{id}/resend-credentials:
 *   post:
 *     summary: Resend user login credentials
 *     description: |
 *       Resend login credentials to a user's email address.
 *       Useful when users have lost their login information.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Credentials sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Credentials sent successfully"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to send email
 */
/**
 * @swagger
 * /api/admin/users-stats:
 *   get:
 *     summary: Get user statistics
 *     description: |
 *       Get comprehensive statistics about users in the system.
 *       Includes totals, activity metrics, and role breakdowns.
 *     tags: [Admin - User Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MANAGE:USERS)
 */

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

// ***** DISCUSSION MODERATION ROUTES *****

/**
 * @swagger
 * /api/admin/discussions/posts/{id}/approve:
 *   patch:
 *     summary: Approve discussion post
 *     description: |
 *       Approve a discussion post that was pending moderation.
 *       Approved posts become visible to all users.
 *     tags: [Admin - Content Moderation]
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
 *         description: Discussion post ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moderator_comment:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Content meets community guidelines"
 *                 description: "Optional moderator comment"
 *     responses:
 *       200:
 *         description: Post approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post approved successfully"
 *                 post:
 *                   $ref: '#/components/schemas/DiscussionPost'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MODERATE:POSTS)
 *       404:
 *         description: Post not found
 *       409:
 *         description: Post already approved or rejected
 */
/**
 * @swagger
 * /api/admin/discussions/posts/{id}/reject:
 *   patch:
 *     summary: Reject discussion post
 *     description: |
 *       Reject a discussion post that was pending moderation.
 *       Rejected posts are hidden from users and flagged for review.
 *     tags: [Admin - Content Moderation]
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
 *         description: Discussion post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 enum:
 *                   - spam
 *                   - inappropriate
 *                   - off-topic
 *                   - misinformation
 *                   - harassment
 *                   - other
 *                 example: "inappropriate"
 *                 description: "Reason for rejection"
 *               moderator_comment:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Content violates community guidelines regarding appropriate language"
 *                 description: "Detailed moderator comment"
 *     responses:
 *       200:
 *         description: Post rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post rejected successfully"
 *                 post:
 *                   $ref: '#/components/schemas/DiscussionPost'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires MODERATE:POSTS)
 *       404:
 *         description: Post not found
 *       409:
 *         description: Post already approved or rejected
 */

// Approve a discussion post
router.patch(
  "/discussions/posts/:id/approve",
  requirePermission("MODERATE:POSTS"),
  param("id").isUUID().withMessage("ID must be a valid UUID"),
  handleValidationErrors,
  discussionModerationController.approvePost
);

// Reject a discussion post
router.patch(
  "/discussions/posts/:id/reject",
  requirePermission("MODERATE:POSTS"),
  param("id").isUUID().withMessage("ID must be a valid UUID"),
  handleValidationErrors,
  discussionModerationController.rejectPost
);

export default router;
