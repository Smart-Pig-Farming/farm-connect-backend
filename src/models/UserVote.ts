import { DataTypes, Model, Optional, Association, Op } from "sequelize";
import sequelize from "../config/database";
import User from "./User";
import DiscussionPost from "./DiscussionPost";
import DiscussionReply from "./DiscussionReply";

// User Vote attributes interface
export interface UserVoteAttributes {
  id: string;
  post_id?: string; // FK to DiscussionPost
  reply_id?: string; // FK to DiscussionReply
  user_id: number; // FK to User
  vote_type: "upvote" | "downvote";
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes
interface UserVoteCreationAttributes
  extends Optional<UserVoteAttributes, "id"> {}

// UserVote model class
class UserVote
  extends Model<UserVoteAttributes, UserVoteCreationAttributes>
  implements UserVoteAttributes
{
  public id!: string;
  public post_id?: string;
  public reply_id?: string;
  public user_id!: number;
  public vote_type!: "upvote" | "downvote";
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    user: Association<UserVote, User>;
    post: Association<UserVote, DiscussionPost>;
    reply: Association<UserVote, DiscussionReply>;
  };
}

UserVote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: DiscussionPost,
        key: "id",
      },
    },
    reply_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: DiscussionReply,
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    vote_type: {
      type: DataTypes.ENUM("upvote", "downvote"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserVote",
    tableName: "user_votes",
    timestamps: true,
    underscored: true,
    validate: {
      // Ensure either post_id OR reply_id is provided, but not both
      eitherPostOrReply() {
        if (
          (this.post_id && this.reply_id) ||
          (!this.post_id && !this.reply_id)
        ) {
          throw new Error(
            "Must specify either post_id or reply_id, but not both"
          );
        }
      },
    },
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["post_id"],
      },
      {
        fields: ["reply_id"],
      },
      {
        fields: ["vote_type"],
      },
      {
        // Unique constraint: one vote per user per post
        fields: ["user_id", "post_id"],
        unique: true,
        where: {
          post_id: {
            [Op.ne]: null,
          },
        },
      },
      {
        // Unique constraint: one vote per user per reply
        fields: ["user_id", "reply_id"],
        unique: true,
        where: {
          reply_id: {
            [Op.ne]: null,
          },
        },
      },
    ],
  }
);

export default UserVote;
