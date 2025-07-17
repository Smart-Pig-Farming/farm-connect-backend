import { Request, Response } from "express";
import authService, { RegisterFarmerData } from "../services/authService";
import permissionService from "../services/permissionService";

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

      if (error.message.includes("Invalid email or password")) {
        statusCode = 401;
        errorCode = "INVALID_CREDENTIALS";
      } else if (error.message.includes("locked")) {
        statusCode = 403;
        errorCode = "ACCOUNT_LOCKED";
      } else if (error.message.includes("verification")) {
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

      // Get user permissions for frontend caching
      const permissionInfo = await permissionService.getUserPermissionInfo(
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
          permissions: permissionInfo.permissions,
          roles: permissionInfo.roles,
        },
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
}

export default new AuthController();
