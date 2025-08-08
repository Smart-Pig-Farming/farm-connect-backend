import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// PostTag attributes interface (junction table for posts and tags)
export interface PostTagAttributes {
  id: string;
  post_id: string;
  tag_name: string;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface PostTagCreationAttributes extends Optional<PostTagAttributes, "id"> {}

// PostTag model class
class PostTag
  extends Model<PostTagAttributes, PostTagCreationAttributes>
  implements PostTagAttributes
{
  public id!: string;
  public post_id!: string;
  public tag_name!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PostTag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "discussion_posts",
        key: "id",
      },
    },
    tag_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "PostTag",
    tableName: "post_tags",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["post_id"],
      },
      {
        fields: ["tag_name"],
      },
      {
        fields: ["post_id", "tag_name"],
        unique: true,
      },
    ],
  }
);

export default PostTag;
