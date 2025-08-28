import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Quiz from "./Quiz";
import BestPracticeTag from "./BestPracticeTag";

export interface QuizTagAssignmentAttributes {
  id: number;
  quiz_id: number;
  tag_id: number;
  assigned_at: Date;
  is_primary?: boolean;
}

interface QuizTagAssignmentCreationAttributes
  extends Optional<QuizTagAssignmentAttributes, "id" | "assigned_at"> {}

class QuizTagAssignment
  extends Model<
    QuizTagAssignmentAttributes,
    QuizTagAssignmentCreationAttributes
  >
  implements QuizTagAssignmentAttributes
{
  public id!: number;
  public quiz_id!: number;
  public tag_id!: number;
  public assigned_at!: Date;
  public is_primary?: boolean;

  public static associations: {
    quiz: Association<QuizTagAssignment, Quiz>;
    tag: Association<QuizTagAssignment, BestPracticeTag>;
  };
}

QuizTagAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quiz_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Quiz, key: "id" },
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: BestPracticeTag, key: "id" },
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "QuizTagAssignment",
    tableName: "quiz_tag_assignments",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["quiz_id", "tag_id"],
      },
    ],
  }
);

export default QuizTagAssignment;
