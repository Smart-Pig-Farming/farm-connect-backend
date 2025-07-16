import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Action attributes interface
export interface ActionAttributes {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface ActionCreationAttributes extends Optional<ActionAttributes, 'id'> {}

// Action model class
class Action extends Model<ActionAttributes, ActionCreationAttributes> 
  implements ActionAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Action.init({
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
}, {
  sequelize,
  modelName: 'Action',
  tableName: 'actions',
  timestamps: true,
  underscored: true,
});

export default Action;
