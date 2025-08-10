import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";
import DiscussionPost from "./DiscussionPost";
import DiscussionReply from "./DiscussionReply";

// User Vote attributes interface
export interface UserVoteAttributes {
  id: string;
  user_id: number;
  target_type: "post" | "reply";
  target_id: string;
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
  public user_id!: number;
  public target_type!: "post" | "reply";
  public target_id!: string;
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    target_type: {
      type: DataTypes.ENUM("post", "reply"),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["target_type", "target_id"],
      },
      {
        fields: ["user_id", "target_type", "target_id"],
        unique: true,
      },
    ],
  }
);

export default UserVote;
