import { Op, WhereOptions, FindOptions } from "sequelize";
import sequelize from "../config/database";
import User, { UserAttributes } from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";
import {
  Quiz,
  QuizAttempt,
  PasswordResetToken,
  Content,
  ContentReaction,
  BestPracticeContent,
  DiscussionPost,
  DiscussionReply,
  UserVote,
  ContentReport,
  ReportRateLimit,
  BestPracticeRead,
  Notification,
  ScoreEvent,
  UserScoreTotal,
} from "../models";

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
      const whereConditions: WhereOptions[] = [];

      // Search functionality
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        whereConditions.push({
          [Op.or]: [
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
          ],
        });
      }

      // Status filtering
      if (filters.status && filters.status !== "all") {
        switch (filters.status) {
          case "active":
            whereConditions.push({
              is_verified: true,
              is_locked: false,
            });
            break;
          case "locked":
            whereConditions.push({
              is_locked: true,
            });
            break;
          case "unverified":
            whereConditions.push({
              is_verified: false,
            });
            break;
        }
      }

      // Role filtering
      if (filters.roleId) {
        whereConditions.push({
          role_id: filters.roleId,
        });
      }

      // Filter out system accounts (placeholder and test users)
      whereConditions.push({
        email: {
          [Op.notIn]: ["deleted-user@placeholder.local"],
        },
      });

      // Filter out test users (emails containing 'test.com' or usernames starting with 'testuser')
      whereConditions.push({
        [Op.and]: [
          {
            email: {
              [Op.notILike]: "%@test.com",
            },
          },
          {
            username: {
              [Op.notILike]: "testuser%",
            },
          },
        ],
      });

      // Combine all where conditions with AND
      const where: WhereOptions =
        whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

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
    const transaction = await sequelize.transaction();

    try {
      // Models are now imported at the top of the file

      // First, check if user exists
      const user = await User.findByPk(id, { transaction });
      if (!user) {
        await transaction.rollback();
        return false;
      }

      console.log(`Starting deletion process for user ID ${id}`);

      // Strategy: Delete records that can be safely removed,
      // and set foreign keys to NULL where we want to preserve content

      // 1. Delete user-specific records (safe to delete)
      await PasswordResetToken.destroy({ where: { userId: id }, transaction });
      await QuizAttempt.destroy({ where: { user_id: id }, transaction });
      await ContentReaction.destroy({ where: { user_id: id }, transaction });
      await UserVote.destroy({ where: { user_id: id }, transaction });
      await ReportRateLimit.destroy({
        where: { reporter_id: id },
        transaction,
      });
      await BestPracticeRead.destroy({ where: { user_id: id }, transaction });
      await Notification.destroy({ where: { user_id: id }, transaction });
      await ScoreEvent.destroy({ where: { user_id: id }, transaction });
      await ScoreEvent.destroy({ where: { actor_user_id: id }, transaction });
      await UserScoreTotal.destroy({ where: { user_id: id }, transaction });

      // 2. Handle content preservation - set foreign keys to NULL or reassign
      // For quizzes created by this user - we'll need to decide on strategy
      const userQuizzes = await Quiz.findAll({
        where: { created_by: id },
        transaction,
      });

      if (userQuizzes.length > 0) {
        console.log(
          `Found ${userQuizzes.length} quizzes created by user ${id}`
        );

        // Strategy 1: Find an admin user to reassign quizzes to
        const adminUser = await User.findOne({
          include: [
            {
              model: Role,
              as: "role",
              where: { name: "admin" },
            },
          ],
          transaction,
        });

        if (adminUser) {
          // Reassign quizzes to admin
          await Quiz.update(
            { created_by: adminUser.id },
            { where: { created_by: id }, transaction }
          );
          console.log(
            `Reassigned ${userQuizzes.length} quizzes to admin user ${adminUser.id}`
          );
        } else {
          // If no admin found, we could either delete the quizzes or throw an error
          // For now, let's delete them as they're orphaned
          console.log(
            `No admin user found, deleting ${userQuizzes.length} quizzes`
          );
          await Quiz.destroy({ where: { created_by: id }, transaction });
        }
      }

      // 3. Handle other content - find or create a "Deleted User" placeholder
      let deletedUserPlaceholder = await User.findOne({
        where: { email: "deleted-user@placeholder.local" },
        transaction,
      });

      if (!deletedUserPlaceholder) {
        // Create a placeholder "Deleted User" account
        deletedUserPlaceholder = await User.create(
          {
            email: "deleted-user@placeholder.local",
            username: "deleted-user",
            password: "placeholder-password-" + Date.now(),
            firstname: "Deleted",
            lastname: "User",
            role_id: 1, // Assuming role_id 1 is a basic user role
            level_id: 1, // Assuming level_id 1 is a basic level
            is_verified: true,
            is_locked: true, // Lock this account so it can't be used for login
            points: 0,
          },
          { transaction }
        );
        console.log(
          `Created placeholder user ${deletedUserPlaceholder.id} for content reassignment`
        );
      }

      // Reassign content to placeholder user instead of setting to NULL
      const contentCount = await Content.count({
        where: { user_id: id },
        transaction,
      });
      if (contentCount > 0) {
        await Content.update(
          { user_id: deletedUserPlaceholder.id },
          { where: { user_id: id }, transaction }
        );
        console.log(
          `Reassigned ${contentCount} content records to placeholder user`
        );
      }

      const bestPracticeCount = await BestPracticeContent.count({
        where: { created_by: id },
        transaction,
      });
      if (bestPracticeCount > 0) {
        await BestPracticeContent.update(
          { created_by: deletedUserPlaceholder.id },
          { where: { created_by: id }, transaction }
        );
        console.log(
          `Reassigned ${bestPracticeCount} best practice content records to placeholder user`
        );
      }

      const discussionPostCount = await DiscussionPost.count({
        where: { author_id: id },
        transaction,
      });
      if (discussionPostCount > 0) {
        await DiscussionPost.update(
          { author_id: deletedUserPlaceholder.id },
          { where: { author_id: id }, transaction }
        );
        console.log(
          `Reassigned ${discussionPostCount} discussion posts to placeholder user`
        );
      }

      const discussionReplyCount = await DiscussionReply.count({
        where: { author_id: id },
        transaction,
      });
      if (discussionReplyCount > 0) {
        await DiscussionReply.update(
          { author_id: deletedUserPlaceholder.id },
          { where: { author_id: id }, transaction }
        );
        console.log(
          `Reassigned ${discussionReplyCount} discussion replies to placeholder user`
        );
      }

      // 4. Handle reports - reassign to placeholder user where user was reporter
      const reportCount = await ContentReport.count({
        where: { reporter_id: id },
        transaction,
      });
      if (reportCount > 0) {
        await ContentReport.update(
          { reporter_id: deletedUserPlaceholder.id },
          { where: { reporter_id: id }, transaction }
        );
        console.log(`Reassigned ${reportCount} reports to placeholder user`);
      }

      // For moderator_id, we can leave it undefined (remove the moderator assignment)
      const moderatedReportCount = await ContentReport.count({
        where: { moderator_id: id },
        transaction,
      });
      if (moderatedReportCount > 0) {
        await ContentReport.update(
          { moderator_id: undefined },
          { where: { moderator_id: id }, transaction }
        );
        console.log(
          `Removed moderator assignment from ${moderatedReportCount} reports`
        );
      }

      // 5. Finally, delete the user
      const deletedCount = await User.destroy({
        where: { id },
        transaction,
      });

      await transaction.commit();
      console.log(
        `Successfully deleted user ${id} and handled all related records`
      );
      return deletedCount > 0;
    } catch (error) {
      await transaction.rollback();
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

      // Get user count by role - using a more type-safe approach
      const roles = await Role.findAll({
        attributes: ["id", "name"],
        include: [
          {
            model: User,
            as: "users",
            attributes: [],
            required: false,
          },
        ],
      });

      const byRole: { [key: string]: number } = {};

      // Count users for each role
      for (const role of roles) {
        const userCount = await User.count({
          where: { role_id: role.id },
        });
        byRole[role.name] = userCount;
      }

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
