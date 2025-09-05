import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { passwordResetService } from "../services/passwordResetService";

class PasswordResetController {
  // POST /api/auth/forgot-password
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email } = req.body;
      const result = await passwordResetService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error in requestPasswordReset:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // POST /api/auth/verify-otp
  async verifyOTP(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, otp } = req.body;
      const result = await passwordResetService.verifyOTP(email, otp);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            resetToken: result.token,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Error in verifyOTP:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { resetToken, newPassword } = req.body;
      const result = await passwordResetService.resetPassword(
        resetToken,
        newPassword
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Error in resetPassword:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // POST /api/auth/resend-otp
  async resendOTP(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email } = req.body;
      const result = await passwordResetService.resendOTP(email);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Error in resendOTP:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

export const passwordResetController = new PasswordResetController();
