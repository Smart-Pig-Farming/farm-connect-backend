import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// Discussion Post attributes interface
export interface DiscussionPostAttributes {
  id: string;
  title: string;
  content: string;
  author_id: number;

  // Simple engagement metrics
  upvotes: number;
  downvotes: number;
  replies_count?: number;

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
    "id" | "upvotes" | "downvotes" | "is_approved" | "is_deleted"
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
  public replies_count?: number;
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
    replies: Association<DiscussionPost, any>;
    media: Association<DiscussionPost, any>;
    tags: Association<DiscussionPost, any>;
    votes: Association<DiscussionPost, any>;
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
        len: [10, 255],
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [20, 10000],
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
      defaultValue: false,
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
        fields: ["is_deleted", "is_approved", "created_at"],
      },
    ],
  }
);

// Enforce business rule: is_available => is_market_post
DiscussionPost.addHook("beforeValidate", (post: any) => {
  if (!post.is_market_post) {
    // Force availability false for non-market posts
    post.is_available = false;
  }
});

DiscussionPost.addHook("beforeSave", (post: any) => {
  if (post.is_available && !post.is_market_post) {
    // Safety net: cannot have available true if not a market post
    post.is_available = false;
  }
});

export default DiscussionPost;
