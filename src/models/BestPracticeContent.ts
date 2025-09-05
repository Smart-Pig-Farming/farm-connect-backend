import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// BestPracticeContent attributes interface
export interface BestPracticeContentAttributes {
  id: number;
  title: string;
  description: string;
  steps_json: any[]; // [{id,text,order}]
  benefits_json: string[];
  categories: string[];
  media?: any | null;
  language: string;
  is_published: boolean;
  is_deleted: boolean;
  read_count: number;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface BestPracticeContentCreationAttributes
  extends Optional<
    BestPracticeContentAttributes,
    | "id"
    | "is_published"
    | "is_deleted"
    | "read_count"
    | "steps_json"
    | "benefits_json"
    | "categories"
  > {}

// BestPracticeContent model class
class BestPracticeContent
  extends Model<
    BestPracticeContentAttributes,
    BestPracticeContentCreationAttributes
  >
  implements BestPracticeContentAttributes
{
  public id!: number;
  public title!: string;
  public description!: string;
  public steps_json!: any[];
  public benefits_json!: string[];
  public categories!: string[];
  public media?: any | null;
  public language!: string;
  public is_published!: boolean;
  public is_deleted!: boolean;
  public read_count!: number;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual getters/setters for compatibility
  public get steps(): any[] {
    return this.getDataValue("steps_json");
  }
  public set steps(val: any[]) {
    this.setDataValue("steps_json", val);
  }
  public get benefits(): string[] {
    return this.getDataValue("benefits_json");
  }
  public set benefits(val: string[]) {
    this.setDataValue("benefits_json", val);
  }

  // Association declarations
  public static associations: {
    creator: Association<BestPracticeContent, User>;
  };
}

BestPracticeContent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    steps_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    benefits_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    categories: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "BestPracticeContent",
    tableName: "best_practice_contents",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["created_by"],
      },
      { fields: ["language"] },
      { fields: ["is_published"] },
      { fields: ["is_deleted"] },
      { fields: ["created_at"] },
      { fields: ["title"] },
    ],
  }
);

export default BestPracticeContent;
