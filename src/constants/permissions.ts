/**
 * Permission system constants
 * Actions and Resources for the permission-based access control system
 */

export const ACTIONS = {
  MANAGE: "MANAGE",
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  MODERATE: "MODERATE",
} as const;

export const RESOURCES = {
  // User Management
  USERS: "USERS",
  ROLES: "ROLES",
  PERMISSIONS: "PERMISSIONS",
  PROFILES: "PROFILES",

  // Content Management
  POSTS: "POSTS",
  REPLIES: "REPLIES",
  REACTIONS: "REACTIONS",
  REPORTS: "REPORTS",
  BEST_PRACTICES: "BEST_PRACTICES",
  QUIZZES: "QUIZZES",

  // Platform Features
  TRANSLATION: "TRANSLATION",
  MODERATION: "MODERATION",

  // Gamification
  POINTS: "POINTS",
  LEVELS: "LEVELS",
} as const;

export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];
export type ResourceType = (typeof RESOURCES)[keyof typeof RESOURCES];

/**
 * Permission string format: ACTION:RESOURCE
 */
export const createPermissionString = (
  action: ActionType,
  resource: ResourceType
): string => {
  return `${action}:${resource}`;
};

/**
 * Parse permission string into action and resource
 */
export const parsePermissionString = (
  permission: string
): { action: ActionType; resource: ResourceType } | null => {
  const [action, resource] = permission.split(":");

  if (
    Object.values(ACTIONS).includes(action as ActionType) &&
    Object.values(RESOURCES).includes(resource as ResourceType)
  ) {
    return { action: action as ActionType, resource: resource as ResourceType };
  }

  return null;
};

/**
 * Check if a permission string is valid
 */
export const isValidPermission = (permission: string): boolean => {
  return parsePermissionString(permission) !== null;
};
