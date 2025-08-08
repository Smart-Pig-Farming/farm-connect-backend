import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";
import DiscussionPost from "./DiscussionPost";
import DiscussionReply from "./DiscussionReply";

// Content Report attributes interface
export interface ContentReportAttributes {
  id: string;
  content_id: string; // ID of reported content
  content_type: "post" | "reply";
  reporter_id: number; // FK to User who reported
  reason:
    | "inappropriate"
    | "spam"
    | "fraudulent"
    | "misinformation"
    | "technical"
    | "other";
  details?: string; // Optional additional details
  status: "pending" | "resolved" | "dismissed";
  moderator_id?: number; // FK to User who handled the report
  resolution_notes?: string; // Moderator's notes on resolution
  created_at?: Date;
  resolved_at?: Date;
}

// Creation attributes
interface ContentReportCreationAttributes
  extends Optional<ContentReportAttributes, "id" | "status"> {}

// ContentReport model class
class ContentReport
  extends Model<ContentReportAttributes, ContentReportCreationAttributes>
  implements ContentReportAttributes
{
  public id!: string;
  public content_id!: string;
  public content_type!: "post" | "reply";
  public reporter_id!: number;
  public reason!:
    | "inappropriate"
    | "spam"
    | "fraudulent"
    | "misinformation"
    | "technical"
    | "other";
  public details?: string;
  public status!: "pending" | "resolved" | "dismissed";
  public moderator_id?: number;
  public resolution_notes?: string;
  public readonly created_at!: Date;
  public resolved_at?: Date;

  // Association declarations
  public static associations: {
    reporter: Association<ContentReport, User>;
    moderator: Association<ContentReport, User>;
    post: Association<ContentReport, DiscussionPost>;
    reply: Association<ContentReport, DiscussionReply>;
  };
}

ContentReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    content_type: {
      type: DataTypes.ENUM("post", "reply"),
      allowNull: false,
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    reason: {
      type: DataTypes.ENUM(
        "inappropriate",
        "spam",
        "fraudulent",
        "misinformation",
        "technical",
        "other"
      ),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000], // Max 1000 characters for details
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "resolved", "dismissed"),
      defaultValue: "pending",
      allowNull: false,
    },
    moderator_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ContentReport",
    tableName: "content_reports",
    timestamps: false, // Using custom timestamps
    underscored: true,
    indexes: [
      {
        fields: ["content_id", "content_type"],
      },
      {
        fields: ["reporter_id"],
      },
      {
        fields: ["moderator_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["reason"],
      },
      {
        fields: ["created_at"],
      },
      {
        // Prevent duplicate reports from same user for same content
        fields: ["content_id", "content_type", "reporter_id"],
        unique: true,
      },
    ],
  }
);

export default ContentReport;
