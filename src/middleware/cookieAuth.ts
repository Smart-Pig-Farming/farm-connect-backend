import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";
import { getCookieConfig } from "../config/cookieConfig";

/**
 * Middleware to authenticate using cookies
 */
export const authenticateWithCookies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // No tokens provided
    if (!accessToken && !refreshToken) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NO_AUTH_TOKENS",
      });
      return;
    }

    // Try to validate access token first
    if (accessToken) {
      try {
        const decoded = await authService.verifyToken(accessToken);
        if (decoded) {
          req.user = {
            id: decoded.userId,
            email: "", // Email not in JWT, would need to fetch from DB if needed
            role: decoded.role,
            permissions: decoded.permissions,
          };
          return next();
        }
      } catch (error) {
        // Token invalid, try refresh token
        console.debug(
          "Access token verification failed, attempting refresh:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Access token invalid/expired, try refresh token
    if (refreshToken) {
      try {
        const deviceInfo = req.headers["user-agent"];
        const ipAddress = req.ip || req.connection.remoteAddress;

        const newTokens = await authService.refreshTokens(
          refreshToken,
          deviceInfo,
          ipAddress
        );

        if (newTokens) {
          // Set new cookies
          const cookieConfig = getCookieConfig();
          res.cookie(
            "accessToken",
            newTokens.accessToken,
            cookieConfig.accessToken
          );
          res.cookie(
            "refreshToken",
            newTokens.refreshToken,
            cookieConfig.refreshToken
          );
          res.cookie("csrfToken", newTokens.csrfToken, cookieConfig.csrfToken);

          // Validate new access token
          const decoded = await authService.verifyToken(newTokens.accessToken);
          if (decoded) {
            req.user = {
              id: decoded.userId,
              email: "", // Email not in JWT, would need to fetch from DB if needed
              role: decoded.role,
              permissions: decoded.permissions,
            };
            return next();
          }
        }
      } catch (error) {
        // Refresh token failed, fall through to authentication failed
        console.debug(
          "Refresh token verification failed:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // All authentication attempts failed
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication",
      code: "AUTHENTICATION_FAILED",
    });
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication error",
      code: "AUTHENTICATION_ERROR",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      try {
        const decoded = await authService.verifyToken(accessToken);
        if (decoded) {
          req.user = {
            id: decoded.userId,
            email: "", // Email not in JWT, would need to fetch from DB if needed
            role: decoded.role,
            permissions: decoded.permissions,
          };
        }
      } catch (error) {
        // Token invalid, but don't fail the request for optional auth
        console.debug(
          "Optional auth token verification failed:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip CSRF for GET requests (they should be safe)
  if (req.method === "GET") {
    return next();
  }

  const csrfTokenFromCookie = req.cookies.csrfToken;
  const csrfTokenFromHeader = req.headers["x-csrf-token"];

  if (!csrfTokenFromCookie || !csrfTokenFromHeader) {
    res.status(403).json({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    return;
  }

  if (csrfTokenFromCookie !== csrfTokenFromHeader) {
    res.status(403).json({
      success: false,
      error: "CSRF token mismatch",
      code: "CSRF_TOKEN_MISMATCH",
    });
    return;
  }

  next();
};
