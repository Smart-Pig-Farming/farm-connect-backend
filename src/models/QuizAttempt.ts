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
  served_question_ids?: number[] | null;
  total_questions?: number | null;
  question_order?: number[] | null;
  passing_score_snapshot?: number | null;
  expires_at?: Date | null;
  status?: "in_progress" | "completed" | "expired";
  attempt_questions_snapshot?: any | null;
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
  public served_question_ids?: number[] | null;
  public total_questions?: number | null;
  public question_order?: number[] | null;
  public passing_score_snapshot?: number | null;
  public expires_at?: Date | null;
  public status?: "in_progress" | "completed" | "expired";
  public attempt_questions_snapshot?: any | null;
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
    served_question_ids: { type: DataTypes.JSONB, allowNull: true },
    total_questions: { type: DataTypes.INTEGER, allowNull: true },
    question_order: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
    passing_score_snapshot: { type: DataTypes.INTEGER, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("in_progress", "completed", "expired"),
      allowNull: false,
      defaultValue: "in_progress",
    },
    attempt_questions_snapshot: { type: DataTypes.JSONB, allowNull: true },
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
