import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// User Profile attributes interface
export interface UserProfileAttributes {
  id: string;
  user_id: number;
  bio?: string;
  location?: string;
  website?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  farming_experience?: string; // 'beginner' | 'intermediate' | 'expert'
  farm_size?: string; // Small, Medium, Large
  primary_farming_type?: string; // Pig, Cattle, Poultry, etc.
  posts_count: number;
  followers_count: number;
  following_count: number;
  upvotes_received: number;
  is_verified: boolean;
  is_mentor: boolean;
  mentor_specialties?: string[]; // Array of specialties if mentor
  created_at?: Date;
  updated_at?: Date;
}

// Creation attributes
interface UserProfileCreationAttributes
  extends Optional<
    UserProfileAttributes,
    | "id"
    | "posts_count"
    | "followers_count"
    | "following_count"
    | "upvotes_received"
    | "is_verified"
    | "is_mentor"
  > {}

// UserProfile model class
class UserProfile
  extends Model<UserProfileAttributes, UserProfileCreationAttributes>
  implements UserProfileAttributes
{
  public id!: string;
  public user_id!: number;
  public bio?: string;
  public location?: string;
  public website?: string;
  public profile_image_url?: string;
  public cover_image_url?: string;
  public farming_experience?: string;
  public farm_size?: string;
  public primary_farming_type?: string;
  public posts_count!: number;
  public followers_count!: number;
  public following_count!: number;
  public upvotes_received!: number;
  public is_verified!: boolean;
  public is_mentor!: boolean;
  public mentor_specialties?: string[];
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association declarations
  public static associations: {
    user: Association<UserProfile, User>;
  };
}

UserProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: User,
        key: "id",
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500], // Max 500 characters for bio
      },
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    profile_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    cover_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    farming_experience: {
      type: DataTypes.ENUM("beginner", "intermediate", "expert"),
      allowNull: true,
    },
    farm_size: {
      type: DataTypes.ENUM("small", "medium", "large"),
      allowNull: true,
    },
    primary_farming_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    posts_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    followers_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    following_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    upvotes_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_mentor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    mentor_specialties: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserProfile",
    tableName: "user_profiles",
    timestamps: false, // Using custom timestamps
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
        unique: true,
      },
      {
        fields: ["farming_experience"],
      },
      {
        fields: ["is_mentor"],
      },
      {
        fields: ["is_verified"],
      },
      {
        fields: ["posts_count"],
      },
      {
        fields: ["followers_count"],
      },
    ],
  }
);

export default UserProfile;
