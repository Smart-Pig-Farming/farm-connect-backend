import { Router } from "express";
import secureAuthController from "../controllers/secureAuthController";
import * as cookieAuth from "../middleware/cookieAuth";

const router = Router();

// Public routes (no authentication required)
router.post("/login", secureAuthController.login.bind(secureAuthController));

// Protected routes (authentication required)
router.post(
  "/refresh",
  secureAuthController.refresh.bind(secureAuthController)
);
router.post(
  "/logout",
  cookieAuth.authenticateWithCookies,
  secureAuthController.logout.bind(secureAuthController)
);
router.post(
  "/logout-all",
  cookieAuth.authenticateWithCookies,
  secureAuthController.logoutAll.bind(secureAuthController)
);
router.get(
  "/me",
  cookieAuth.authenticateWithCookies,
  secureAuthController.getCurrentUser.bind(secureAuthController)
);

// Health check for authentication
router.get("/status", cookieAuth.optionalAuth, (req, res) => {
  const isAuthenticated = !!req.user;
  res.json({
    success: true,
    authenticated: isAuthenticated,
    user: isAuthenticated
      ? {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
        }
      : null,
  });
});

export default router;
