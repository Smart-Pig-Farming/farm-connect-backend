import { DataTypes, Model, Optional, Op } from "sequelize";
import sequelize from "../config/database";

interface PasswordResetTokenAttributes {
  id: number;
  userId: number;
  email: string;
  otp: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PasswordResetTokenCreationAttributes
  extends Optional<
    PasswordResetTokenAttributes,
    "id" | "isUsed" | "createdAt" | "updatedAt"
  > {}

class PasswordResetToken
  extends Model<
    PasswordResetTokenAttributes,
    PasswordResetTokenCreationAttributes
  >
  implements PasswordResetTokenAttributes
{
  public id!: number;
  public userId!: number;
  public email!: string;
  public otp!: string;
  public expiresAt!: Date;
  public isUsed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Check if OTP is valid (not expired and not used)
  public isValid(): boolean {
    return !this.isUsed && new Date() < this.expiresAt;
  }

  // Mark OTP as used
  public async markAsUsed(): Promise<void> {
    this.isUsed = true;
    await this.save();
  }

  // Static method to clean up expired tokens
  public static async cleanupExpired(): Promise<number> {
    const result = await PasswordResetToken.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
    return result;
  }
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    otp: {
      type: DataTypes.STRING(4),
      allowNull: false,
      validate: {
        len: [4, 4], // Exactly 4 digits
        isNumeric: true,
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "PasswordResetToken",
    tableName: "password_reset_tokens",
    timestamps: true,
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["otp"],
      },
      {
        fields: ["expiresAt"],
      },
      {
        fields: ["userId"],
      },
    ],
  }
);

export { PasswordResetToken };
