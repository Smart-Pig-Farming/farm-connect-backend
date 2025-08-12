import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import Content from "./Content";

// Enum for media types
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  DOCUMENT = "document",
  AUDIO = "audio",
}

// ContentMediaFile attributes interface
export interface ContentMediaFileAttributes {
  id: number;
  media_type: MediaType;
  file_url: string;
  file_size: number;
  content_id: number;
  uploaded_at: Date;
}

// Creation attributes (id and uploaded_at are auto-generated)
interface ContentMediaFileCreationAttributes
  extends Optional<ContentMediaFileAttributes, "id" | "uploaded_at"> {}

// ContentMediaFile model class
class ContentMediaFile
  extends Model<ContentMediaFileAttributes, ContentMediaFileCreationAttributes>
  implements ContentMediaFileAttributes
{
  public id!: number;
  public media_type!: MediaType;
  public file_url!: string;
  public file_size!: number;
  public content_id!: number;
  public uploaded_at!: Date;

  // Association declarations
  public static associations: {
    content: Association<ContentMediaFile, Content>;
  };
}

ContentMediaFile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    media_type: {
      type: DataTypes.ENUM(...Object.values(MediaType)),
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT,
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
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ContentMediaFile",
    tableName: "content_media_files",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["content_id"],
      },
      {
        fields: ["media_type"],
      },
    ],
  }
);

export default ContentMediaFile;
