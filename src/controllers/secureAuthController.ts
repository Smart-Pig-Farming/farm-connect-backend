import { Request, Response } from "express";
import secureAuthService from "../services/secureAuthService";
import { getCookieConfig, clearCookieConfig } from "../config/cookieConfig";

class SecureAuthController {
  /**
   * Secure login with HttpOnly cookies
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: "Email and password are required",
          code: "MISSING_CREDENTIALS",
        });
        return;
      }

      const deviceInfo = req.headers["user-agent"];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await secureAuthService.secureLogin(
        email,
        password,
        deviceInfo,
        ipAddress
      );

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error,
          code: "AUTHENTICATION_FAILED",
        });
        return;
      }

      if (!result.tokens || !result.data) {
        res.status(500).json({
          success: false,
          error: "Token generation failed",
          code: "TOKEN_GENERATION_FAILED",
        });
        return;
      }

      const cookieConfig = getCookieConfig();

      // Set HttpOnly cookies
      res.cookie(
        "accessToken",
        result.tokens.accessToken,
        cookieConfig.accessToken
      );
      res.cookie(
        "refreshToken",
        result.tokens.refreshToken,
        cookieConfig.refreshToken
      );
      res.cookie("csrfToken", result.tokens.csrfToken, cookieConfig.csrfToken);

      // Log for development
      if (process.env.NODE_ENV === "development") {
        console.log("🍪 Login cookies set for user:", result.data.user.email);
      }

      // Return user data only (no tokens in response body)
      res.status(200).json({
        success: true,
        data: result.data,
        message: "Login successful",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        details: error.message,
      });
    }
  }

  /**
   * Refresh tokens
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: "No refresh token provided",
          code: "NO_REFRESH_TOKEN",
        });
        return;
      }

      const deviceInfo = req.headers["user-agent"];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const newTokens = await secureAuthService.refreshTokens(
        refreshToken,
        deviceInfo,
        ipAddress
      );

      if (!newTokens) {
        // Clear invalid cookies
        res.clearCookie("accessToken", clearCookieConfig);
        res.clearCookie("refreshToken", clearCookieConfig);
        res.clearCookie("csrfToken", clearCookieConfig);

        res.status(401).json({
          success: false,
          error: "Invalid or expired refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
        return;
      }

      const cookieConfig = getCookieConfig();

      // Set new cookies
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

      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Tokens refreshed successfully");
      }

      res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully",
      });
    } catch (error: any) {
      console.error("Token refresh error:", error);
      res.status(500).json({
        success: false,
        error: "Token refresh failed",
        code: "TOKEN_REFRESH_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Logout (single device)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        await secureAuthService.logout(refreshToken);
      }

      // Clear all auth cookies
      res.clearCookie("accessToken", clearCookieConfig);
      res.clearCookie("refreshToken", clearCookieConfig);
      res.clearCookie("csrfToken", clearCookieConfig);

      if (process.env.NODE_ENV === "development") {
        console.log("👋 User logged out");
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: "Logout failed",
        code: "LOGOUT_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      await secureAuthService.logoutAllDevices(userId);

      // Clear cookies for this device
      res.clearCookie("accessToken", clearCookieConfig);
      res.clearCookie("refreshToken", clearCookieConfig);
      res.clearCookie("csrfToken", clearCookieConfig);

      res.status(200).json({
        success: true,
        message: "Logged out from all devices",
      });
    } catch (error: any) {
      console.error("Logout all error:", error);
      res.status(500).json({
        success: false,
        error: "Logout all failed",
        code: "LOGOUT_ALL_FAILED",
        details: error.message,
      });
    }
  }

  /**
   * Get current user (if authenticated)
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
        code: "GET_USER_FAILED",
        details: error.message,
      });
    }
  }
}

export default new SecureAuthController();
