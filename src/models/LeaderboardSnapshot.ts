import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface LeaderboardSnapshotAttributes {
  id: string;
  period: string;
  period_start: Date;
  user_id: number;
  points: number;
  rank: number;
  created_at?: Date;
}
interface Creation
  extends Optional<LeaderboardSnapshotAttributes, "id" | "created_at"> {}

class LeaderboardSnapshot
  extends Model<LeaderboardSnapshotAttributes, Creation>
  implements LeaderboardSnapshotAttributes
{
  public id!: string;
  public period!: string;
  public period_start!: Date;
  public user_id!: number;
  public points!: number;
  public rank!: number;
  public readonly created_at!: Date;
}

LeaderboardSnapshot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    period: { type: DataTypes.STRING(16), allowNull: false },
    period_start: { type: DataTypes.DATEONLY, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    rank: { type: DataTypes.INTEGER, allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "LeaderboardSnapshot",
    tableName: "leaderboard_snapshots",
    underscored: true,
    timestamps: false,
  }
);

export default LeaderboardSnapshot;
