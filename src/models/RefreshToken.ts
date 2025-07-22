import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface RefreshTokenAttributes {
  id: string;
  user_id: number;
  token: string;
  device_id?: string;
  device_info?: object;
  ip_address?: string;
  user_agent?: string;
  is_revoked: boolean;
  expires_at: Date;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface RefreshTokenCreationAttributes
  extends Optional<
    RefreshTokenAttributes,
    "id" | "created_at" | "updated_at" | "last_used_at" | "is_revoked"
  > {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: string;
  public user_id!: number;
  public token!: string;
  public device_id?: string;
  public device_info?: object;
  public ip_address?: string;
  public user_agent?: string;
  public is_revoked!: boolean;
  public expires_at!: Date;
  public last_used_at?: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    device_info: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "refresh_tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["token"],
        unique: true,
      },
      {
        fields: ["device_id"],
      },
      {
        fields: ["expires_at"],
      },
      {
        fields: ["is_revoked"],
      },
    ],
  }
);

export default RefreshToken;
