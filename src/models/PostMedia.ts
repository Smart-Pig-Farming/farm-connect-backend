import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import DiscussionPost from "./DiscussionPost";

// Post Media attributes interface
export interface PostMediaAttributes {
  id: string;
  post_id: string; // FK to DiscussionPost

  // File details
  media_type: "image" | "video";
  file_name: string;
  file_size: number;
  mime_type: string;

  // URLs (provider-agnostic)
  file_url: string; // Main file URL
  thumbnail_url?: string; // Video thumbnail OR image thumbnail
  preview_url?: string; // Smaller preview for loading

  // Provider details (for switching providers)
  provider_type: string; // 'S3', 'CLOUDINARY', 'GOOGLE_DRIVE', 'LOCAL'
  provider_file_id: string; // External provider's file ID

  // Organization
  display_order: number; // For frontend array ordering
  is_primary: boolean; // Main image/video for post

  // Processing status
  processing_status: "uploading" | "processing" | "ready" | "failed";

  // Metadata
  width?: number; // Image/video width
  height?: number; // Image/video height
  duration?: number; // Video duration in seconds

  // Timestamps
  uploaded_at: Date;
  processed_at?: Date;
}

// Creation attributes
interface PostMediaCreationAttributes
  extends Optional<
    PostMediaAttributes,
    "id" | "display_order" | "is_primary" | "processing_status"
  > {}

// PostMedia model class
class PostMedia
  extends Model<PostMediaAttributes, PostMediaCreationAttributes>
  implements PostMediaAttributes
{
  public id!: string;
  public post_id!: string;
  public media_type!: "image" | "video";
  public file_name!: string;
  public file_size!: number;
  public mime_type!: string;
  public file_url!: string;
  public thumbnail_url?: string;
  public preview_url?: string;
  public provider_type!: string;
  public provider_file_id!: string;
  public display_order!: number;
  public is_primary!: boolean;
  public processing_status!: "uploading" | "processing" | "ready" | "failed";
  public width?: number;
  public height?: number;
  public duration?: number;
  public readonly uploaded_at!: Date;
  public processed_at?: Date;

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
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 512 * 1024 * 1024, // 512MB max file size
      },
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    preview_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "LOCAL",
    },
    provider_file_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    processing_status: {
      type: DataTypes.ENUM("uploading", "processing", "ready", "failed"),
      defaultValue: "uploading",
      allowNull: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PostMedia",
    tableName: "post_media",
    timestamps: false, // Using custom uploaded_at/processed_at
    underscored: true,
    indexes: [
      {
        fields: ["post_id"],
      },
      {
        fields: ["media_type"],
      },
      {
        fields: ["processing_status"],
      },
      {
        fields: ["provider_type", "provider_file_id"],
        unique: true, // Prevent duplicate files from same provider
      },
      {
        // Composite index for post media queries
        fields: ["post_id", "media_type", "display_order"],
      },
    ],
  }
);

export default PostMedia;
