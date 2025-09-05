import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import QuizAttempt from "./QuizAttempt";
import QuizQuestion from "./QuizQuestion";
import QuizQuestionOption from "./QuizQuestionOption";

export interface QuizAttemptAnswerAttributes {
  id: number;
  attempt_id: number;
  question_id: number;
  option_id: number;
  is_correct_snapshot: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface QuizAttemptAnswerCreationAttributes
  extends Optional<QuizAttemptAnswerAttributes, "id"> {}

class QuizAttemptAnswer
  extends Model<
    QuizAttemptAnswerAttributes,
    QuizAttemptAnswerCreationAttributes
  >
  implements QuizAttemptAnswerAttributes
{
  public id!: number;
  public attempt_id!: number;
  public question_id!: number;
  public option_id!: number;
  public is_correct_snapshot!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associations: {
    attempt: Association<QuizAttemptAnswer, QuizAttempt>;
    question: Association<QuizAttemptAnswer, QuizQuestion>;
    option: Association<QuizAttemptAnswer, QuizQuestionOption>;
  };
}

QuizAttemptAnswer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    attempt_id: { type: DataTypes.INTEGER, allowNull: false },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    option_id: { type: DataTypes.INTEGER, allowNull: false },
    is_correct_snapshot: { type: DataTypes.BOOLEAN, allowNull: false },
  },
  {
    sequelize,
    modelName: "QuizAttemptAnswer",
    tableName: "quiz_attempt_answers",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["attempt_id"] },
      { fields: ["question_id"] },
      { fields: ["attempt_id", "question_id", "option_id"] },
    ],
  }
);

export default QuizAttemptAnswer;
