import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import User from "../models/User";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { emailService } from "./emailService";

class PasswordResetService {
  // Request password reset - sends OTP to email
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message:
            "If this email is registered, you will receive password reset instructions.",
        };
      }

      // Check if there's a recent valid token (within last minute to prevent spam)
      const recentToken = await PasswordResetToken.findOne({
        where: {
          email,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 60 * 1000), // Last 1 minute
          },
        },
        order: [["createdAt", "DESC"]],
      });

      if (recentToken) {
        return {
          success: false,
          message:
            "Password reset request was sent recently. Please wait before requesting again.",
        };
      }

      // Invalidate any existing tokens for this user
      await PasswordResetToken.update(
        { isUsed: true },
        { where: { email, isUsed: false } }
      );

      // Generate new OTP
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Create new token
      await PasswordResetToken.create({
        userId: user.id,
        email,
        otp,
        expiresAt,
        isUsed: false,
      });

      // Send email
      await emailService.sendPasswordResetOTP(email, otp, user.firstname);

      return {
        success: true,
        message: "Password reset instructions have been sent to your email.",
      };
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return {
        success: false,
        message:
          "An error occurred while processing your request. Please try again.",
      };
    }
  }

  // Verify OTP
  async verifyOTP(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      // Find valid token
      const resetToken = await PasswordResetToken.findOne({
        where: {
          email,
          otp,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date(), // Not expired
          },
        },
      });

      if (!resetToken) {
        return {
          success: false,
          message:
            "Invalid or expired verification code. Please request a new one.",
        };
      }

      // Mark as used
      await resetToken.markAsUsed();

      // Return a temporary token for password reset (you could use JWT here)
      const tempToken = `${resetToken.id}_${Date.now()}`;

      return {
        success: true,
        message: "Verification successful. You can now set your new password.",
        token: tempToken,
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return {
        success: false,
        message: "An error occurred during verification. Please try again.",
      };
    }
  }

  // Reset password using temp token
  async resetPassword(
    tempToken: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Parse temp token
      const [tokenId] = tempToken.split("_");
      const resetToken = await PasswordResetToken.findByPk(parseInt(tokenId));

      if (!resetToken || !resetToken.isUsed) {
        return {
          success: false,
          message:
            "Invalid reset token. Please start the password reset process again.",
        };
      }

      // Check if token is not too old (allow 10 minutes after verification)
      const tokenAge = Date.now() - resetToken.updatedAt.getTime();
      if (tokenAge > 10 * 60 * 1000) {
        // 10 minutes
        return {
          success: false,
          message:
            "Reset token has expired. Please start the password reset process again.",
        };
      }

      // Find user
      const user = await User.findByPk(resetToken.userId);
      if (!user) {
        return {
          success: false,
          message: "User not found. Please contact support.",
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await user.update({ password: hashedPassword });

      // Clean up - remove all password reset tokens for this user
      await PasswordResetToken.destroy({
        where: { userId: user.id },
      });

      return {
        success: true,
        message:
          "Password has been successfully reset. You can now sign in with your new password.",
      };
    } catch (error) {
      console.error("Error resetting password:", error);
      return {
        success: false,
        message:
          "An error occurred while resetting your password. Please try again.",
      };
    }
  }

  // Resend OTP
  async resendOTP(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the most recent token for this email
      const existingToken = await PasswordResetToken.findOne({
        where: {
          email,
          isUsed: false,
        },
        order: [["createdAt", "DESC"]],
      });

      if (!existingToken) {
        return {
          success: false,
          message:
            "No active password reset request found. Please start the process again.",
        };
      }

      // Check if we can resend (at least 1 minute since last send)
      const timeSinceCreation = Date.now() - existingToken.createdAt.getTime();
      if (timeSinceCreation < 60 * 1000) {
        // 1 minute
        return {
          success: false,
          message: "Please wait before requesting a new code.",
        };
      }

      // Find user
      const user = await User.findByPk(existingToken.userId);
      if (!user) {
        return {
          success: false,
          message: "User not found.",
        };
      }

      // Generate new OTP
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Update existing token
      await existingToken.update({
        otp,
        expiresAt,
        createdAt: new Date(), // Update timestamp for rate limiting
      });

      // Send email
      await emailService.sendPasswordResetOTP(email, otp, user.firstname);

      return {
        success: true,
        message: "A new verification code has been sent to your email.",
      };
    } catch (error) {
      console.error("Error resending OTP:", error);
      return {
        success: false,
        message:
          "An error occurred while sending the verification code. Please try again.",
      };
    }
  }

  // Clean up expired tokens (call this periodically)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const deletedCount = await PasswordResetToken.cleanupExpired();
      console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
    }
  }
}

export const passwordResetService = new PasswordResetService();
