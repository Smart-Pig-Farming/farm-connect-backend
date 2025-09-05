import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import BestPracticeContent from "./BestPracticeContent";
import User from "./User";

export interface BestPracticeReadAttributes {
  id: number;
  best_practice_id: number;
  user_id: number;
  first_read_at?: Date;
  last_read_at?: Date;
  read_count: number;
}

interface BestPracticeReadCreationAttributes
  extends Optional<BestPracticeReadAttributes, "id" | "read_count"> {}

class BestPracticeRead
  extends Model<BestPracticeReadAttributes, BestPracticeReadCreationAttributes>
  implements BestPracticeReadAttributes
{
  public id!: number;
  public best_practice_id!: number;
  public user_id!: number;
  public first_read_at!: Date;
  public last_read_at!: Date;
  public read_count!: number;
}

BestPracticeRead.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    best_practice_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    first_read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    read_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    sequelize,
    modelName: "BestPracticeRead",
    tableName: "best_practice_reads",
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ["best_practice_id"] },
      { fields: ["user_id", "last_read_at"] },
    ],
  }
);

// Associations (defined here for clarity; index.ts may also define)
BestPracticeContent.hasMany(BestPracticeRead, {
  foreignKey: "best_practice_id",
  as: "reads",
});
BestPracticeRead.belongsTo(BestPracticeContent, {
  foreignKey: "best_practice_id",
  as: "bestPractice",
});
User.hasMany(BestPracticeRead, {
  foreignKey: "user_id",
  as: "bestPracticeReads",
});
BestPracticeRead.belongsTo(User, { foreignKey: "user_id", as: "user" });

export default BestPracticeRead;
