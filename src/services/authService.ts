import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/User";
import Role from "../models/Role";
import Farm from "../models/Farm";

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
      throw new Error(
        "Account requires verification. Please complete first-time login verification."
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
}

export default new AuthService();
