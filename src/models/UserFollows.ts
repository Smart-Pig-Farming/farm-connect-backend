import { DataTypes, Model, Optional, Association } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// User Follow attributes interface
export interface UserFollowsAttributes {
  id: string;
  follower_id: number; // User who is following
  following_id: number; // User being followed
  created_at?: Date;
}

// Creation attributes
interface UserFollowsCreationAttributes
  extends Optional<UserFollowsAttributes, "id"> {}

// UserFollows model class
class UserFollows
  extends Model<UserFollowsAttributes, UserFollowsCreationAttributes>
  implements UserFollowsAttributes
{
  public id!: string;
  public follower_id!: number;
  public following_id!: number;
  public readonly created_at!: Date;

  // Association declarations
  public static associations: {
    follower: Association<UserFollows, User>;
    following: Association<UserFollows, User>;
  };
}

UserFollows.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    follower_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    following_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserFollows",
    tableName: "user_follows",
    timestamps: false, // Using custom created_at
    underscored: true,
    indexes: [
      {
        fields: ["follower_id"],
      },
      {
        fields: ["following_id"],
      },
      {
        fields: ["created_at"],
      },
      {
        // Prevent duplicate follow relationships
        fields: ["follower_id", "following_id"],
        unique: true,
      },
    ],
    validate: {
      // Prevent users from following themselves
      cannotFollowSelf() {
        if (this.follower_id === this.following_id) {
          throw new Error("Users cannot follow themselves");
        }
      },
    },
  }
);

export default UserFollows;
