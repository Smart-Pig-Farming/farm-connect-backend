import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors.array(),
    });
    return;
  }
  next();
};

/**
 * Validation rules for farmer registration
 */
export const validateFarmerRegistration = [
  body("firstname")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name must contain only letters and spaces"),

  body("lastname")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name must contain only letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("farmName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Farm name must be between 2 and 100 characters")
    .notEmpty()
    .withMessage("Farm name is required"),

  body("province")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Province must be between 2 and 100 characters")
    .notEmpty()
    .withMessage("Province is required"),

  body("district")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("District must be between 2 and 100 characters")
    .notEmpty()
    .withMessage("District is required"),

  body("sector")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Sector must be between 2 and 100 characters")
    .notEmpty()
    .withMessage("Sector is required"),

  body("field")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Field description must not exceed 200 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange = [
  body("oldPassword").notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 8, max: 128 })
    .withMessage("New password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),

  handleValidationErrors,
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  handleValidationErrors,
];

/**
 * Validation rules for password reset with OTP
 */
export const validatePasswordReset = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 characters")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  body("newPassword")
    .isLength({ min: 8, max: 128 })
    .withMessage("New password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),

  handleValidationErrors,
];
