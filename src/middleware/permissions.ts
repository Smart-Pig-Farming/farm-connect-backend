import { Request, Response, NextFunction } from "express";
import permissionService from "../services/permissionService";

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permission: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const result = await permissionService.hasPermission(
        req.user.id,
        permission
      );

      if (!result.hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission denied: ${permission}`,
          code: "PERMISSION_DENIED",
          details: result.reason,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during permission check",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const result = await permissionService.hasAnyPermission(
        req.user.id,
        permissions
      );

      if (!result.hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission denied: requires one of [${permissions.join(
            ", "
          )}]`,
          code: "PERMISSION_DENIED",
          details: result.reason,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during permission check",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check if user has all required permissions
 */
export const requireAllPermissions = (permissions: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const result = await permissionService.hasAllPermissions(
        req.user.id,
        permissions
      );

      if (!result.hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission denied: requires all of [${permissions.join(
            ", "
          )}]`,
          code: "PERMISSION_DENIED",
          details: result.reason,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during permission check",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to attach user permissions to request object
 */
export const attachUserPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      const permissionInfo = await permissionService.getUserPermissionInfo(
        req.user.id
      );
      req.userPermissions = permissionInfo.permissions;
      req.userRoles = permissionInfo.roles;
    }
    next();
  } catch (error) {
    console.error("Error attaching user permissions:", error);
    next(); // Continue without permissions - handled by permission checks
  }
};

// Extend Express Request interface to include permissions
declare global {
  namespace Express {
    interface Request {
      userPermissions?: string[];
      userRoles?: string[];
    }
  }
}
