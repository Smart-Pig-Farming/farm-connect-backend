import { Router } from "express";
import authController from "../controllers/authController";
import { passwordResetController } from "../controllers/passwordResetController";
import {
  validateFarmerRegistration,
  validateLogin,
  validateForgotPasswordRequest,
  validateOTPVerification,
  validatePasswordReset,
  validateResendOTP,
  validatePasswordChange,
  validateProfileUpdate,
} from "../middleware/validation";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { AuthenticatedUser } from "../middleware/auth"; // Import to load type declarations
import permissionService from "../services/permissionService";

const router = Router();

/**
 * @route   POST /auth/register/farmer
 * @desc    Register a new farmer
 * @access  Public
 */
router.post(
  "/register/farmer",
  validateFarmerRegistration,
  authController.registerFarmer
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", validateLogin, authController.login);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post("/logout", authController.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticateWithCookies, authController.getProfile);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Private
 */
router.post("/refresh", authController.refreshToken);

/**
 * @route   POST /auth/verify-token
 * @desc    Verify if token is valid
 * @access  Public
 */
// Temporarily disabled - needs implementation
// router.post("/verify-token", authController.verifyToken);

/**
 * @route   POST /auth/forgot-password
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
 * @route   POST /auth/verify-otp
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
 * @route   POST /auth/reset-password
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
 * @route   POST /auth/resend-otp
 * @desc    Resend OTP for password reset
 * @access  Public
 * @body    { email: string }
 */
router.post(
  "/resend-otp",
  validateResendOTP,
  passwordResetController.resendOTP
);

/**
 * @route   POST /auth/verify-account
 * @desc    Account verification with new password (simple)
 * @access  Public
 */
router.post("/verify-account", authController.verifyAccount);

/**
 * @route   POST /auth/first-time-verification
 * @desc    First-time login verification (password reset)
 * @access  Public
 */
// Temporarily disabled - needs implementation
// router.post(
//   "/first-time-verification",
//   authController.firstTimeLoginVerification
// );

/**
 * @route   GET /auth/permissions
 * @desc    Get current user permissions (for frontend caching)
 * @access  Private
 */
router.get(
  "/permissions",
  authenticateWithCookies,
  async (req, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }

      const permissionInfo = await permissionService.getUserPermissionInfo(
        req.user.id
      );

      // Frontend expects { permissions: string[] }
      res.status(200).json({
        permissions: permissionInfo.permissions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch user permissions",
        code: "FETCH_USER_PERMISSIONS_FAILED",
      });
    }
  }
);

/**
 * @route   POST /auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 * @body    { oldPassword: string, newPassword: string, confirmPassword: string }
 */
router.post(
  "/change-password",
  authenticateWithCookies,
  validatePasswordChange,
  authController.changePassword
);

/**
 * @route   PUT /auth/profile
 * @desc    Update own profile information
 * @access  Private
 * @body    { firstname?: string, lastname?: string, email?: string, province?: string, district?: string, sector?: string }
 */
router.put(
  "/profile",
  authenticateWithCookies,
  validateProfileUpdate,
  authController.updateProfile
);

export default router;
