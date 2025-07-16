import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { BaseAttributes, BaseCreationAttributes } from "./types";

interface FarmAttributes extends BaseAttributes {
  name: string;
  location: string;
  description?: string;
  ownerName: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface FarmCreationAttributes
  extends Optional<
    FarmAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "description"
    | "contactEmail"
    | "contactPhone"
  > {}

class Farm
  extends Model<FarmAttributes, FarmCreationAttributes>
  implements FarmAttributes
{
  public id!: string;
  public name!: string;
  public location!: string;
  public description?: string;
  public ownerName!: string;
  public contactEmail?: string;
  public contactPhone?: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly pigs?: any[]; // Will be properly typed when Pig model is created
}

Farm.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ownerName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Farm",
    tableName: "farms",
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ["name"],
      },
      {
        unique: false,
        fields: ["location"],
      },
    ],
  }
);

export default Farm;
export { FarmAttributes, FarmCreationAttributes };
