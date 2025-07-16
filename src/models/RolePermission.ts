import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import Role from './Role';
import Permission from './Permission';

// RolePermission attributes interface
export interface RolePermissionAttributes {
  id: number;
  role_id: number;
  permission_id: number;
  assigned_at: Date;
}

// Creation attributes (id and assigned_at are auto-generated)
interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id' | 'assigned_at'> {}

// RolePermission model class
class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> 
  implements RolePermissionAttributes {
  public id!: number;
  public role_id!: number;
  public permission_id!: number;
  public assigned_at!: Date;

  // Association declarations
  public static associations: {
    role: Association<RolePermission, Role>;
    permission: Association<RolePermission, Permission>;
  };
}

RolePermission.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Role,
      key: 'id',
    },
  },
  permission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Permission,
      key: 'id',
    },
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'RolePermission',
  tableName: 'role_permissions',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['role_id', 'permission_id'],
    },
  ],
});

export default RolePermission;
