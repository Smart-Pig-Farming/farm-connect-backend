import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import ContentReport from "./ContentReport";
import DiscussionPost from "./DiscussionPost";

// PostSnapshot attributes interface
export interface PostSnapshotAttributes {
  id: string;
  content_report_id: string;
  post_id: string;
  title: string;
  content: string;
  author_data: {
    id: number;
    name: string;
    location?: string;
  };
  media_data?: Array<{
    type: "image" | "video";
    url: string;
    thumbnail_url?: string;
    display_order?: number;
  }>;
  tags_data?: string[];
  created_at: Date;
  snapshot_reason: string;
}

// Creation attributes
interface PostSnapshotCreationAttributes
  extends Optional<PostSnapshotAttributes, "id" | "created_at"> {}

// PostSnapshot model class
class PostSnapshot
  extends Model<PostSnapshotAttributes, PostSnapshotCreationAttributes>
  implements PostSnapshotAttributes
{
  public id!: string;
  public content_report_id!: string;
  public post_id!: string;
  public title!: string;
  public content!: string;
  public author_data!: {
    id: number;
    name: string;
    location?: string;
  };
  public media_data?: Array<{
    type: "image" | "video";
    url: string;
    thumbnail_url?: string;
    display_order?: number;
  }>;
  public tags_data?: string[];
  public readonly created_at!: Date;
  public snapshot_reason!: string;

  // Association declarations
  public static associations: {
    contentReport: Association<PostSnapshot, ContentReport>;
    post: Association<PostSnapshot, DiscussionPost>;
  };
}

PostSnapshot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content_report_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: ContentReport,
        key: "id",
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
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    author_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidAuthorData(value: any) {
          if (!value || typeof value !== "object") {
            throw new Error("author_data must be an object");
          }
          if (!value.id || !value.name) {
            throw new Error("author_data must contain id and name");
          }
        },
      },
    },
    media_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidMediaData(value: any) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error("media_data must be an array");
            }
            for (const item of value) {
              if (!item.type || !item.url) {
                throw new Error("Each media item must have type and url");
              }
              if (!["image", "video"].includes(item.type)) {
                throw new Error("Media type must be 'image' or 'video'");
              }
            }
          }
        },
      },
    },
    tags_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidTagsData(value: any) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error("tags_data must be an array");
            }
            for (const tag of value) {
              if (typeof tag !== "string") {
                throw new Error("All tags must be strings");
              }
            }
          }
        },
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    snapshot_reason: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "moderation_decision",
      validate: {
        isIn: [["moderation_decision", "manual_backup", "audit_trail"]],
      },
    },
  },
  {
    sequelize,
    tableName: "post_snapshots",
    timestamps: false, // We handle created_at manually
    indexes: [
      {
        fields: ["content_report_id"],
      },
      {
        fields: ["post_id", "created_at"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

export default PostSnapshot;
