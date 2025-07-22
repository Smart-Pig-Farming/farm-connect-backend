import Action from "../models/Action";
import Resource from "../models/Resource";
import Permission from "../models/Permission";
import Role from "../models/Role";
import RolePermission from "../models/RolePermission";
import User from "../models/User";
import {
  ACTIONS,
  RESOURCES,
  createPermissionString,
} from "../constants/permissions";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

/**
 * Validate admin configuration from environment variables
 */
function validateAdminConfig(): { email: string; password: string } {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Environment variables ADMIN_EMAIL and ADMIN_PASSWORD must be set for admin user creation."
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(adminEmail)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }

  return { email: adminEmail, password: adminPassword };
}

/**
 * Seed Actions into the database
 */
export async function seedActions(): Promise<void> {
  try {
    const existingActions = await Action.count();
    if (existingActions > 0) {
      console.log("Actions already exist, skipping seed...");
      return;
    }

    const actionData = [
      {
        name: ACTIONS.MANAGE,
        description: "Full CRUD access to resource",
        is_active: true,
      },
      {
        name: ACTIONS.CREATE,
        description: "Create new instances of resource",
        is_active: true,
      },
      {
        name: ACTIONS.READ,
        description: "View/access resource",
        is_active: true,
      },
      {
        name: ACTIONS.UPDATE,
        description: "Modify existing resource",
        is_active: true,
      },
      { name: ACTIONS.DELETE, description: "Remove resource", is_active: true },
      {
        name: ACTIONS.MODERATE,
        description: "Moderation actions on resource",
        is_active: true,
      },
    ];

    await Action.bulkCreate(actionData);
    console.log("Actions seeded successfully");
  } catch (error) {
    console.error("Error seeding actions:", error);
    throw error;
  }
}

/**
 * Seed Resources into the database
 */
export async function seedResources(): Promise<void> {
  try {
    const existingResources = await Resource.count();
    if (existingResources > 0) {
      console.log("Resources already exist, skipping seed...");
      return;
    }

    const resourceData = [
      // User Management
      {
        name: RESOURCES.USERS,
        description: "User accounts, login, account status",
        is_active: true,
      },
      {
        name: RESOURCES.ROLES,
        description: "Role management (farmer, vet, govt, admin)",
        is_active: true,
      },
      {
        name: RESOURCES.PERMISSIONS,
        description: "Permission assignments to roles",
        is_active: true,
      },
      {
        name: RESOURCES.PROFILES,
        description: "User profiles and farm information",
        is_active: true,
      },

      // Content Management
      {
        name: RESOURCES.POSTS,
        description: "Discussion posts with tags and media",
        is_active: true,
      },
      {
        name: RESOURCES.REPLIES,
        description: "Replies to posts",
        is_active: true,
      },
      {
        name: RESOURCES.REACTIONS,
        description: "Upvotes/downvotes",
        is_active: true,
      },
      {
        name: RESOURCES.REPORTS,
        description: "Content reports for moderation",
        is_active: true,
      },
      {
        name: RESOURCES.BEST_PRACTICES,
        description: "Educational content",
        is_active: true,
      },
      {
        name: RESOURCES.QUIZZES,
        description: "Quiz creation and attempts",
        is_active: true,
      },

      // Platform Features
      {
        name: RESOURCES.TRANSLATION,
        description: "Content translation services",
        is_active: true,
      },
      {
        name: RESOURCES.MODERATION,
        description: "Moderation queue and actions",
        is_active: true,
      },

      // Gamification
      {
        name: RESOURCES.POINTS,
        description: "User points system",
        is_active: true,
      },
      {
        name: RESOURCES.LEVELS,
        description: "User level progression",
        is_active: true,
      },
    ];

    await Resource.bulkCreate(resourceData);
    console.log("Resources seeded successfully");
  } catch (error) {
    console.error("Error seeding resources:", error);
    throw error;
  }
}

/**
 * Seed Permissions (ACTION:RESOURCE combinations)
 */
export async function seedPermissions(): Promise<void> {
  try {
    const existingPermissions = await Permission.count();
    if (existingPermissions > 0) {
      console.log("Permissions already exist, skipping seed...");
      return;
    }

    // Get all actions and resources
    const actions = await Action.findAll();
    const resources = await Resource.findAll();

    const permissionData = [];

    // Create all possible ACTION:RESOURCE combinations
    for (const action of actions) {
      for (const resource of resources) {
        const permissionName = createPermissionString(
          action.name as any,
          resource.name as any
        );
        permissionData.push({
          name: permissionName,
          description: `${action.description} for ${resource.description}`,
          action_id: action.id,
          resource_id: resource.id,
          is_active: true,
        });
      }
    }

    await Permission.bulkCreate(permissionData);
    console.log(`${permissionData.length} permissions seeded successfully`);
  } catch (error) {
    console.error("Error seeding permissions:", error);
    throw error;
  }
}

/**
 * Seed role permissions based on use cases
 */
export async function seedRolePermissions(): Promise<void> {
  try {
    const existingRolePermissions = await RolePermission.count();
    if (existingRolePermissions > 0) {
      console.log("Role permissions already exist, skipping seed...");
      return;
    }

    // Get roles and permissions
    const roles = await Role.findAll();
    const permissions = await Permission.findAll();

    // Helper function to find permission by name
    const findPermission = (name: string) =>
      permissions.find((p) => p.name === name);

    // Define role permissions based on use cases
    const rolePermissionsMap = {
      farmer: [
        "CREATE:POSTS",
        "READ:POSTS",
        "UPDATE:POSTS", // Own posts only (handled in business logic)
        "DELETE:POSTS", // Own posts only (handled in business logic)
        "CREATE:REPLIES",
        "READ:REPLIES",
        "UPDATE:REACTIONS",
        "CREATE:REPORTS",
        "READ:BEST_PRACTICES",
        "UPDATE:QUIZZES", // Take quizzes
        "UPDATE:PROFILES", // Own profile only
        "UPDATE:TRANSLATION",
        "READ:POINTS",
        "READ:LEVELS",
      ],
      vet: [
        "CREATE:POSTS",
        "READ:POSTS",
        "UPDATE:POSTS",
        "DELETE:POSTS",
        "CREATE:REPLIES",
        "READ:REPLIES",
        "UPDATE:REACTIONS",
        "CREATE:REPORTS",
        "CREATE:BEST_PRACTICES",
        "READ:BEST_PRACTICES",
        "UPDATE:BEST_PRACTICES",
        "CREATE:QUIZZES",
        "READ:QUIZZES",
        "UPDATE:QUIZZES",
        "UPDATE:PROFILES",
        "UPDATE:TRANSLATION",
        "READ:POINTS",
        "READ:LEVELS",
      ],
      govt: [
        "CREATE:POSTS",
        "READ:POSTS",
        "UPDATE:POSTS",
        "DELETE:POSTS",
        "CREATE:REPLIES",
        "READ:REPLIES",
        "UPDATE:REACTIONS",
        "CREATE:REPORTS",
        "CREATE:BEST_PRACTICES",
        "READ:BEST_PRACTICES",
        "UPDATE:BEST_PRACTICES",
        "CREATE:QUIZZES",
        "READ:QUIZZES",
        "UPDATE:QUIZZES",
        "UPDATE:PROFILES",
        "UPDATE:TRANSLATION",
        "READ:POINTS",
        "READ:LEVELS",
      ],
      admin: [
        "MANAGE:USERS",
        "MANAGE:ROLES",
        "MANAGE:PERMISSIONS",
        "MANAGE:PROFILES",
        "MANAGE:POSTS",
        "MANAGE:REPLIES",
        "MANAGE:REACTIONS",
        "MANAGE:REPORTS",
        "MANAGE:BEST_PRACTICES",
        "MANAGE:QUIZZES",
        "MODERATE:POSTS",
        "MODERATE:REPLIES",
        "MODERATE:REPORTS",
        "MANAGE:MODERATION",
        "MANAGE:TRANSLATION",
        "MANAGE:POINTS",
        "MANAGE:LEVELS",
      ],
    };

    // Create role-permission assignments
    for (const role of roles) {
      const rolePermissions =
        rolePermissionsMap[role.name as keyof typeof rolePermissionsMap];
      if (rolePermissions) {
        for (const permissionName of rolePermissions) {
          const permission = findPermission(permissionName);
          if (permission) {
            await RolePermission.create({
              role_id: role.id,
              permission_id: permission.id,
            });
          }
        }
      }
    }

    console.log("Role permissions seeded successfully");
  } catch (error) {
    console.error("Error seeding role permissions:", error);
    throw error;
  }
}

/**
 * Seed admin user
 */
export async function seedAdminUser(): Promise<void> {
  try {
    // Validate admin configuration first
    const adminConfig = validateAdminConfig();

    // Check if admin user exists with the configured email
    const existingAdmin = await User.findOne({
      where: {
        [Op.or]: [
          { email: adminConfig.email },
          { username: adminConfig.email.split("@")[0] },
          { username: "admin" }, // Also check for old admin username
        ],
      },
    });

    if (existingAdmin) {
      console.log("Admin user already exists, skipping seed...");
      console.log(
        `Existing admin: ${existingAdmin.email} / ${existingAdmin.username}`
      );
      return;
    }

    const adminRole = await Role.findOne({ where: { name: "admin" } });
    if (!adminRole) {
      throw new Error("Admin role not found. Please run role seeding first.");
    }

    const hashedPassword = await bcrypt.hash(adminConfig.password, 10);

    const adminUser = await User.create({
      firstname: "System",
      lastname: "Administrator",
      email: adminConfig.email,
      username: adminConfig.email.split("@")[0],
      password: hashedPassword,
      role_id: adminRole.id,
      is_verified: true,
      is_locked: false,
      points: 0,
      level_id: 1, // Assuming level 1 exists from basic seeds
    });

    console.log("Admin user seeded successfully");
    console.log(
      `Admin credentials configured with email: ${adminConfig.email}`
    );
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}

/**
 * Run all permission-related seeds
 */
export async function runPermissionSeeds(): Promise<void> {
  try {
    await seedActions();
    await seedResources();
    await seedPermissions();
    await seedRolePermissions();
    // Skip admin user creation for now
    console.log("Permission seeds completed (admin user creation skipped)");
  } catch (error) {
    console.error("Error running permission seeds:", error);
    throw error;
  }
}
