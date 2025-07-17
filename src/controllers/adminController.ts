import { Request, Response } from "express";
import permissionService from "../services/permissionService";

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

      const role = await permissionService.getRoleWithPermissions(
        Number(roleId)
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

      await permissionService.updateRolePermissions(
        Number(roleId),
        permissionIds
      );

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
}

export default new AdminController();
