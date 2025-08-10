import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import DiscussionPost from "./DiscussionPost";

// Post Media attributes interface
export interface PostMediaAttributes {
  id: string;
  post_id: string;

  // Media type and file details
  media_type: "image" | "video";
  storage_key: string; // Abstract storage key
  file_name: string;
  file_size: number;
  mime_type: string;

  // Display
  display_order: number;

  // Processing status
  status: "uploading" | "ready" | "failed";

  // Resolved URLs (optional, filled after upload to remote storage)
  url?: string;
  thumbnail_url?: string;

  // Timestamps
  created_at?: Date;
}

// Creation attributes
interface PostMediaCreationAttributes
  extends Optional<PostMediaAttributes, "id" | "display_order" | "status"> {}

// PostMedia model class
class PostMedia
  extends Model<PostMediaAttributes, PostMediaCreationAttributes>
  implements PostMediaAttributes
{
  public id!: string;
  public post_id!: string;
  public media_type!: "image" | "video";
  public storage_key!: string;
  public file_name!: string;
  public file_size!: number;
  public mime_type!: string;
  public display_order!: number;
  public status!: "uploading" | "ready" | "failed";
  public url?: string;
  public thumbnail_url?: string;
  public readonly created_at!: Date;

  // Association declarations
  public static associations: {
    post: Association<PostMedia, DiscussionPost>;
  };
}

PostMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: DiscussionPost,
        key: "id",
      },
    },
    media_type: {
      type: DataTypes.ENUM("image", "video"),
      allowNull: false,
    },
    storage_key: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("uploading", "ready", "failed"),
      defaultValue: "uploading",
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    thumbnail_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PostMedia",
    tableName: "post_media",
    timestamps: false,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        fields: ["post_id", "display_order"],
      },
    ],
  }
);

export default PostMedia;
