import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface UserPrestigeAttributes {
  user_id: number;
  is_moderator: boolean;
  created_at?: Date;
  updated_at?: Date;
}
interface Creation
  extends Optional<
    UserPrestigeAttributes,
    "is_moderator" | "created_at" | "updated_at"
  > {}

class UserPrestige
  extends Model<UserPrestigeAttributes, Creation>
  implements UserPrestigeAttributes
{
  public user_id!: number;
  public is_moderator!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserPrestige.init(
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    is_moderator: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: "UserPrestige",
    tableName: "user_prestige",
    underscored: true,
    timestamps: false,
  }
);

export default UserPrestige;
