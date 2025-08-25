import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Quiz from "./Quiz";
import User from "./User";

export interface QuizAttemptAttributes {
  id: number;
  quiz_id: number;
  user_id: number;
  started_at: Date;
  submitted_at?: Date | null;
  duration_seconds_snapshot: number;
  score_raw?: number | null;
  score_percent?: number | null;
  score_points?: string | null; // stored as DECIMAL string
  passed?: boolean | null;
  created_at?: Date;
  updated_at?: Date;
}

interface QuizAttemptCreationAttributes
  extends Optional<
    QuizAttemptAttributes,
    "id" | "submitted_at" | "score_raw" | "score_percent" | "passed"
  > {}

class QuizAttempt
  extends Model<QuizAttemptAttributes, QuizAttemptCreationAttributes>
  implements QuizAttemptAttributes
{
  public id!: number;
  public quiz_id!: number;
  public user_id!: number;
  public started_at!: Date;
  public submitted_at?: Date | null;
  public duration_seconds_snapshot!: number;
  public score_raw?: number | null;
  public score_percent?: number | null;
  public score_points?: string | null;
  public passed?: boolean | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associations: {
    quiz: Association<QuizAttempt, Quiz>;
    user: Association<QuizAttempt, User>;
    answers: any; // deferred detailed typing
  };
}

QuizAttempt.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quiz_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
    duration_seconds_snapshot: { type: DataTypes.INTEGER, allowNull: false },
    score_raw: { type: DataTypes.INTEGER, allowNull: true },
    score_percent: { type: DataTypes.INTEGER, allowNull: true },
    score_points: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    passed: { type: DataTypes.BOOLEAN, allowNull: true },
  },
  {
    sequelize,
    modelName: "QuizAttempt",
    tableName: "quiz_attempts",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["quiz_id", "user_id"] }, { fields: ["started_at"] }],
  }
);

export default QuizAttempt;
