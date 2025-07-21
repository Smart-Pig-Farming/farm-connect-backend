import { Request, Response } from "express";
import authService, { RegisterFarmerData } from "../services/authService";
import permissionService from "../services/permissionService";
import User from "../models/User";
import Role from "../models/Role";

class AuthController {
  /**
   * Register a new farmer
   */
  async registerFarmer(req: Request, res: Response): Promise<void> {
    try {
      const {
        firstname,
        lastname,
        email,
        password,
        farmName,
        province,
        district,
        sector,
        field,
      } = req.body;

      const registrationData: RegisterFarmerData = {
        firstname,
        lastname,
        email,
        password,
        farmName,
        province,
        district,
        sector,
        field,
      };

      const authResponse = await authService.registerFarmer(registrationData);

      res.status(201).json({
        success: true,
        message: "Farmer registered successfully",
        data: authResponse,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "REGISTRATION_FAILED",
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const authResponse = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: authResponse,
      });
    } catch (error: any) {
      // Determine status code based on error message
      let statusCode = 400;
      let errorCode = "LOGIN_FAILED";
      let responseData: any = {
        success: false,
        error: error.message,
        code: errorCode,
      };

      if (error.message.includes("Invalid email or password")) {
        statusCode = 401;
        errorCode = "INVALID_CREDENTIALS";
      } else if (error.message.includes("locked")) {
        statusCode = 403;
        errorCode = "ACCOUNT_LOCKED";
      } else if (error.message.includes("verification")) {
        statusCode = 403;
        errorCode = "ACCOUNT_NOT_VERIFIED";

        // If it's a VerificationRequiredError, include the email
        if (error.name === "VerificationRequiredError" && error.email) {
          responseData.email = error.email;
        }
      }

      responseData.code = errorCode;
      res.status(statusCode).json(responseData);
    }
  }

  /**
   * Logout user (client-side token invalidation)
   */
  async logout(req: Request, res: Response): Promise<void> {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token from storage. However, we can implement
    // token blacklisting here if needed in the future.

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }

  /**
   * Get current user profile with permissions
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      // Get full user details with role information
      const fullUser = await User.findByPk(req.user.id, {
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["name"],
          },
        ],
        // Include all user attributes for complete profile data
        attributes: [
          "id",
          "firstname", 
          "lastname", 
          "email", 
          "username", 
          "organization",
          "province",
          "district", 
          "sector",
          "points",
          "level_id",
          "is_verified",
          "is_locked",
          "createdAt",
          "updatedAt"
        ],
      });

      if (!fullUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      // Get user permissions for frontend caching
      const permissionInfo = await permissionService.getUserPermissionInfo(
        req.user.id
      );

      // Format response to match login/register response structure
      const userResponse = {
        id: fullUser.id,
        firstname: fullUser.firstname,
        lastname: fullUser.lastname,
        email: fullUser.email,
        username: fullUser.username,
        role: (fullUser as any).role?.name || "farmer",
        permissions: permissionInfo.permissions,
        organization: fullUser.organization,
        province: fullUser.province,
        district: fullUser.district,
        sector: fullUser.sector,
        points: fullUser.points,
        level_id: fullUser.level_id,
        is_verified: fullUser.is_verified,
        is_locked: fullUser.is_locked,
        created_at: fullUser.createdAt.toISOString(),
        updated_at: fullUser.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: userResponse,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to get user profile",
        code: "GET_PROFILE_FAILED",
      });
    }
  }

  /**
   * Verify token endpoint
   */
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token is required",
          code: "TOKEN_REQUIRED",
        });
        return;
      }

      await authService.verifyToken(token);

      res.status(200).json({
        success: true,
        message: "Token is valid",
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  }

  /**
   * First-time login verification (password reset)
   */
  async firstTimeLoginVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email, currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!email || !currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          code: "MISSING_REQUIRED_FIELDS",
          details: "email, currentPassword, and newPassword are required",
        });
        return;
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        });
        return;
      }

      const authResponse = await authService.firstTimeLoginVerification(
        email,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: "Password updated successfully. Account verified.",
        data: authResponse,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "FIRST_TIME_VERIFICATION_FAILED",
      });
    }
  }

  /**
   * First-time login verification (password reset without current password)
   */
  async firstTimeLoginVerificationSimple(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { email, newPassword } = req.body;

      // Validate required fields
      if (!email || !newPassword) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          code: "MISSING_REQUIRED_FIELDS",
          details: "email and newPassword are required",
        });
        return;
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        });
        return;
      }

      const authResponse = await authService.firstTimeLoginVerificationSimple(
        email,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: "Password updated successfully. Account verified.",
        data: authResponse,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "FIRST_TIME_VERIFICATION_FAILED",
      });
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const { oldPassword, newPassword } = req.body;

      const result = await authService.changePassword(
        req.user.id,
        oldPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      let statusCode = 400;
      let errorCode = "PASSWORD_CHANGE_FAILED";

      if (error.message.includes("Current password is incorrect")) {
        statusCode = 400;
        errorCode = "INVALID_CURRENT_PASSWORD";
      } else if (error.message.includes("User not found")) {
        statusCode = 404;
        errorCode = "USER_NOT_FOUND";
      } else if (error.message.includes("New password must be different")) {
        statusCode = 400;
        errorCode = "SAME_PASSWORD";
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: errorCode,
      });
    }
  }

  /**
   * Update profile for authenticated user
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const profileData = req.body;

      const result = await authService.updateProfile(req.user.id, profileData);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    } catch (error: any) {
      let statusCode = 400;
      let errorCode = "PROFILE_UPDATE_FAILED";

      if (error.message.includes("User not found")) {
        statusCode = 404;
        errorCode = "USER_NOT_FOUND";
      } else if (error.message.includes("Email address is already in use")) {
        statusCode = 409;
        errorCode = "EMAIL_ALREADY_EXISTS";
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
        code: errorCode,
      });
    }
  }
}

export default new AuthController();
