import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";
import Farm from "../models/Farm";
import { emailService } from "./emailService";

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

export interface AuthResponse {
  user: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
    role: string;
    permissions: string[];
  };
  token: string;
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
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  private readonly SALT_ROUNDS = 12;

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
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
   * Generate JWT token
   */
  private generateToken(userId: number): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: "7d" });
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
  private async getUserPermissions(roleId: number): Promise<string[]> {
    // This will be implemented when we add RolePermission associations
    // For now, return basic farmer permissions
    return [
      "view_own_profile",
      "edit_own_profile",
      "view_best_practices",
      "participate_discussions",
      "take_quiz",
      "view_resources",
    ];
  }

  /**
   * Register a new farmer
   */
  async registerFarmer(data: RegisterFarmerData): Promise<AuthResponse> {
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
      throw new Error("User with this email already exists");
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

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Get user permissions
      const permissions = await this.getUserPermissions(farmerRoleId);

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
        },
        token,
      };
    } catch (error: any) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user with role
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

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

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.role_id);

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: (user as any).role?.name || "farmer",
        permissions,
      },
      token,
    };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<{ userId: number }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: number };
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Generate a temporary password
   */
  generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";

    // Ensure at least one character from each type
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";

    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
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
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
    });

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
      const roleName = (user as any).role?.name || "User";

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
    newPassword: string
  ): Promise<AuthResponse> {
    // Find user
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

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

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.role_id);

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: (user as any).role?.name || "user",
        permissions,
      },
      token,
    };
  }

  /**
   * First-time login verification (password reset without current password)
   */
  async firstTimeLoginVerificationSimple(
    email: string,
    newPassword: string
  ): Promise<AuthResponse> {
    // Find user
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

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

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Get user permissions
    const permissions = await this.getUserPermissions(user.role_id);

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: (user as any).role?.name || "user",
        permissions,
      },
      token,
    };
  }
}

export default new AuthService();
