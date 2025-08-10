import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// Resource attributes interface
export interface ResourceAttributes {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface ResourceCreationAttributes
  extends Optional<ResourceAttributes, "id"> {}

// Resource model class
class Resource
  extends Model<ResourceAttributes, ResourceCreationAttributes>
  implements ResourceAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Resource.init(
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
    modelName: "Resource",
    tableName: "resources",
    timestamps: true,
    underscored: true,
  }
);

export default Resource;
