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
 * @swagger
 * /api/auth/register/farmer:
 *   post:
 *     summary: Register a new farmer
 *     description: Register a new farmer account. After registration, the farmer will receive login credentials via email and must verify their account.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: Farmer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         tempPassword:
 *                           type: string
 *                           example: "temp123456"
 *                           description: "Temporary password (only returned in development)"
 *       400:
 *         description: Validation error or farmer already exists
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/register/farmer",
  validateFarmerRegistration,
  authController.registerFarmer
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: |
 *       Authenticate user with email and password. Sets secure HTTP-only cookies for authentication.
 *
 *       **Authentication Flow:**
 *       1. Send email and password
 *       2. Server validates credentials
 *       3. Server sets three secure cookies:
 *          - `accessToken` (15 minutes expiry)
 *          - `refreshToken` (7 days expiry)
 *          - `csrfToken` (for CSRF protection)
 *       4. Use cookies for subsequent requests
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginCredentials'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Authentication cookies
 *             schema:
 *               type: string
 *               example: "accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=strict"
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidCredentials:
 *                 value:
 *                   success: false
 *                   error: "Invalid email or password"
 *                   code: "INVALID_CREDENTIALS"
 *       403:
 *         description: Account not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notVerified:
 *                 value:
 *                   success: false
 *                   error: "Please verify your account first"
 *                   code: "ACCOUNT_NOT_VERIFIED"
 *       423:
 *         description: Account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               accountLocked:
 *                 value:
 *                   success: false
 *                   error: "Account is locked"
 *                   code: "ACCOUNT_LOCKED"
 */
router.post("/login", validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: |
 *       Logout the current user by invalidating refresh token and clearing authentication cookies.
 *       This endpoint works regardless of authentication state.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Cleared authentication cookies
 *             schema:
 *               type: string
 *               example: "accessToken=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile information of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticateWithCookies, authController.getProfile);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Refresh the access token using the refresh token from cookies.
 *       This is typically called automatically by the frontend when the access token expires.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: Updated authentication cookies
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Token refreshed successfully"
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingToken:
 *                 value:
 *                   success: false
 *                   error: "Refresh token not provided"
 *                   code: "MISSING_REFRESH_TOKEN"
 *               invalidToken:
 *                 value:
 *                   success: false
 *                   error: "Invalid or expired refresh token"
 *                   code: "TOKEN_REFRESH_FAILED"
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
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: |
 *       Send a password reset request. An OTP will be sent to the user's email address.
 *       The OTP is valid for 15 minutes.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "farmer@example.com"
 *     responses:
 *       200:
 *         description: Password reset OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password reset OTP sent to your email"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to send email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/forgot-password",
  validateForgotPasswordRequest,
  passwordResetController.requestPasswordReset
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     description: Verify the OTP sent to the user's email and receive a reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "farmer@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: "6-digit OTP received via email"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         resetToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                           description: "Token to use for password reset"
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/verify-otp",
  validateOTPVerification,
  passwordResetController.verifyOTP
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using verification token
 *     description: Reset the user's password using the token received from OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword, confirmPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: "Token received from OTP verification"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "newSecurePassword123"
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "newSecurePassword123"
 *                 description: "Must match newPassword"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password reset successfully"
 *       400:
 *         description: Invalid token or password validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/reset-password",
  validatePasswordReset,
  passwordResetController.resetPassword
);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for password reset
 *     description: Resend the OTP to the user's email if the previous one expired or wasn't received
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "farmer@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: No pending password reset request or too soon to resend
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/resend-otp",
  validateResendOTP,
  passwordResetController.resendOTP
);

/**
 * @swagger
 * /api/auth/verify-account:
 *   post:
 *     summary: Verify account with new password
 *     description: |
 *       Complete account verification by setting a new password.
 *       This is used when farmers first activate their accounts.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, tempPassword, newPassword, confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "farmer@example.com"
 *               tempPassword:
 *                 type: string
 *                 example: "temp123456"
 *                 description: "Temporary password received via email"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "mySecurePassword123"
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "mySecurePassword123"
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     summary: Get current user permissions
 *     description: |
 *       Get the list of permissions for the currently authenticated user.
 *       This is useful for frontend permission-based rendering.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["READ:BEST_PRACTICES", "CREATE:DISCUSSIONS", "UPDATE:PROFILE"]
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     description: |
 *       Change the password for the currently authenticated user.
 *       Requires the current password for verification.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword, confirmPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: "currentPassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "newSecurePassword456"
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "newSecurePassword456"
 *                 description: "Must match newPassword"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error or incorrect old password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/change-password",
  authenticateWithCookies,
  validatePasswordChange,
  authController.changePassword
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the profile information for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               lastname:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               province:
 *                 type: string
 *                 example: "Kigali"
 *               district:
 *                 type: string
 *                 example: "Nyarugenge"
 *               sector:
 *                 type: string
 *                 example: "Kimisagara"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  "/profile",
  authenticateWithCookies,
  validateProfileUpdate,
  authController.updateProfile
);

export default router;
