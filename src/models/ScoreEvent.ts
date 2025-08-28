import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export type ScoreEventType =
  | "POST_CREATED"
  | "REPLY_CREATED"
  | "REACTION_RECEIVED" // author receives an up/down vote delta
  | "REACTION_REMOVED" // reversal of prior reaction effect
  | "TRICKLE_PARENT" // trickle effect to immediate parent
  | "TRICKLE_GRANDPARENT" // trickle effect two levels up
  | "TRICKLE_ROOT" // trickle effect three levels up (root post)
  | "MOD_APPROVED_BONUS" // moderator explicitly approved / stamped content
  | "MOD_APPROVED_BONUS_REVERSAL" // moderator approval revoked (remove bonus)
  | "REPORT_CONFIRMED_PENALTY" // penalty to author after confirmed violation
  | "REPORT_CONFIRMED_REPORTER_REWARD" // reward to each reporter when violation confirmed
  | "REPORT_REJECTED_REPORTER_REWARD" // compensation to each reporter when report rejected
  | "STREAK_BONUS" // daily login streak bonus
  | "ADMIN_ADJUST" // manual adjustment
  | "REACTION_ENGAGEMENT" // first time a user reacts to a given target (post/reply)
  | "BEST_PRACTICE_FIRST_READ"; // first time a user reads a best practice (awarded once per practice)
export interface ScoreEventAttributes {
  id: string;
  user_id: number; // beneficiary of points change
  actor_user_id?: number | null; // actor causing the event (voter, reporter, moderator)
  event_type: ScoreEventType;
  ref_type?: string | null; // post | reply | report | system
  ref_id?: string | null;
  delta: number; // integer scaled by 1000
  meta?: any | null; // JSONB misc details
  created_at?: Date;
  updated_at?: Date;
}

interface ScoreEventCreationAttributes
  extends Optional<
    ScoreEventAttributes,
    | "id"
    | "actor_user_id"
    | "ref_type"
    | "ref_id"
    | "meta"
    | "created_at"
    | "updated_at"
  > {}

class ScoreEvent
  extends Model<ScoreEventAttributes, ScoreEventCreationAttributes>
  implements ScoreEventAttributes
{
  public id!: string;
  public user_id!: number;
  public actor_user_id?: number | null;
  public event_type!: ScoreEventType;
  public ref_type?: string | null;
  public ref_id?: string | null;
  public delta!: number;
  public meta?: any | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ScoreEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    ref_type: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    ref_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    meta: {
      // Postgres JSONB supported by sequelize
      type: DataTypes.JSONB as any,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ScoreEvent",
    tableName: "score_events",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["event_type"] },
      { fields: ["ref_type", "ref_id"] },
    ],
  }
);

export default ScoreEvent;
