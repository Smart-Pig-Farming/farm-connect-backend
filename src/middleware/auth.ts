import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";
import User from "../models/User";
import Role from "../models/Role";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: "Access token required",
        code: "TOKEN_REQUIRED",
      });
      return;
    }

    // Verify token
    const decoded = await authService.verifyToken(token);

    // Get user details
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

    if (!user) {
      res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    if (user.is_locked) {
      res.status(403).json({
        error: "Account is locked",
        code: "ACCOUNT_LOCKED",
      });
      return;
    }

    // TODO: Get actual permissions from RolePermission model
    const permissions = getDefaultPermissionsByRole(
      (user as any).role?.name || "farmer"
    );

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: (user as any).role?.name || "farmer",
      permissions,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({
        error: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        required: permission,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        error: "Insufficient role permissions",
        code: "INSUFFICIENT_ROLE",
        required: role,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the required roles
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "Insufficient role permissions",
        code: "INSUFFICIENT_ROLE",
        required: roles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

/**
 * Get default permissions by role (temporary until RolePermission is implemented)
 */
function getDefaultPermissionsByRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    farmer: [
      "view_own_profile",
      "edit_own_profile",
      "view_best_practices",
      "participate_discussions",
      "take_quiz",
      "view_resources",
    ],
    admin: [
      "manage_users",
      "manage_roles",
      "manage_permissions",
      "view_all_profiles",
      "edit_all_profiles",
      "manage_content",
      "view_analytics",
      "system_settings",
    ],
    vet: [
      "view_own_profile",
      "edit_own_profile",
      "provide_advice",
      "view_farmer_profiles",
      "create_content",
      "moderate_discussions",
    ],
    govt: [
      "view_own_profile",
      "edit_own_profile",
      "view_analytics",
      "create_policy_content",
      "view_farmer_profiles",
    ],
  };

  return permissions[role] || permissions.farmer;
}
