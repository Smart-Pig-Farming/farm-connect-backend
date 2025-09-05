import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Content from "./Content";
import PostTag from "./PostTag";

// ContentTagAssignment attributes interface
export interface ContentTagAssignmentAttributes {
  id: number;
  content_id: number;
  tag_id: number;
  assigned_at: Date;
}

// Creation attributes (id and assigned_at are auto-generated)
interface ContentTagAssignmentCreationAttributes
  extends Optional<ContentTagAssignmentAttributes, "id" | "assigned_at"> {}

// ContentTagAssignment model class
class ContentTagAssignment
  extends Model<
    ContentTagAssignmentAttributes,
    ContentTagAssignmentCreationAttributes
  >
  implements ContentTagAssignmentAttributes
{
  public id!: number;
  public content_id!: number;
  public tag_id!: number;
  public assigned_at!: Date;

  // Association declarations
  public static associations: {
    content: Association<ContentTagAssignment, Content>;
    tag: Association<ContentTagAssignment, PostTag>;
  };
}

ContentTagAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Content,
        key: "id",
      },
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: PostTag,
        key: "id",
      },
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ContentTagAssignment",
    tableName: "content_tag_assignments",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["content_id", "tag_id"],
      },
    ],
  }
);

export default ContentTagAssignment;
