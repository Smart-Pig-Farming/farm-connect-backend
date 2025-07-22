import User from "../models/User";
import Role from "../models/Role";
import Permission from "../models/Permission";
import RolePermission from "../models/RolePermission";
import Action from "../models/Action";
import Resource from "../models/Resource";
import {
  ACTIONS,
  RESOURCES,
  createPermissionString,
} from "../constants/permissions";

// TypeScript interfaces for proper type safety
interface UserWithRole extends User {
  role?: Role & {
    permissions?: Permission[];
  };
}

export interface UserPermissionInfo {
  userId: number;
  permissions: string[];
  roles: string[];
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

class PermissionService {
  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    try {
      const user = (await User.findByPk(userId, {
        include: [
          {
            model: Role,
            as: "role",
            include: [
              {
                model: Permission,
                as: "permissions",
                through: { attributes: [] },
              },
            ],
          },
        ],
      })) as UserWithRole | null;

      if (!user || !user.role) {
        return [];
      }

      return (
        user.role.permissions?.map(
          (permission: Permission) => permission.name
        ) || []
      );
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: number,
    permission: string
  ): Promise<PermissionCheckResult> {
    try {
      const userPermissions = await this.getUserPermissions(userId);

      // Direct permission check
      if (userPermissions.includes(permission)) {
        return { hasPermission: true };
      }

      // Check for MANAGE permissions (MANAGE implies all CRUD operations)
      const [action, resource] = permission.split(":");
      const managePermission = createPermissionString(
        ACTIONS.MANAGE,
        resource as any
      );

      if (userPermissions.includes(managePermission)) {
        return {
          hasPermission: true,
          reason: "MANAGE permission covers this action",
        };
      }

      return { hasPermission: false, reason: "Permission not found" };
    } catch (error) {
      console.error("Error checking permission:", error);
      return { hasPermission: false, reason: "Error checking permission" };
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: number,
    permissions: string[]
  ): Promise<PermissionCheckResult> {
    try {
      for (const permission of permissions) {
        const result = await this.hasPermission(userId, permission);
        if (result.hasPermission) {
          return result;
        }
      }
      return {
        hasPermission: false,
        reason: "None of the required permissions found",
      };
    } catch (error) {
      console.error("Error checking any permission:", error);
      return { hasPermission: false, reason: "Error checking permissions" };
    }
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    userId: number,
    permissions: string[]
  ): Promise<PermissionCheckResult> {
    try {
      for (const permission of permissions) {
        const result = await this.hasPermission(userId, permission);
        if (!result.hasPermission) {
          return {
            hasPermission: false,
            reason: `Missing permission: ${permission}`,
          };
        }
      }
      return { hasPermission: true };
    } catch (error) {
      console.error("Error checking all permissions:", error);
      return { hasPermission: false, reason: "Error checking permissions" };
    }
  }

  /**
   * Get user permission info (for frontend caching)
   */
  async getUserPermissionInfo(userId: number): Promise<UserPermissionInfo> {
    try {
      const user = (await User.findByPk(userId, {
        include: [
          {
            model: Role,
            as: "role",
            include: [
              {
                model: Permission,
                as: "permissions",
                through: { attributes: [] },
              },
            ],
          },
        ],
      })) as UserWithRole | null;

      if (!user || !user.role) {
        return { userId, permissions: [], roles: [] };
      }

      return {
        userId,
        permissions:
          user.role.permissions?.map(
            (permission: Permission) => permission.name
          ) || [],
        roles: [user.role.name],
      };
    } catch (error) {
      console.error("Error getting user permission info:", error);
      return { userId, permissions: [], roles: [] };
    }
  }

  /**
   * Get all actions
   */
  async getAllActions(): Promise<Action[]> {
    try {
      return await Action.findAll({
        where: { is_active: true },
        order: [["name", "ASC"]],
      });
    } catch (error) {
      console.error("Error getting actions:", error);
      throw error;
    }
  }

  /**
   * Get all resources
   */
  async getAllResources(): Promise<Resource[]> {
    try {
      return await Resource.findAll({
        where: { is_active: true },
        order: [["name", "ASC"]],
      });
    } catch (error) {
      console.error("Error getting resources:", error);
      throw error;
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await Permission.findAll({
        where: { is_active: true },
        include: [
          { model: Action, as: "action" },
          { model: Resource, as: "resource" },
        ],
        order: [["name", "ASC"]],
      });
    } catch (error) {
      console.error("Error getting permissions:", error);
      throw error;
    }
  }
}

export default new PermissionService();
