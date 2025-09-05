import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface UserStreakAttributes {
  user_id: number;
  current_length: number;
  best_length: number;
  last_day: Date | null; // stored as date (no time)
  updated_at?: Date;
  created_at?: Date;
}

interface UserStreakCreationAttributes
  extends Optional<
    UserStreakAttributes,
    "current_length" | "best_length" | "last_day" | "updated_at" | "created_at"
  > {}

class UserStreak
  extends Model<UserStreakAttributes, UserStreakCreationAttributes>
  implements UserStreakAttributes
{
  public user_id!: number;
  public current_length!: number;
  public best_length!: number;
  public last_day!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserStreak.init(
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    current_length: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    best_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_day: { type: DataTypes.DATEONLY, allowNull: true },
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
    modelName: "UserStreak",
    tableName: "user_streaks",
    underscored: true,
    timestamps: false,
  }
);

export default UserStreak;
