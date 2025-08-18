import { Transaction } from "sequelize";
import sequelize from "../../config/database";
import ScoreEvent, { ScoreEventType } from "../../models/ScoreEvent";
import UserScoreTotal from "../../models/UserScoreTotal";
import { toScaled } from "./ScoreTypes";

export interface ScoreEventInput {
  userId: number;
  actorUserId?: number | null;
  type: ScoreEventType;
  deltaPoints: number; // unscaled points
  refType?: string;
  refId?: string;
  meta?: any;
}

export interface ScoreBatchResult {
  events: ScoreEvent[];
  totals: { userId: number; totalPoints: number }[];
}

class ScoringService {
  async recordEvents(
    batch: ScoreEventInput[],
    externalTx?: Transaction
  ): Promise<ScoreBatchResult> {
    if (!batch.length) return { events: [], totals: [] };

    const exec = async (tx: Transaction) => {
      const created: ScoreEvent[] = [];
      const deltasByUser: Record<number, number> = {};

      for (const ev of batch) {
        const deltaScaled = toScaled(ev.deltaPoints);
        const createdEvent = await ScoreEvent.create(
          {
            user_id: ev.userId,
            actor_user_id: ev.actorUserId ?? null,
            event_type: ev.type,
            ref_type: ev.refType ?? null,
            ref_id: ev.refId ?? null,
            delta: deltaScaled,
            meta: ev.meta || null,
          },
          { transaction: tx }
        );
        created.push(createdEvent);
        deltasByUser[ev.userId] = (deltasByUser[ev.userId] || 0) + deltaScaled;
      }

      const totals: { userId: number; totalPoints: number }[] = [];
      for (const [userIdStr, delta] of Object.entries(deltasByUser)) {
        const userId = Number(userIdStr);
        const existing = await UserScoreTotal.findByPk(userId, {
          transaction: tx,
          lock: tx.LOCK.UPDATE,
        });
        if (existing) {
          existing.total_points += delta;
          await existing.save({ transaction: tx });
          totals.push({ userId, totalPoints: existing.total_points });
        } else {
          const createdTotal = await UserScoreTotal.create(
            { user_id: userId, total_points: delta },
            { transaction: tx }
          );
          totals.push({ userId, totalPoints: createdTotal.total_points });
        }
      }

      // Optional integrity check (enabled via env) to detect lost updates.
      if (process.env.SCORING_VERIFY_TOTALS === "1") {
        for (const t of totals) {
          const sum = await ScoreEvent.sum("delta", {
            where: { user_id: t.userId },
            transaction: tx,
          });
          if (typeof sum === "number" && sum !== t.totalPoints) {
            console.warn(
              `[scoring] total mismatch detected user=${t.userId} stored=${t.totalPoints} expected=${sum} – repairing`
            );
            const existing = await UserScoreTotal.findByPk(t.userId, {
              transaction: tx,
              lock: tx.LOCK.UPDATE,
            });
            if (existing) {
              existing.total_points = sum;
              await existing.save({ transaction: tx });
              t.totalPoints = sum;
            }
          }
        }
      }
      return { events: created, totals };
    };

    if (externalTx) {
      return exec(externalTx);
    }
    return sequelize.transaction(exec);
  }
}

export const scoringService = new ScoringService();
export default scoringService;
