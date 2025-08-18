import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface ReplyAncestryAttributes {
  reply_id: string;
  parent_id?: string | null;
  grandparent_id?: string | null;
  root_post_id: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ReplyAncestryCreation
  extends Optional<ReplyAncestryAttributes, "parent_id" | "grandparent_id"> {}

class ReplyAncestry
  extends Model<ReplyAncestryAttributes, ReplyAncestryCreation>
  implements ReplyAncestryAttributes
{
  public reply_id!: string;
  public parent_id?: string | null;
  public grandparent_id?: string | null;
  public root_post_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ReplyAncestry.init(
  {
    reply_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    grandparent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    root_post_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ReplyAncestry",
    tableName: "reply_ancestry",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["root_post_id"] },
      { fields: ["parent_id"] },
      { fields: ["grandparent_id"] },
    ],
  }
);

export default ReplyAncestry;
