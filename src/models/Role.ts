import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Role attributes interface
export interface RoleAttributes {
  id: number;
  name: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface RoleCreationAttributes extends Optional<RoleAttributes, 'id'> {}

// Role model class
class Role extends Model<RoleAttributes, RoleCreationAttributes> 
  implements RoleAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Role.init({
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
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'roles',
  timestamps: true,
  underscored: true,
});

export default Role;
