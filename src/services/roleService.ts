import Role from "../models/Role";
import Permission from "../models/Permission";
import RolePermission from "../models/RolePermission";
import Action from "../models/Action";
import Resource from "../models/Resource";
import User from "../models/User";
import { literal } from "sequelize";

class RoleService {
  /**
   * Get all roles with user counts and permissions
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      return await Role.findAll({
        attributes: [
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt",
          [
            literal(
              '(SELECT COUNT(*) FROM users WHERE users.role_id = "Role"."id")'
            ),
            "userCount",
          ],
        ],
        include: [
          {
            model: Permission,
            as: "permissions",
            through: { attributes: [] }, // Don't include junction table attributes
            include: [
              { model: Action, as: "action" },
              { model: Resource, as: "resource" },
            ],
          },
        ],
        order: [["name", "ASC"]],
      });
    } catch (error) {
      console.error("Error getting roles:", error);
      throw error;
    }
  }

  /**
   * Create a new role
   */
  async createRole(name: string, description?: string): Promise<Role> {
    try {
      return await Role.create({
        name,
        description: description || "",
      });
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: number,
    name: string,
    description?: string
  ): Promise<Role | null> {
    try {
      await Role.update(
        { name, description: description || "" },
        { where: { id: roleId } }
      );
      return await Role.findByPk(roleId);
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }

  /**
   * Delete a role (hard delete)
   */
  async deleteRole(roleId: number): Promise<void> {
    try {
      await Role.destroy({
        where: { id: roleId },
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    }
  }

  /**
   * Get role with permissions
   */
  async getRoleWithPermissions(roleId: number): Promise<Role | null> {
    try {
      return await Role.findByPk(roleId, {
        include: [
          {
            model: Permission,
            as: "permissions",
            through: { attributes: [] },
            include: [
              { model: Action, as: "action" },
              { model: Resource, as: "resource" },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("Error getting role with permissions:", error);
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: number,
    permissionIds: number[]
  ): Promise<void> {
    try {
      // Remove existing permissions
      await RolePermission.destroy({
        where: { role_id: roleId },
      });

      // Add new permissions
      const rolePermissions = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      }));

      await RolePermission.bulkCreate(rolePermissions);
    } catch (error) {
      console.error("Error updating role permissions:", error);
      throw error;
    }
  }
}

export default new RoleService();
