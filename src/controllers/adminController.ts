import { Request, Response } from "express";
import permissionService from "../services/permissionService";
import roleService from "../services/roleService";
import Action from "../models/Action";
import Resource from "../models/Resource";
import Permission from "../models/Permission";
import Role from "../models/Role";
import { createPermissionString } from "../constants/permissions";

class AdminController {
  /**
   * Get all actions
   */
  async getActions(req: Request, res: Response): Promise<void> {
    try {
      const actions = await permissionService.getAllActions();

      res.status(200).json({
        success: true,
        data: actions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch actions",
        code: "FETCH_ACTIONS_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get all resources
   */
  async getResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = await permissionService.getAllResources();

      res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch resources",
        code: "FETCH_RESOURCES_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get all permissions
   */
  async getPermissions(req: Request, res: Response): Promise<void> {
    try {
      const permissions = await permissionService.getAllPermissions();

      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch permissions",
        code: "FETCH_PERMISSIONS_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get all roles
   */
  async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await roleService.getAllRoles();

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch roles",
        code: "FETCH_ROLES_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get role with permissions
   */
  async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;

      if (!roleId || isNaN(Number(roleId))) {
        res.status(400).json({
          success: false,
          error: "Valid role ID is required",
          code: "INVALID_ROLE_ID",
        });
        return;
      }

      const role = await roleService.getRoleWithPermissions(Number(roleId));

      if (!role) {
        res.status(404).json({
          success: false,
          error: "Role not found",
          code: "ROLE_NOT_FOUND",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          role: {
            id: role.id,
            name: role.name,
            description: role.description,
          },
          permissions: (role as any).permissions || [],
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch role permissions",
        code: "FETCH_ROLE_PERMISSIONS_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;

      if (!roleId || isNaN(Number(roleId))) {
        res.status(400).json({
          success: false,
          error: "Valid role ID is required",
          code: "INVALID_ROLE_ID",
        });
        return;
      }

      if (!Array.isArray(permissionIds)) {
        res.status(400).json({
          success: false,
          error: "Permission IDs must be an array",
          code: "INVALID_PERMISSION_IDS",
        });
        return;
      }

      await roleService.updateRolePermissions(Number(roleId), permissionIds);

      res.status(200).json({
        success: true,
        message: "Role permissions updated successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update role permissions",
        code: "UPDATE_ROLE_PERMISSIONS_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get user permissions (for debugging/admin purposes)
   */
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(Number(userId))) {
        res.status(400).json({
          success: false,
          error: "Valid user ID is required",
          code: "INVALID_USER_ID",
        });
        return;
      }

      const permissionInfo = await permissionService.getUserPermissionInfo(
        Number(userId)
      );

      res.status(200).json({
        success: true,
        data: permissionInfo,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch user permissions",
        code: "FETCH_USER_PERMISSIONS_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Create new action
   */
  async createAction(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name || !description) {
        res.status(400).json({
          success: false,
          error: "Name and description are required",
          code: "INVALID_ACTION_DATA",
        });
        return;
      }

      // Check if action already exists
      const existingAction = await Action.findOne({ where: { name } });
      if (existingAction) {
        res.status(409).json({
          success: false,
          error: "Action already exists",
          code: "ACTION_ALREADY_EXISTS",
        });
        return;
      }

      const action = await Action.create({
        name: name.trim(),
        description: description.trim(),
        is_active: true,
      });

      res.status(201).json({
        success: true,
        data: action,
        message: "Action created successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to create action",
        code: "CREATE_ACTION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Update action
   */
  async updateAction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid action ID is required",
          code: "INVALID_ACTION_ID",
        });
        return;
      }

      const action = await Action.findByPk(Number(id));
      if (!action) {
        res.status(404).json({
          success: false,
          error: "Action not found",
          code: "ACTION_NOT_FOUND",
        });
        return;
      }

      // Check if new name conflicts with existing action
      if (name && name !== action.name) {
        const existingAction = await Action.findOne({ where: { name } });
        if (existingAction) {
          res.status(409).json({
            success: false,
            error: "Action name already exists",
            code: "ACTION_NAME_CONFLICT",
          });
          return;
        }
      }

      await action.update({
        name: name?.trim() || action.name,
        description: description?.trim() || action.description,
        is_active: is_active !== undefined ? is_active : action.is_active,
      });

      res.status(200).json({
        success: true,
        data: action,
        message: "Action updated successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update action",
        code: "UPDATE_ACTION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Delete action
   */
  async deleteAction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid action ID is required",
          code: "INVALID_ACTION_ID",
        });
        return;
      }

      const action = await Action.findByPk(Number(id));
      if (!action) {
        res.status(404).json({
          success: false,
          error: "Action not found",
          code: "ACTION_NOT_FOUND",
        });
        return;
      }

      // Check if action is used in any permissions
      const permissionCount = await Permission.count({
        where: { action_id: Number(id) },
      });

      if (permissionCount > 0) {
        res.status(409).json({
          success: false,
          error: "Cannot delete action that is used in permissions",
          code: "ACTION_IN_USE",
          details: `This action is used in ${permissionCount} permission(s)`,
        });
        return;
      }

      await action.destroy();

      res.status(200).json({
        success: true,
        message: "Action deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to delete action",
        code: "DELETE_ACTION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Create new resource
   */
  async createResource(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name || !description) {
        res.status(400).json({
          success: false,
          error: "Name and description are required",
          code: "INVALID_RESOURCE_DATA",
        });
        return;
      }

      // Check if resource already exists
      const existingResource = await Resource.findOne({ where: { name } });
      if (existingResource) {
        res.status(409).json({
          success: false,
          error: "Resource already exists",
          code: "RESOURCE_ALREADY_EXISTS",
        });
        return;
      }

      const resource = await Resource.create({
        name: name.trim(),
        description: description.trim(),
        is_active: true,
      });

      res.status(201).json({
        success: true,
        data: resource,
        message: "Resource created successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to create resource",
        code: "CREATE_RESOURCE_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Update resource
   */
  async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid resource ID is required",
          code: "INVALID_RESOURCE_ID",
        });
        return;
      }

      const resource = await Resource.findByPk(Number(id));
      if (!resource) {
        res.status(404).json({
          success: false,
          error: "Resource not found",
          code: "RESOURCE_NOT_FOUND",
        });
        return;
      }

      // Check if new name conflicts with existing resource
      if (name && name !== resource.name) {
        const existingResource = await Resource.findOne({ where: { name } });
        if (existingResource) {
          res.status(409).json({
            success: false,
            error: "Resource name already exists",
            code: "RESOURCE_NAME_CONFLICT",
          });
          return;
        }
      }

      await resource.update({
        name: name?.trim() || resource.name,
        description: description?.trim() || resource.description,
        is_active: is_active !== undefined ? is_active : resource.is_active,
      });

      res.status(200).json({
        success: true,
        data: resource,
        message: "Resource updated successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update resource",
        code: "UPDATE_RESOURCE_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Delete resource
   */
  async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid resource ID is required",
          code: "INVALID_RESOURCE_ID",
        });
        return;
      }

      const resource = await Resource.findByPk(Number(id));
      if (!resource) {
        res.status(404).json({
          success: false,
          error: "Resource not found",
          code: "RESOURCE_NOT_FOUND",
        });
        return;
      }

      // Check if resource is used in any permissions
      const permissionCount = await Permission.count({
        where: { resource_id: Number(id) },
      });

      if (permissionCount > 0) {
        res.status(409).json({
          success: false,
          error: "Cannot delete resource that is used in permissions",
          code: "RESOURCE_IN_USE",
          details: `This resource is used in ${permissionCount} permission(s)`,
        });
        return;
      }

      await resource.destroy();

      res.status(200).json({
        success: true,
        message: "Resource deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to delete resource",
        code: "DELETE_RESOURCE_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Create new permission
   */
  async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { action, resource, description } = req.body;

      if (!action || !resource || !description) {
        res.status(400).json({
          success: false,
          error: "Action, resource, and description are required",
          code: "INVALID_PERMISSION_DATA",
        });
        return;
      }

      // Validate action exists
      const actionRecord = await Action.findOne({ where: { name: action } });
      if (!actionRecord) {
        res.status(404).json({
          success: false,
          error: "Action not found",
          code: "ACTION_NOT_FOUND",
        });
        return;
      }

      // Validate resource exists
      const resourceRecord = await Resource.findOne({
        where: { name: resource },
      });
      if (!resourceRecord) {
        res.status(404).json({
          success: false,
          error: "Resource not found",
          code: "RESOURCE_NOT_FOUND",
        });
        return;
      }

      // Generate permission name
      const permissionName = createPermissionString(action, resource);

      // Check if permission already exists
      const existingPermission = await Permission.findOne({
        where: { name: permissionName },
      });
      if (existingPermission) {
        res.status(409).json({
          success: false,
          error: "Permission already exists",
          code: "PERMISSION_ALREADY_EXISTS",
        });
        return;
      }

      const permission = await Permission.create({
        name: permissionName,
        description: description.trim(),
        action_id: actionRecord.id,
        resource_id: resourceRecord.id,
        is_active: true,
      });

      // Fetch the created permission with action and resource details
      const createdPermission = await Permission.findByPk(permission.id, {
        include: [
          { model: Action, as: "action" },
          { model: Resource, as: "resource" },
        ],
      });

      res.status(201).json({
        success: true,
        data: createdPermission,
        message: "Permission created successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to create permission",
        code: "CREATE_PERMISSION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Update permission
   */
  async updatePermission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { description, is_active } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid permission ID is required",
          code: "INVALID_PERMISSION_ID",
        });
        return;
      }

      const permission = await Permission.findByPk(Number(id));
      if (!permission) {
        res.status(404).json({
          success: false,
          error: "Permission not found",
          code: "PERMISSION_NOT_FOUND",
        });
        return;
      }

      await permission.update({
        description: description?.trim() || permission.description,
        is_active: is_active !== undefined ? is_active : permission.is_active,
      });

      // Fetch updated permission with action and resource details
      const updatedPermission = await Permission.findByPk(permission.id, {
        include: [
          { model: Action, as: "action" },
          { model: Resource, as: "resource" },
        ],
      });

      res.status(200).json({
        success: true,
        data: updatedPermission,
        message: "Permission updated successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update permission",
        code: "UPDATE_PERMISSION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Delete permission
   */
  async deletePermission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: "Valid permission ID is required",
          code: "INVALID_PERMISSION_ID",
        });
        return;
      }

      const permission = await Permission.findByPk(Number(id));
      if (!permission) {
        res.status(404).json({
          success: false,
          error: "Permission not found",
          code: "PERMISSION_NOT_FOUND",
        });
        return;
      }

      // Check if permission is used in any role permissions
      const rolePermissionCount = await Permission.count({
        include: [
          {
            model: Role,
            as: "roles",
            through: { attributes: [] },
          },
        ],
        where: { id: Number(id) },
      });

      if (rolePermissionCount > 0) {
        res.status(409).json({
          success: false,
          error: "Cannot delete permission that is assigned to roles",
          code: "PERMISSION_IN_USE",
          details: "This permission is assigned to one or more roles",
        });
        return;
      }

      await permission.destroy();

      res.status(200).json({
        success: true,
        message: "Permission deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to delete permission",
        code: "DELETE_PERMISSION_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Create a new role
   */
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({
          success: false,
          error: "Role name is required and must be a non-empty string",
          code: "INVALID_ROLE_NAME",
        });
        return;
      }

      const role = await roleService.createRole(name.trim(), description);

      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to create role",
        code: "CREATE_ROLE_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Update a role
   */
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({
          success: false,
          error: "Role name is required and must be a non-empty string",
          code: "INVALID_ROLE_NAME",
        });
        return;
      }

      const role = await roleService.updateRole(
        parseInt(id),
        name.trim(),
        description
      );

      if (!role) {
        res.status(404).json({
          success: false,
          error: "Role not found",
          code: "ROLE_NOT_FOUND",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update role",
        code: "UPDATE_ROLE_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await roleService.deleteRole(parseInt(id));

      res.status(200).json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to delete role",
        code: "DELETE_ROLE_FAILED",
        details: error.message,
      });
    }
  }
}

export default new AdminController();
