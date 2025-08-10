import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Resource from "./Resource";
import Action from "./Action";

// Permission attributes interface
export interface PermissionAttributes {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  resource_id: number;
  action_id: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface PermissionCreationAttributes
  extends Optional<PermissionAttributes, "id"> {}

// Permission model class
class Permission
  extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
  public is_active!: boolean;
  public resource_id!: number;
  public action_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    resource: Association<Permission, Resource>;
    action: Association<Permission, Action>;
  };
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
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
    resource_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Resource,
        key: "id",
      },
    },
    action_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Action,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["resource_id", "action_id"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

export default Permission;
