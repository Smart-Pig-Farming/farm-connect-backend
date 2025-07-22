import { Request, Response } from "express";
import authService, { RegisterFarmerData } from "../services/authService";
import { getCookieConfig, clearCookieConfig } from "../config/cookieConfig";
import permissionService from "../services/permissionService";
import User from "../models/User";
import Role from "../models/Role";

interface ExtendedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    permissions: string[];
  };
}

class AuthController {
  /**
   * Register a new farmer
   */
  async registerFarmer(req: Request, res: Response): Promise<void> {
    try {
      const registrationData: RegisterFarmerData = {
        email: req.body.email,
        password: req.body.password,
        firstname: req.body.firstName,
        lastname: req.body.lastName,
        farmName: req.body.farmDetails?.farmName || req.body.farmName || "",
        province: req.body.farmDetails?.province || req.body.province || "",
        district: req.body.farmDetails?.district || req.body.district || "",
        sector: req.body.farmDetails?.sector || req.body.sector || "",
      };

      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

      const authResponse = await authService.registerFarmer(
        registrationData,
        deviceInfo,
        ipAddress
      );

      // Set secure cookies
      const cookieConfig = getCookieConfig();
      res.cookie(
        "accessToken",
        authResponse.tokens.accessToken,
        cookieConfig.accessToken
      );
      res.cookie(
        "refreshToken",
        authResponse.tokens.refreshToken,
        cookieConfig.refreshToken
      );
      res.cookie(
        "csrfToken",
        authResponse.tokens.csrfToken,
        cookieConfig.csrfToken
      );

      res.status(201).json({
        success: true,
        message: "Farmer registered successfully",
        data: { user: authResponse.user },
      });
    } catch (error: any) {
      // Determine status code and error code based on error type and message
      let statusCode = 400;
      let errorCode = "REGISTRATION_FAILED";

      if (
        error.name === "DuplicateEmailError" ||
        error.message.includes("User with this email already exists")
      ) {
        statusCode = 409; // Conflict
        errorCode = "EMAIL_ALREADY_EXISTS";
      } else if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        statusCode = 400;
        errorCode = "INVALID_DATA";
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: errorCode,
      });
    }
  }

  /**
   * Login with secure cookies
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

      const authResponse = await authService.login(
        email,
        password,
        deviceInfo,
        ipAddress
      );

      // Set secure cookies
      const cookieConfig = getCookieConfig();
      res.cookie(
        "accessToken",
        authResponse.tokens.accessToken,
        cookieConfig.accessToken
      );
      res.cookie(
        "refreshToken",
        authResponse.tokens.refreshToken,
        cookieConfig.refreshToken
      );
      res.cookie(
        "csrfToken",
        authResponse.tokens.csrfToken,
        cookieConfig.csrfToken
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user: authResponse.user },
      });
    } catch (error: any) {
      // Determine status code and error code based on error type and message
      let statusCode = 400;
      let errorCode = "LOGIN_FAILED";

      // Check for specific error types first
      if (error.name === "VerificationRequiredError") {
        statusCode = 403;
        errorCode = "ACCOUNT_NOT_VERIFIED";
      } else if (error.message.includes("Invalid email or password")) {
        statusCode = 401;
        errorCode = "INVALID_CREDENTIALS";
      } else if (error.message.includes("locked")) {
        statusCode = 423;
        errorCode = "ACCOUNT_LOCKED";
      } else if (
        error.message.includes("verification") ||
        error.message.includes("verified")
      ) {
        // Fallback for verification-related errors
        statusCode = 403;
        errorCode = "ACCOUNT_NOT_VERIFIED";
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: errorCode,
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: "Refresh token not provided",
          code: "MISSING_REFRESH_TOKEN",
        });
        return;
      }

      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

      const tokenPair = await authService.refreshTokens(
        refreshToken,
        deviceInfo,
        ipAddress
      );

      // Set new secure cookies
      const cookieConfig = getCookieConfig();
      res.cookie(
        "accessToken",
        tokenPair.accessToken,
        cookieConfig.accessToken
      );
      res.cookie(
        "refreshToken",
        tokenPair.refreshToken,
        cookieConfig.refreshToken
      );
      res.cookie("csrfToken", tokenPair.csrfToken, cookieConfig.csrfToken);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
      });
    } catch (error: any) {
      // Clear cookies on refresh failure
      res.clearCookie("accessToken", clearCookieConfig);
      res.clearCookie("refreshToken", clearCookieConfig);
      res.clearCookie("csrfToken", clearCookieConfig);

      res.status(401).json({
        success: false,
        error: error.message,
        code: "TOKEN_REFRESH_FAILED",
      });
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear all auth cookies
      res.clearCookie("accessToken", clearCookieConfig);
      res.clearCookie("refreshToken", clearCookieConfig);
      res.clearCookie("csrfToken", clearCookieConfig);

      res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error: any) {
      // Clear cookies even on error
      res.clearCookie("accessToken", clearCookieConfig);
      res.clearCookie("refreshToken", clearCookieConfig);
      res.clearCookie("csrfToken", clearCookieConfig);

      res.status(200).json({
        message: "Logged out successfully",
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const user = await User.findByPk(req.user.id, {
        include: [{ model: Role, as: "role", attributes: ["name"] }],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      // Format user data to match frontend expectations
      const formattedUser = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: (user as any).role?.name || "farmer", // Extract role name from association
        organization: user.organization,
        province: user.province,
        district: user.district,
        sector: user.sector,
        points: user.points,
        level_id: user.level_id,
        is_verified: user.is_verified,
        is_locked: user.is_locked,
        permissions: req.user.permissions, // Use permissions from JWT
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: formattedUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: "PROFILE_FETCH_FAILED",
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const { firstName, lastName, email } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      await user.update({
        firstname: firstName,
        lastname: lastName,
        email,
      });

      const updatedUser = await User.findByPk(req.user.id, {
        include: [{ model: Role, as: "role" }],
        attributes: { exclude: ["password"] },
      });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: { user: updatedUser },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "PROFILE_UPDATE_FAILED",
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "PASSWORD_CHANGE_FAILED",
      });
    }
  }

  /**
   * Get user permissions
   */
  async getPermissions(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const permissions = await permissionService.getUserPermissions(
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: "Permissions retrieved successfully",
        data: { permissions },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: "PERMISSIONS_FETCH_FAILED",
      });
    }
  }

  /**
   * Verify account with new password (first-time login)
   */
  async verifyAccount(req: Request, res: Response): Promise<void> {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        res.status(400).json({
          success: false,
          error: "Email and new password are required",
          code: "MISSING_FIELDS",
        });
        return;
      }

      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

      // Use the existing firstTimeLoginVerificationSimple method
      const authResponse = await authService.firstTimeLoginVerificationSimple(
        email,
        newPassword,
        deviceInfo,
        ipAddress
      );

      // Set secure cookies
      const cookieConfig = getCookieConfig();
      res.cookie(
        "accessToken",
        authResponse.tokens.accessToken,
        cookieConfig.accessToken
      );
      res.cookie(
        "refreshToken",
        authResponse.tokens.refreshToken,
        cookieConfig.refreshToken
      );
      res.cookie(
        "csrfToken",
        authResponse.tokens.csrfToken,
        cookieConfig.csrfToken
      );

      res.status(200).json({
        success: true,
        message: "Account verified successfully",
        data: { user: authResponse.user },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "ACCOUNT_VERIFICATION_FAILED",
      });
    }
  }
}

export default new AuthController();
