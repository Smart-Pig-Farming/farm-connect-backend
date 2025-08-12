import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Content from "./Content";
import User from "./User";

// Enum for reaction types
export enum ReactionType {
  LIKE = "like",
  DISLIKE = "dislike",
  HELPFUL = "helpful",
  QUESTION = "question",
  LOVE = "love",
}

// ContentReaction attributes interface
export interface ContentReactionAttributes {
  id: number;
  reaction_type: ReactionType;
  content_id: number;
  user_id: number;
  created_at?: Date;
}

// Creation attributes (id and created_at are auto-generated)
interface ContentReactionCreationAttributes
  extends Optional<ContentReactionAttributes, "id" | "created_at"> {}

// ContentReaction model class
class ContentReaction
  extends Model<ContentReactionAttributes, ContentReactionCreationAttributes>
  implements ContentReactionAttributes
{
  public id!: number;
  public reaction_type!: ReactionType;
  public content_id!: number;
  public user_id!: number;
  public readonly created_at!: Date;

  // Association declarations
  public static associations: {
    content: Association<ContentReaction, Content>;
    user: Association<ContentReaction, User>;
  };
}

ContentReaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reaction_type: {
      type: DataTypes.ENUM(...Object.values(ReactionType)),
      allowNull: false,
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Content,
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
  },
  {
    sequelize,
    modelName: "ContentReaction",
    tableName: "content_reactions",
    timestamps: true,
    updatedAt: false, // Only track creation
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["content_id", "user_id"], // One reaction per user per content
      },
      {
        fields: ["reaction_type"],
      },
    ],
  }
);

export default ContentReaction;
