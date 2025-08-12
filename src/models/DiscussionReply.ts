import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";
import DiscussionPost from "./DiscussionPost";

// Discussion Reply attributes interface
export interface DiscussionReplyAttributes {
  id: string;
  content: string;
  post_id: string;
  parent_reply_id?: string | null;
  author_id: number;

  // Engagement metrics
  upvotes: number;
  downvotes: number;

  // Hierarchy
  depth: number;

  // Status
  is_deleted: boolean;

  // Timestamps
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes
interface DiscussionReplyCreationAttributes
  extends Optional<
    DiscussionReplyAttributes,
    "id" | "upvotes" | "downvotes" | "depth" | "is_deleted"
  > {}

// DiscussionReply model class
class DiscussionReply
  extends Model<DiscussionReplyAttributes, DiscussionReplyCreationAttributes>
  implements DiscussionReplyAttributes
{
  public id!: string;
  public content!: string;
  public post_id!: string;
  public parent_reply_id?: string | null;
  public author_id!: number;
  public upvotes!: number;
  public downvotes!: number;
  public depth!: number;
  public is_deleted!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    author: Association<DiscussionReply, User>;
    post: Association<DiscussionReply, DiscussionPost>;
    parentReply: Association<DiscussionReply, DiscussionReply>;
    childReplies: Association<DiscussionReply, DiscussionReply>;
    votes: Association<DiscussionReply, any>;
  };
}

DiscussionReply.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [5, 5000],
      },
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: DiscussionPost,
        key: "id",
      },
    },
    parent_reply_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "discussion_replies",
        key: "id",
      },
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    depth: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 3,
      },
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "DiscussionReply",
    tableName: "discussion_replies",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["post_id"],
      },
      {
        fields: ["author_id"],
      },
      {
        fields: ["parent_reply_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

export default DiscussionReply;
