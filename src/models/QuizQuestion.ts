import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Quiz from "./Quiz";
import QuizQuestionOption from "./QuizQuestionOption";

export interface QuizQuestionAttributes {
  id: number;
  quiz_id: number;
  text: string;
  explanation?: string | null;
  order_index: number;
  type: "mcq" | "multi" | "truefalse";
  difficulty: "easy" | "medium" | "hard";
  is_active: boolean;
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: number | null;
  media_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface QuizQuestionCreationAttributes
  extends Optional<QuizQuestionAttributes, "id" | "order_index"> {}

class QuizQuestion
  extends Model<QuizQuestionAttributes, QuizQuestionCreationAttributes>
  implements QuizQuestionAttributes
{
  public id!: number;
  public quiz_id!: number;
  public text!: string;
  public explanation?: string | null;
  public order_index!: number;
  public type!: "mcq" | "multi" | "truefalse";
  public difficulty!: "easy" | "medium" | "hard";
  public is_active!: boolean;
  public is_deleted!: boolean;
  public deleted_at?: Date | null;
  public deleted_by?: number | null;
  public media_url?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associations: {
    quiz: Association<QuizQuestion, Quiz>;
    options: Association<QuizQuestion, QuizQuestionOption>;
  };
}

QuizQuestion.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quiz_id: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    explanation: { type: DataTypes.TEXT, allowNull: true },
    order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: {
      type: DataTypes.ENUM("mcq", "multi", "truefalse"),
      allowNull: false,
      defaultValue: "mcq",
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false,
      defaultValue: "medium",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER, allowNull: true },
    media_url: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: "QuizQuestion",
    tableName: "quiz_questions",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["quiz_id"] },
      { fields: ["order_index"] },
      { fields: ["type"] },
      { fields: ["difficulty"] },
    ],
  }
);

export default QuizQuestion;
