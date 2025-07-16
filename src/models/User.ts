import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import Role from './Role';
import Level from './Level';

// User attributes interface
export interface UserAttributes {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  password: string;
  organization?: string;
  sector?: string;
  district?: string;
  province?: string;
  points: number;
  is_locked: boolean;
  is_verified: boolean;
  level_id: number;
  role_id: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'points' | 'is_locked' | 'is_verified'> {}

// User model class
class User extends Model<UserAttributes, UserCreationAttributes> 
  implements UserAttributes {
  public id!: number;
  public firstname!: string;
  public lastname!: string;
  public email!: string;
  public username!: string;
  public password!: string;
  public organization?: string;
  public sector?: string;
  public district?: string;
  public province?: string;
  public points!: number;
  public is_locked!: boolean;
  public is_verified!: boolean;
  public level_id!: number;
  public role_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual fields
  public get fullName(): string {
    return `${this.firstname} ${this.lastname}`;
  }

  // Association declarations
  public static associations: {
    role: Association<User, Role>;
    level: Association<User, Level>;
  };
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstname: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  organization: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  sector: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  level_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Level,
      key: 'id',
    },
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Role,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['email'],
    },
    {
      fields: ['username'],
    },
    {
      fields: ['role_id'],
    },
    {
      fields: ['level_id'],
    },
    {
      fields: ['points'],
    },
    {
      fields: ['is_verified', 'is_locked'],
    },
  ],
});

export default User;
