import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// Tag attributes interface
export interface TagAttributes {
  id: string;
  name: string;
  color: string;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes
interface TagCreationAttributes extends Optional<TagAttributes, "id"> {}

// Tag model class
class Tag
  extends Model<TagAttributes, TagCreationAttributes>
  implements TagAttributes
{
  public id!: string;
  public name!: string;
  public color!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Tag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: "blue",
    },
  },
  {
    sequelize,
    modelName: "Tag",
    tableName: "tags",
    timestamps: true,
    underscored: true,
  }
);

export default Tag;
