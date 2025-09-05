import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import QuizQuestion from "./QuizQuestion";

export interface QuizQuestionOptionAttributes {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
  order_index: number;
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

interface QuizQuestionOptionCreationAttributes
  extends Optional<
    QuizQuestionOptionAttributes,
    "id" | "is_correct" | "order_index"
  > {}

class QuizQuestionOption
  extends Model<
    QuizQuestionOptionAttributes,
    QuizQuestionOptionCreationAttributes
  >
  implements QuizQuestionOptionAttributes
{
  public id!: number;
  public question_id!: number;
  public text!: string;
  public is_correct!: boolean;
  public order_index!: number;
  public is_deleted!: boolean;
  public deleted_at?: Date | null;
  public deleted_by?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public static associations: {
    question: Association<QuizQuestionOption, QuizQuestion>;
  };
}

QuizQuestionOption.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    modelName: "QuizQuestionOption",
    tableName: "quiz_question_options",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["question_id"] }, { fields: ["order_index"] }],
  }
);

export default QuizQuestionOption;
