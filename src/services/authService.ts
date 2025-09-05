import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Op } from "sequelize";
import sequelize from "../config/database";
import User from "../models/User";
import Role from "../models/Role";
import Permission from "../models/Permission";
import Farm from "../models/Farm";
import RefreshToken from "../models/RefreshToken";
import { emailService } from "./emailService";
import permissionService from "./permissionService";

// TypeScript interface for User with role associations
interface UserWithRole extends User {
  role?: Role & {
    permissions?: Permission[];
  };
}

export interface RegisterFarmerData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  farmName: string;
  province: string;
  district: string;
  sector: string;
  field?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface AuthResponse {
  user: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
    role: string;
    permissions: string[];
    organization?: string;
    province?: string;
    district?: string;
    sector?: string;
    points: number;
    level_id: number;
    is_verified: boolean;
    is_locked: boolean;
    created_at: string;
    updated_at: string;
  };
  tokens: TokenPair;
}

export interface JWTPayload {
  userId: number;
  role: string;
  permissions: string[];
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

// Custom error class for verification required
class VerificationRequiredError extends Error {
  public email: string;

  constructor(message: string, email: string) {
    super(message);
    this.name = "VerificationRequiredError";
    this.email = email;
  }
}

class AuthService {
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || "farm-connect-secret-key";
  private readonly ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  private readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  private readonly SALT_ROUNDS = 12;

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Generate a unique device ID based on device info and user agent
   */
  private generateDeviceId(
    deviceInfo: any,
    userAgent?: string,
    ipAddress?: string
  ): string {
    const deviceString = JSON.stringify({
      userAgent: userAgent || deviceInfo?.userAgent || "",
      platform: deviceInfo?.platform || "",
      language: deviceInfo?.language || "",
      screen: deviceInfo?.screen || "",
      timezone: deviceInfo?.timezone || "",
      ipAddress: ipAddress || "",
    });

    return crypto
      .createHash("sha256")
      .update(deviceString)
      .digest("hex")
      .substring(0, 32);
  }

  /**
   * Compare password with hash
   */
  private async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token (short-lived)
   */
  private generateAccessToken(
    userId: number,
    role: string,
    permissions: string[]
  ): string {
    const payload = {
      userId,
      role,
      permissions,
      type: "access",
    };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions);
  }

  /**
   * Generate refresh token (long-lived)
   */
  private generateRefreshToken(userId: number, tokenId: string): string {
    const payload = {
      userId,
      tokenId,
      type: "refresh",
    };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);
  }

  /**
   * Generate CSRF token
   */
  private generateCSRFToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate token pair with refresh token storage
   */
  private async generateTokenPair(
    user: any,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    const tokenId = crypto.randomUUID();

    // Get user permissions using the permission service
    const permissions = await this.getUserPermissions(user.id);

    const accessToken = this.generateAccessToken(
      user.id,
      user.role?.name || "farmer",
      permissions
    );
    const refreshToken = this.generateRefreshToken(user.id, tokenId);
    const csrfToken = this.generateCSRFToken();

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Generate device ID for tracking
    const deviceId = this.generateDeviceId(deviceInfo, undefined, ipAddress);

    await RefreshToken.create({
      user_id: user.id,
      token: tokenId,
      device_id: deviceId,
      device_info:
        typeof deviceInfo === "object" ? deviceInfo : { userAgent: deviceInfo },
      ip_address: ipAddress,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken, csrfToken };
  }

  /**
   * Generate username from email
   */
  private generateUsername(email: string): string {
    const emailPrefix = email.split("@")[0];
    const timestamp = Date.now().toString().slice(-4);
    return `${emailPrefix}${timestamp}`;
  }

  /**
   * Get farmer role ID
   */
  private async getFarmerRoleId(): Promise<number> {
    const farmerRole = await Role.findOne({ where: { name: "farmer" } });
    if (!farmerRole) {
      throw new Error(
        "Farmer role not found. Please ensure roles are properly seeded."
      );
    }
    return farmerRole.id;
  }

  /**
   * Get user permissions by role
   */
  private async getUserPermissions(userId: number): Promise<string[]> {
    try {
      return await permissionService.getUserPermissions(userId);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      // Return basic permissions as fallback
      return [
        "view_own_profile",
        "edit_own_profile",
        "view_best_practices",
        "participate_discussions",
        "take_quiz",
        "view_resources",
      ];
    }
  }

  /**
   * Register a new farmer
   */
  async registerFarmer(
    data: RegisterFarmerData,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
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
    } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error("User with this email already exists");
      error.name = "DuplicateEmailError";
      throw error;
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate username
    const username = this.generateUsername(email);

    // Get farmer role ID
    const farmerRoleId = await this.getFarmerRoleId();

    try {
      // Create user with farmer role
      const user = await User.create({
        firstname,
        lastname,
        email,
        username,
        password: hashedPassword,
        organization: farmName,
        province,
        district,
        sector,
        points: 0,
        is_locked: false,
        is_verified: true, // Farmers are auto-verified
        level_id: 1, // Default to level 1
        role_id: farmerRoleId,
      });

      // Create associated farm
      await Farm.create({
        name: farmName,
        location: `${sector}, ${district}, ${province}`,
        description: field ? `Farm specializing in ${field}` : undefined,
        ownerName: `${firstname} ${lastname}`,
        contactEmail: email,
      });

      // Get role data for token generation
      const roleData = await Role.findByPk(farmerRoleId);
      const userWithRole = { ...user.toJSON(), role: roleData };

      // Generate secure token pair
      const tokens = await this.generateTokenPair(
        userWithRole,
        deviceInfo,
        ipAddress
      );

      // Get user permissions
      const permissions = await this.getUserPermissions(user.id);

      // Return auth response
      return {
        user: {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          username: user.username,
          role: "farmer",
          permissions,
          organization: user.organization,
          province: user.province,
          district: user.district,
          sector: user.sector,
          points: user.points,
          level_id: user.level_id,
          is_verified: user.is_verified,
          is_locked: user.is_locked,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
        },
        tokens,
      };
    } catch (error: any) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    // Find user with role
    const user = (await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    })) as UserWithRole | null;

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user is locked
    if (user.is_locked) {
      throw new Error("Account is temporarily locked. Contact administrator.");
    }

    // Check if password is correct
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Check if user is verified
    if (!user.is_verified) {
      throw new VerificationRequiredError(
        "Account requires verification. Please complete first-time login verification.",
        user.email
      );
    }

    // Generate secure token pair
    const tokens = await this.generateTokenPair(user, deviceInfo, ipAddress);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);

    // Fire-and-forget streak update & possible bonus
    import("./scoring/StreakService").then((mod) => {
      mod.streakService
        .recordLogin(user.id, (user as any).timezone)
        .catch((e) => console.error("[streak] recordLogin failed", e));
    });

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: user.role?.name || "farmer",
        permissions,
        organization: user.organization,
        province: user.province,
        district: user.district,
        sector: user.sector,
        points: user.points,
        level_id: user.level_id,
        is_verified: user.is_verified,
        is_locked: user.is_locked,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Generate a temporary password using cryptographically secure random generation
   */
  generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>/\\";
    let password = "";

    // Ensure at least one character from each type
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>/\\";

    // Use crypto.randomBytes for cryptographically secure random generation
    password += uppercase[crypto.randomBytes(1)[0] % uppercase.length];
    password += lowercase[crypto.randomBytes(1)[0] % lowercase.length];
    password += numbers[crypto.randomBytes(1)[0] % numbers.length];
    password += symbols[crypto.randomBytes(1)[0] % symbols.length];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password += charset[crypto.randomBytes(1)[0] % charset.length];
    }

    // Shuffle the password using cryptographically secure random
    const passwordArray = password.split("");
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.randomBytes(1)[0] % (i + 1);
      [passwordArray[i], passwordArray[j]] = [
        passwordArray[j],
        passwordArray[i],
      ];
    }

    return passwordArray.join("");
  }

  /**
   * Create user by admin (with email credentials)
   */
  async createUserByAdmin(userData: {
    firstname: string;
    lastname: string;
    email: string;
    username: string;
    organization?: string;
    sector?: string;
    district?: string;
    province?: string;
    role_id: number;
    level_id?: number;
  }): Promise<{ user: any; temporaryPassword: string; emailSent: boolean }> {
    const {
      firstname,
      lastname,
      email,
      username,
      organization,
      sector,
      district,
      province,
      role_id,
      level_id,
    } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);

    // Get role info for email
    const role = await Role.findByPk(role_id);
    if (!role) {
      throw new Error("Invalid role specified");
    }

    try {
      // Create user with is_verified = false
      const user = await User.create({
        firstname,
        lastname,
        email,
        username,
        password: hashedPassword,
        organization,
        sector,
        district,
        province,
        points: 0,
        is_locked: false,
        is_verified: false, // Admin-created users need to verify on first login
        level_id: level_id || 1,
        role_id,
      });

      // Try to send email with credentials
      let emailSent = false;
      try {
        const { emailService } = await import("./emailService");
        await emailService.sendUserCredentials(
          email,
          username,
          temporaryPassword,
          `${firstname} ${lastname}`,
          role.name
        );
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send credentials email:", emailError);
        // Don't throw error here - user was created successfully
      }

      return {
        user: {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          username: user.username,
          organization: user.organization,
          role: role.name,
          is_verified: user.is_verified,
        },
        temporaryPassword: emailSent ? "[SENT_VIA_EMAIL]" : temporaryPassword,
        emailSent,
      };
    } catch (error: any) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  /**
   * Resend user credentials
   */
  async resendUserCredentials(
    userId: number
  ): Promise<{ emailSent: boolean; temporaryPassword?: string }> {
    // Find user
    const user = (await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
    })) as UserWithRole | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Generate new temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);

    // Update user password and reset verification status
    await user.update({
      password: hashedPassword,
      is_verified: false, // Reset verification status
    });

    // Send credentials via email
    let emailSent = false;
    try {
      const fullName = `${user.firstname} ${user.lastname}`;
      const roleName = user.role?.name || "User";

      await emailService.sendUserCredentials(
        user.email,
        user.email, // Using email as username
        temporaryPassword,
        fullName,
        roleName
      );
      emailSent = true;
    } catch (error) {
      console.error("Failed to send credentials email:", error);
      emailSent = false;
    }

    return {
      emailSent,
      temporaryPassword: emailSent ? undefined : temporaryPassword,
    };
  }

  /**
   * First-time login verification (password reset)
   */
  async firstTimeLoginVerification(
    email: string,
    currentPassword: string,
    newPassword: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    // Find user
    const user = (await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    })) as UserWithRole | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is already verified
    if (user.is_verified) {
      throw new Error("User is already verified. Please use regular login.");
    }

    // Check if user is locked
    if (user.is_locked) {
      throw new Error("Account is temporarily locked. Contact administrator.");
    }

    // Verify current password
    const isCurrentPasswordValid = await this.comparePassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update user: set new password and mark as verified
    await user.update({
      password: hashedNewPassword,
      is_verified: true,
    });

    // Generate secure token pair
    const tokens = await this.generateTokenPair(user, deviceInfo, ipAddress);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: user.role?.name || "user",
        permissions,
        organization: user.organization,
        province: user.province,
        district: user.district,
        sector: user.sector,
        points: user.points,
        level_id: user.level_id,
        is_verified: user.is_verified,
        is_locked: user.is_locked,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * First-time login verification (password reset without current password)
   */
  async firstTimeLoginVerificationSimple(
    email: string,
    newPassword: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    // Find user
    const user = (await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    })) as UserWithRole | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is already verified
    if (user.is_verified) {
      throw new Error("User is already verified. Please use regular login.");
    }

    // Check if user is locked
    if (user.is_locked) {
      throw new Error("Account is temporarily locked. Contact administrator.");
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update user: set new password and mark as verified
    await user.update({
      password: hashedNewPassword,
      is_verified: true,
    });

    // Generate secure token pair
    const tokens = await this.generateTokenPair(user, deviceInfo, ipAddress);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: user.role?.name || "user",
        permissions,
        organization: user.organization,
        province: user.province,
        district: user.district,
        sector: user.sector,
        points: user.points,
        level_id: user.level_id,
        is_verified: user.is_verified,
        is_locked: user.is_locked,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify old password
    const isOldPasswordValid = await this.comparePassword(
      oldPassword,
      user.password
    );
    if (!isOldPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Check if new password is different from old password
    const isSamePassword = await this.comparePassword(
      newPassword,
      user.password
    );
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await user.update({ password: hashedPassword });

    return {
      success: true,
      message: "Password changed successfully",
    };
  }

  /**
   * Update user profile information
   */
  async updateProfile(
    userId: number,
    profileData: {
      firstname?: string;
      lastname?: string;
      email?: string;
      province?: string;
      district?: string;
      sector?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    user: {
      id: number;
      firstname: string;
      lastname: string;
      email: string;
      username: string;
      role: string;
      permissions: string[];
      organization?: string;
      province?: string;
      district?: string;
      sector?: string;
      points: number;
      level_id: number;
      is_verified: boolean;
      is_locked: boolean;
      created_at: string;
      updated_at: string;
    };
  }> {
    // Find user
    const user = (await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    })) as UserWithRole | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is being changed and if it already exists
    if (profileData.email && profileData.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: profileData.email },
      });
      if (existingUser) {
        throw new Error("Email address is already in use");
      }
    }

    // Update user profile
    await user.update(profileData);

    // Reload user with updated data
    await user.reload();

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);

    return {
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: user.role?.name || "user",
        permissions,
        organization: user.organization,
        province: user.province,
        district: user.district,
        sector: user.sector,
        points: user.points,
        level_id: user.level_id,
        is_verified: user.is_verified,
        is_locked: user.is_locked,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as {
        userId: number;
        tokenId: string;
        type: string;
      };

      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      // Find stored refresh token
      const storedToken = await RefreshToken.findOne({
        where: {
          user_id: decoded.userId,
          token: decoded.tokenId,
          expires_at: { [Op.gt]: new Date() },
        },
      });

      if (!storedToken) {
        throw new Error("Invalid or expired refresh token");
      }

      // Get user with permissions
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["name"],
            include: [
              {
                model: Permission,
                through: { attributes: [] },
                attributes: ["name"],
              },
            ],
          },
        ],
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Delete old refresh token
      await storedToken.destroy();

      // Generate new token pair (refresh token rotation)
      return await this.generateTokenPair(user, deviceInfo, ipAddress);
    } catch (error) {
      throw new Error("Token refresh failed");
    }
  }

  /**
   * Logout user and invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as {
        userId: number;
        tokenId: string;
        type: string;
      };

      if (decoded.type === "refresh") {
        await RefreshToken.destroy({
          where: {
            user_id: decoded.userId,
            token: decoded.tokenId,
          },
        });
      }
    } catch (error) {
      // Silent fail for logout - even if token is invalid, consider logout successful
    }
  }

  /**
   * Verify access token (for cookie authentication)
   */
  async verifyAccessToken(
    token: string
  ): Promise<{ userId: number; role: string; permissions: string[] }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      if (decoded.type !== "access") {
        throw new Error("Invalid token type");
      }

      return {
        userId: decoded.userId,
        role: decoded.role,
        permissions: decoded.permissions,
      };
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await RefreshToken.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() },
      },
    });
  }

  /**
   * Get all refresh tokens for a specific device
   */
  async getTokensByDevice(
    userId: number,
    deviceId: string
  ): Promise<RefreshToken[]> {
    return RefreshToken.findAll({
      where: {
        user_id: userId,
        device_id: deviceId,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });
  }

  /**
   * Revoke all tokens for a specific device
   */
  async revokeDeviceTokens(userId: number, deviceId: string): Promise<void> {
    await RefreshToken.destroy({
      where: {
        user_id: userId,
        device_id: deviceId,
      },
    });
  }

  /**
   * Get all devices with active tokens for a user
   */
  async getUserDevices(
    userId: number
  ): Promise<{ device_id: string; last_used: Date; token_count: number }[]> {
    const devices = (await RefreshToken.findAll({
      where: {
        user_id: userId,
        expires_at: { [Op.gt]: new Date() },
      },
      attributes: [
        "device_id",
        [sequelize.fn("MAX", sequelize.col("created_at")), "last_used"],
        [sequelize.fn("COUNT", sequelize.col("id")), "token_count"],
      ],
      group: ["device_id"],
      order: [[sequelize.fn("MAX", sequelize.col("created_at")), "DESC"]],
      raw: true,
    })) as any[];

    return devices.map((device) => ({
      device_id: device.device_id,
      last_used: new Date(device.last_used),
      token_count: parseInt(device.token_count, 10),
    }));
  }

  /**
   * Revoke all tokens for a user except the current device
   */
  async revokeOtherDeviceTokens(
    userId: number,
    currentDeviceId: string
  ): Promise<void> {
    await RefreshToken.destroy({
      where: {
        user_id: userId,
        device_id: { [Op.ne]: currentDeviceId },
      },
    });
  }
}

export default new AuthService();
