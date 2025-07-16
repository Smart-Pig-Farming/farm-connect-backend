import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import BestPracticeTag from './BestPracticeTag';

// Quiz attributes interface
export interface QuizAttributes {
  id: number;
  title: string;
  description: string;
  duration: number; // in minutes
  passing_score: number; // percentage
  is_active: boolean;
  best_practice_tag_id: number;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface QuizCreationAttributes extends Optional<QuizAttributes, 'id' | 'is_active'> {}

// Quiz model class
class Quiz extends Model<QuizAttributes, QuizCreationAttributes> 
  implements QuizAttributes {
  public id!: number;
  public title!: string;
  public description!: string;
  public duration!: number;
  public passing_score!: number;
  public is_active!: boolean;
  public best_practice_tag_id!: number;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    creator: Association<Quiz, User>;
    bestPracticeTag: Association<Quiz, BestPracticeTag>;
  };
}

Quiz.init({
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
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30, // 30 minutes default
  },
  passing_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 70, // 70% default
    validate: {
      min: 0,
      max: 100,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  best_practice_tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: BestPracticeTag,
      key: 'id',
    },
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
  modelName: 'Quiz',
  tableName: 'quizzes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['created_by'],
    },
    {
      fields: ['best_practice_tag_id'],
    },
    {
      fields: ['is_active'],
    },
  ],
});

export default Quiz;
