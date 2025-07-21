import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Role from "../models/Role";
import RefreshToken from "../models/RefreshToken";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface SecureAuthResponse {
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
}

class SecureAuthService {
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || "farm-connect-secret-key";
  private readonly ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  private readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  private readonly SALT_ROUNDS = 12;

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
    const permissions = user.role?.permissions?.map((p: any) => p.name) || [];

    const accessToken = this.generateAccessToken(
      user.id,
      user.role.name,
      permissions
    );
    const refreshToken = this.generateRefreshToken(user.id, tokenId);
    const csrfToken = this.generateCSRFToken();

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await RefreshToken.create({
      user_id: user.id,
      token: tokenId,
      device_info:
        typeof deviceInfo === "object" ? deviceInfo : { userAgent: deviceInfo },
      ip_address: ipAddress,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken, csrfToken };
  }

  /**
   * Secure login with cookie-based tokens
   */
  async secureLogin(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{
    success: boolean;
    data?: SecureAuthResponse;
    tokens?: TokenPair;
    error?: string;
  }> {
    try {
      // Find user with role and permissions
      const user = await User.findOne({
        where: { email: email.toLowerCase() },
        include: [
          {
            model: Role,
            as: "role",
            include: ["permissions"],
          },
        ],
      });

      if (!user) {
        return { success: false, error: "Invalid credentials" };
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Invalid credentials" };
      }

      // Check if user is locked
      if (user.is_locked) {
        return { success: false, error: "Account is locked" };
      }

      // Check if user is verified
      if (!user.is_verified) {
        return { success: false, error: "Please verify your email first" };
      }

      // Generate tokens
      const tokens = await this.generateTokenPair(user, deviceInfo, ipAddress);

      // Format user response
      const userResponse = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: (user as any).role.name,
        permissions:
          (user as any).role.permissions?.map((p: any) => p.name) || [],
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
      };

      return {
        success: true,
        data: { user: userResponse },
        tokens,
      };
    } catch (error) {
      console.error("Secure login error:", error);
      return { success: false, error: "Login failed" };
    }
  }

  /**
   * Validate and refresh tokens
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<TokenPair | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;

      if (decoded.type !== "refresh") {
        return null;
      }

      // Find refresh token in database
      const storedToken = await RefreshToken.findOne({
        where: {
          token: decoded.tokenId,
          user_id: decoded.userId,
          is_revoked: false,
        },
      });

      if (!storedToken || storedToken.expires_at < new Date()) {
        return null;
      }

      // Get user with role and permissions
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Role,
            as: "role",
            include: ["permissions"],
          },
        ],
      });

      if (!user || user.is_locked) {
        return null;
      }

      // Revoke old refresh token
      await storedToken.update({ is_revoked: true });

      // Generate new token pair
      return await this.generateTokenPair(user, deviceInfo, ipAddress);
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;

      if (decoded.type !== "refresh") {
        return false;
      }

      const result = await RefreshToken.update(
        { is_revoked: true },
        { where: { token: decoded.tokenId } }
      );

      return result[0] > 0;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Revoke all user tokens (logout from all devices)
   */
  async logoutAllDevices(userId: number): Promise<boolean> {
    try {
      await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: userId, is_revoked: false } }
      );
      return true;
    } catch (error) {
      console.error("Logout all devices error:", error);
      return false;
    }
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      if (decoded.type !== "access") {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean expired tokens (should be run periodically)
   */
  async cleanExpiredTokens(): Promise<void> {
    try {
      await RefreshToken.destroy({
        where: {
          expires_at: { [require("sequelize").Op.lt]: new Date() },
        },
      });
    } catch (error) {
      console.error("Token cleanup error:", error);
    }
  }
}

export default new SecureAuthService();
