import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import {
  ACTIONS,
  RESOURCES,
  createPermissionString,
} from "../constants/permissions";

const router = Router();

// All test routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /test/permissions
 * @desc    Test permission system - accessible to all authenticated users
 * @access  Private
 */
router.get("/permissions", async (req, res): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Permission system is working!",
      data: {
        user: req.user,
        permissions: req.userPermissions || [],
        roles: req.userRoles || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Test failed",
      code: "TEST_FAILED",
    });
  }
});

/**
 * @route   GET /test/admin-only
 * @desc    Test admin-only endpoint
 * @access  Private (Admin only)
 */
router.get(
  "/admin-only",
  requirePermission(createPermissionString(ACTIONS.MANAGE, RESOURCES.USERS)),
  async (req, res): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: "Admin access confirmed!",
        data: {
          user: req.user,
          requiredPermission: createPermissionString(
            ACTIONS.MANAGE,
            RESOURCES.USERS
          ),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Admin test failed",
        code: "ADMIN_TEST_FAILED",
      });
    }
  }
);

/**
 * @route   GET /test/create-post
 * @desc    Test create post permission
 * @access  Private (Users with CREATE:POSTS permission)
 */
router.get(
  "/create-post",
  requirePermission(createPermissionString(ACTIONS.CREATE, RESOURCES.POSTS)),
  async (req, res): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: "Create post permission confirmed!",
        data: {
          user: req.user,
          requiredPermission: createPermissionString(
            ACTIONS.CREATE,
            RESOURCES.POSTS
          ),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Create post test failed",
        code: "CREATE_POST_TEST_FAILED",
      });
    }
  }
);

/**
 * @route   GET /test/moderate-content
 * @desc    Test moderate content permission
 * @access  Private (Users with MODERATE:POSTS permission)
 */
router.get(
  "/moderate-content",
  requirePermission(createPermissionString(ACTIONS.MODERATE, RESOURCES.POSTS)),
  async (req, res): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: "Moderate content permission confirmed!",
        data: {
          user: req.user,
          requiredPermission: createPermissionString(
            ACTIONS.MODERATE,
            RESOURCES.POSTS
          ),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Moderate content test failed",
        code: "MODERATE_CONTENT_TEST_FAILED",
      });
    }
  }
);

export default router;
