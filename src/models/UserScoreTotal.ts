import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface UserScoreTotalAttributes {
  user_id: number;
  total_points: number; // scaled *1000
  created_at?: Date;
  updated_at?: Date;
}

interface UserScoreTotalCreation
  extends Optional<UserScoreTotalAttributes, "total_points"> {}

class UserScoreTotal
  extends Model<UserScoreTotalAttributes, UserScoreTotalCreation>
  implements UserScoreTotalAttributes
{
  public user_id!: number;
  public total_points!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserScoreTotal.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    total_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "UserScoreTotal",
    tableName: "user_score_totals",
    timestamps: true,
    underscored: true,
  }
);

export default UserScoreTotal;
