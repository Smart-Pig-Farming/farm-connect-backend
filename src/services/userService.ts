import { Op, WhereOptions, FindOptions } from "sequelize";
import User from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";

// Interface for user search and filtering
export interface UserFilters {
  search?: string;
  status?: "all" | "active" | "locked" | "unverified";
  role?: string;
  roleId?: number;
}

// Interface for pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Interface for user list response
export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Interface for user creation
export interface CreateUserData {
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  password: string;
  organization?: string;
  sector?: string;
  district?: string;
  province?: string;
  role_id: number;
  level_id?: number;
}

// Interface for user update
export interface UpdateUserData {
  firstname?: string;
  lastname?: string;
  email?: string;
  username?: string;
  organization?: string;
  sector?: string;
  district?: string;
  province?: string;
  role_id?: number;
  level_id?: number;
}

class UserService {
  /**
   * Get users with pagination, search, and filtering
   */
  async getUsers(
    filters: UserFilters = {},
    pagination: PaginationParams = {}
  ): Promise<UserListResponse> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = pagination.offset || (page - 1) * limit;

      // Build where conditions
      const where: WhereOptions = {};

      // Search functionality
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        (where as any)[Op.or] = [
          {
            firstname: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            lastname: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            email: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
          {
            username: {
              [Op.iLike]: `%${searchTerm}%`,
            },
          },
        ];
      }

      // Status filtering
      if (filters.status && filters.status !== "all") {
        switch (filters.status) {
          case "active":
            where.is_verified = true;
            where.is_locked = false;
            break;
          case "locked":
            where.is_locked = true;
            break;
          case "unverified":
            where.is_verified = false;
            break;
        }
      }

      // Role filtering
      if (filters.roleId) {
        where.role_id = filters.roleId;
      } else if (filters.role && filters.role !== "all") {
        // Add filtering by role name using include where clause
        // This will be handled in the include section below
      }

      // Query options
      const queryOptions: FindOptions = {
        where,
        limit,
        offset,
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "description"],
            where:
              filters.role && filters.role !== "all"
                ? { name: filters.role }
                : undefined,
            required: filters.role && filters.role !== "all" ? true : false,
          },
          {
            model: Level,
            as: "level",
            attributes: ["id", "name", "description"],
          },
        ],
      };

      // Execute query
      const { count, rows } = await User.findAndCountAll(queryOptions);

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        users: rows,
        pagination: {
          page,
          limit,
          totalCount: count,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      return await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["id", "name", "description"],
          },
          {
            model: Level,
            as: "level",
            attributes: ["id", "name", "description"],
          },
        ],
      });
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const user = await User.create({
        ...userData,
        points: 0,
        is_locked: false,
        is_verified: false,
        level_id: userData.level_id || 1, // Default to level 1
      });

      // Return user with associations
      return (await this.getUserById(user.id)) as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, userData: UpdateUserData): Promise<User | null> {
    try {
      await User.update(userData, {
        where: { id },
      });

      return await this.getUserById(id);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const deletedCount = await User.destroy({
        where: { id },
      });

      return deletedCount > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  /**
   * Lock or unlock user
   */
  async toggleUserLock(id: number): Promise<User | null> {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        return null;
      }

      await User.update({ is_locked: !user.is_locked }, { where: { id } });

      return await this.getUserById(id);
    } catch (error) {
      console.error("Error toggling user lock:", error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyUser(id: number): Promise<User | null> {
    try {
      await User.update({ is_verified: true }, { where: { id } });

      return await this.getUserById(id);
    } catch (error) {
      console.error("Error verifying user:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    locked: number;
    unverified: number;
    byRole: { [key: string]: number };
  }> {
    try {
      const [total, active, locked, unverified] = await Promise.all([
        User.count(),
        User.count({ where: { is_verified: true, is_locked: false } }),
        User.count({ where: { is_locked: true } }),
        User.count({ where: { is_verified: false } }),
      ]);

      // Get user count by role
      const usersByRole = await User.findAll({
        attributes: ["role_id"],
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["name"],
          },
        ],
        group: ["role_id", "role.id", "role.name"],
        raw: true,
      });

      const byRole: { [key: string]: number } = {};
      usersByRole.forEach((user: any) => {
        const roleName = user["role.name"];
        byRole[roleName] = (byRole[roleName] || 0) + 1;
      });

      return {
        total,
        active,
        locked,
        unverified,
        byRole,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    try {
      const where: WhereOptions = { email };
      if (excludeUserId) {
        where.id = { [Op.ne]: excludeUserId };
      }

      const count = await User.count({ where });
      return count > 0;
    } catch (error) {
      console.error("Error checking email existence:", error);
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(
    username: string,
    excludeUserId?: number
  ): Promise<boolean> {
    try {
      const where: WhereOptions = { username };
      if (excludeUserId) {
        where.id = { [Op.ne]: excludeUserId };
      }

      const count = await User.count({ where });
      return count > 0;
    } catch (error) {
      console.error("Error checking username existence:", error);
      throw error;
    }
  }
}

export default new UserService();
