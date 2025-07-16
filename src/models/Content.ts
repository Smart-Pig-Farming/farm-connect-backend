import { DataTypes, Model, Optional, Association } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// Enum for content types
export enum ContentType {
  POST = 'post',
  COMMENT = 'comment',
  ARTICLE = 'article',
  DISCUSSION = 'discussion'
}

// Content attributes interface
export interface ContentAttributes {
  id: number;
  title: string;
  text_content: string;
  content_type: ContentType;
  is_approved: boolean;
  approved_at?: Date;
  is_deleted: boolean;
  still_available: boolean;
  user_id: number;
  parent_id?: number;
  content_media_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes (id is auto-generated)
interface ContentCreationAttributes extends Optional<ContentAttributes, 'id' | 'is_approved' | 'is_deleted' | 'still_available'> {}

// Content model class
class Content extends Model<ContentAttributes, ContentCreationAttributes> 
  implements ContentAttributes {
  public id!: number;
  public title!: string;
  public text_content!: string;
  public content_type!: ContentType;
  public is_approved!: boolean;
  public approved_at?: Date;
  public is_deleted!: boolean;
  public still_available!: boolean;
  public user_id!: number;
  public parent_id?: number;
  public content_media_id?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    user: Association<Content, User>;
    parent: Association<Content, Content>;
    replies: Association<Content, Content>;
  };
}

Content.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  text_content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  content_type: {
    type: DataTypes.ENUM(...Object.values(ContentType)),
    allowNull: false,
    defaultValue: ContentType.POST,
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  still_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'contents', // Self-reference
      key: 'id',
    },
  },
  content_media_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Content',
  tableName: 'contents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['parent_id'],
    },
    {
      fields: ['content_type'],
    },
    {
      fields: ['is_approved', 'is_deleted', 'still_available'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

export default Content;
