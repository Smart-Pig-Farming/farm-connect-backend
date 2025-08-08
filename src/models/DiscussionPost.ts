import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// Discussion Post attributes interface - designed for frontend expectations
export interface DiscussionPostAttributes {
  id: string; // UUID for frontend compatibility
  title: string;
  content: string; // Direct field name match
  author_id: number; // FK to User (integer)

  // Engagement metrics (denormalized for performance)
  upvotes: number;
  downvotes: number;
  replies_count: number;

  // Market post specifics
  is_market_post: boolean;
  is_available: boolean;

  // Moderation
  is_approved: boolean;
  approved_at?: Date;
  moderator_id?: number;

  // Status
  is_deleted: boolean;

  // Timestamps
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes
interface DiscussionPostCreationAttributes
  extends Optional<
    DiscussionPostAttributes,
    | "id"
    | "upvotes"
    | "downvotes"
    | "replies_count"
    | "is_approved"
    | "is_deleted"
  > {}

// DiscussionPost model class
class DiscussionPost
  extends Model<DiscussionPostAttributes, DiscussionPostCreationAttributes>
  implements DiscussionPostAttributes
{
  public id!: string;
  public title!: string;
  public content!: string;
  public author_id!: number;
  public upvotes!: number;
  public downvotes!: number;
  public replies_count!: number;
  public is_market_post!: boolean;
  public is_available!: boolean;
  public is_approved!: boolean;
  public approved_at?: Date;
  public moderator_id?: number;
  public is_deleted!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    author: Association<DiscussionPost, User>;
    replies: Association<DiscussionPost, any>; // Will define DiscussionReply later
    media: Association<DiscussionPost, any>; // Will define PostMedia later
    tags: Association<DiscussionPost, any>; // Will define PostTag later
    votes: Association<DiscussionPost, any>; // Will define UserVote later
  };
}

DiscussionPost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [10, 255], // Frontend validation: min 10 chars
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [20, 10000], // Frontend validation: min 20 chars, max 10k
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
    replies_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    is_market_post: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
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
    moderator_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
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
    modelName: "DiscussionPost",
    tableName: "discussion_posts",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["author_id"],
      },
      {
        fields: ["is_deleted", "is_approved"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["is_market_post"],
      },
      {
        // Composite index for feed queries
        fields: ["is_deleted", "is_approved", "created_at"],
      },
      {
        // Index for popular posts (upvotes - downvotes)
        fields: ["upvotes", "downvotes"],
      },
    ],
  }
);

export default DiscussionPost;
