import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { BaseAttributes, BaseCreationAttributes } from "./types";

interface PigAttributes extends BaseAttributes {
  tagId: string;
  breed: string;
  gender: "male" | "female";
  birthDate?: Date;
  weight?: number;
  farmId: string;
  status: "active" | "sold" | "deceased" | "quarantine";
  notes?: string;
}

interface PigCreationAttributes
  extends Optional<
    PigAttributes,
    "id" | "createdAt" | "updatedAt" | "birthDate" | "weight" | "notes"
  > {}

class Pig
  extends Model<PigAttributes, PigCreationAttributes>
  implements PigAttributes
{
  public id!: string;
  public tagId!: string;
  public breed!: string;
  public gender!: "male" | "female";
  public birthDate?: Date;
  public weight?: number;
  public farmId!: string;
  public status!: "active" | "sold" | "deceased" | "quarantine";
  public notes?: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly farm?: any; // Will be properly typed when associations are set up
}

Pig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tagId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    breed: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: false,
    },
    birthDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2), // Max 999.99 kg
      allowNull: true,
      validate: {
        min: 0,
        max: 999.99,
      },
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "farms",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("active", "sold", "deceased", "quarantine"),
      allowNull: false,
      defaultValue: "active",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Pig",
    tableName: "pigs",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["tagId"],
      },
      {
        unique: false,
        fields: ["farmId"],
      },
      {
        unique: false,
        fields: ["breed"],
      },
      {
        unique: false,
        fields: ["status"],
      },
    ],
  }
);

export default Pig;
export { PigAttributes, PigCreationAttributes };
