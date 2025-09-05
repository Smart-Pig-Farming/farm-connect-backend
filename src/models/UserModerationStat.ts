import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface UserModerationStatAttributes {
  user_id: number;
  mod_approvals: number;
  created_at?: Date;
  updated_at?: Date;
}
interface Creation
  extends Optional<
    UserModerationStatAttributes,
    "mod_approvals" | "created_at" | "updated_at"
  > {}

class UserModerationStat
  extends Model<UserModerationStatAttributes, Creation>
  implements UserModerationStatAttributes
{
  public user_id!: number;
  public mod_approvals!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserModerationStat.init(
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    mod_approvals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: "UserModerationStat",
    tableName: "user_moderation_stats",
    underscored: true,
    timestamps: false,
  }
);

export default UserModerationStat;
