import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// PostTag attributes interface
export interface PostTagAttributes {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
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
  public id!: number;
  public name!: string;
  public description!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PostTag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
        fields: ["name"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

export default PostTag;
