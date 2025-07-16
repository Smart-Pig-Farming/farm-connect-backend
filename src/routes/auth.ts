import { Router } from "express";
import authController from "../controllers/authController";
import {
  validateFarmerRegistration,
  validateLogin,
} from "../middleware/validation";
import { authenticateToken } from "../middleware/auth";

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
router.get("/me", authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /auth/verify-token
 * @desc    Verify if token is valid
 * @access  Public
 */
router.post("/verify-token", authController.verifyToken);

export default router;
