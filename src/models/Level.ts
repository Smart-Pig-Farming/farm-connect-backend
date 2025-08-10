import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// Level attributes interface
export interface LevelAttributes {
  id: number;
  name: string;
  description: string;
  min_points: number;
  max_points: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface LevelCreationAttributes extends Optional<LevelAttributes, "id"> {}

// Level model class
class Level
  extends Model<LevelAttributes, LevelCreationAttributes>
  implements LevelAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
  public min_points!: number;
  public max_points!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Level.init(
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
    min_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Level",
    tableName: "levels",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["min_points", "max_points"],
      },
    ],
  }
);

export default Level;
