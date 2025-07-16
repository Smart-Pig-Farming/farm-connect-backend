import { Router } from "express";
import { passwordResetController } from "../controllers/passwordResetController";
import {
  validateForgotPasswordRequest,
  validateOTPVerification,
  validatePasswordReset,
  validateResendOTP,
} from "../middleware/validation";

const router = Router();

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends OTP to email)
 * @access  Public
 * @body    { email: string }
 */
router.post(
  "/forgot-password",
  validateForgotPasswordRequest,
  passwordResetController.requestPasswordReset
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for password reset
 * @access  Public
 * @body    { email: string, otp: string }
 */
router.post(
  "/verify-otp",
  validateOTPVerification,
  passwordResetController.verifyOTP
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using verification token
 * @access  Public
 * @body    { resetToken: string, newPassword: string, confirmPassword: string }
 */
router.post(
  "/reset-password",
  validatePasswordReset,
  passwordResetController.resetPassword
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP for password reset
 * @access  Public
 * @body    { email: string }
 */
router.post(
  "/resend-otp",
  validateResendOTP,
  passwordResetController.resendOTP
);

export default router;
