import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// BestPracticeContent attributes interface
export interface BestPracticeContentAttributes {
  id: number;
  title: string;
  description: string;
  benefits: string;
  steps: string;
  language: string;
  is_published: boolean;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface BestPracticeContentCreationAttributes extends Optional<BestPracticeContentAttributes, 'id' | 'is_published'> {}

// BestPracticeContent model class
class BestPracticeContent extends Model<BestPracticeContentAttributes, BestPracticeContentCreationAttributes> 
  implements BestPracticeContentAttributes {
  public id!: number;
  public title!: string;
  public description!: string;
  public benefits!: string;
  public steps!: string;
  public language!: string;
  public is_published!: boolean;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    creator: Association<BestPracticeContent, User>;
  };
}

BestPracticeContent.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  steps: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en',
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'BestPracticeContent',
  tableName: 'best_practice_contents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['created_by'],
    },
    {
      fields: ['language'],
    },
    {
      fields: ['is_published'],
    },
    {
      fields: ['title'],
    },
  ],
});

export default BestPracticeContent;
