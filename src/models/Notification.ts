import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface NotificationAttributes {
  id: string;
  user_id: number;
  type: 'post_vote' | 'reply_created' | 'reply_vote' | 'post_approved' | 'mention' | 'post_reported' | 'moderation_decision_reporter' | 'moderation_decision_owner';
  title: string;
  message: string;
  data: any; // JSON data
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'read' | 'created_at' | 'updated_at'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public user_id!: number;
  public type!: 'post_vote' | 'reply_created' | 'reply_vote' | 'post_approved' | 'mention' | 'post_reported' | 'moderation_decision_reporter' | 'moderation_decision_owner';
  public title!: string;
  public message!: string;
  public data!: any;
  public read!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public readonly user?: User;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(
        'post_vote',
        'reply_created', 
        'reply_vote',
        'post_approved',
        'mention',
        'post_reported',
        'moderation_decision_reporter',
        'moderation_decision_owner'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'created_at'],
      },
      {
        fields: ['user_id', 'read'],
      },
      {
        fields: ['type'],
      },
    ],
  }
);

// Define associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export default Notification;
