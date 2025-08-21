import { Transaction } from "sequelize";
import sequelize from "../../config/database";
import UserStreak from "../../models/UserStreak";
import scoringService, { ScoreEventInput } from "./ScoringService";
import { Points } from "./ScoreTypes";
import {
  deriveDayContext,
  shouldIncrement,
  nextMilestone,
  STREAK_MILESTONES,
} from "./StreakHelpers";
import ScoreEvent from "../../models/ScoreEvent";

function bonusFor(length: number): number | null {
  switch (length) {
    case 7:
      return Points.STREAK_7;
    case 30:
      return Points.STREAK_30;
    case 90:
      return Points.STREAK_90;
    case 180:
      return Points.STREAK_180;
    case 365:
      return Points.STREAK_365;
    default:
      return null;
  }
}

interface RecordLoginResult {
  streak: UserStreak;
  awarded: number | null;
  nextMilestone: number | null;
  daysToNext: number | null;
  alreadyCounted: boolean;
}

class StreakService {
  /**
   * Record a login for streak purposes.
   * @param userId user id
   * @param timezone optional IANA timezone string (future expansion; currently unused beyond context)
   */
  async recordLogin(
    userId: number,
    timezone?: string
  ): Promise<RecordLoginResult> {
    const ctx = deriveDayContext(timezone);

    return sequelize.transaction(async (t: Transaction) => {
      let streak = await UserStreak.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!streak) {
        streak = await UserStreak.create(
          {
            user_id: userId,
            current_length: 1,
            best_length: 1,
            last_day: ctx.todayStr as any,
          },
          { transaction: t }
        );
        return {
          streak,
          awarded: null,
          nextMilestone: nextMilestone(1),
          daysToNext: nextMilestone(1) ? nextMilestone(1)! - 1 : null,
          alreadyCounted: false,
        };
      }

      let lastDayStr: string | null = null;
      if (streak.last_day) {
        if (typeof streak.last_day === "string") {
          lastDayStr = (streak.last_day as any).substring(0, 10);
        } else if (streak.last_day instanceof Date) {
          lastDayStr = streak.last_day.toISOString().substring(0, 10);
        } else {
          try {
            lastDayStr = new Date(streak.last_day as any)
              .toISOString()
              .substring(0, 10);
          } catch {
            lastDayStr = null;
          }
        }
      }

      const incDecision = shouldIncrement(lastDayStr, ctx);
      if (incDecision === 0) {
        const nm = nextMilestone(streak.current_length);
        return {
          streak,
          awarded: null,
          nextMilestone: nm,
          daysToNext: nm ? nm - streak.current_length : null,
          alreadyCounted: true,
        };
      }

      if (incDecision === 1) {
        streak.current_length += 1;
      } else {
        // reset
        streak.current_length = 1;
      }
      if (streak.current_length > streak.best_length)
        streak.best_length = streak.current_length;
      streak.last_day = ctx.todayStr as any;
      await streak.save({ transaction: t });

      const bonus = bonusFor(streak.current_length);
      let awarded: number | null = null;
      if (bonus) {
        // Idempotency: check if we already created an event with same ref id
        const refId = `streak-${streak.current_length}`;
        const existing = await ScoreEvent.findOne({
          where: { user_id: userId, event_type: "STREAK_BONUS", ref_id: refId },
          transaction: t,
        });
        if (!existing) {
          const events: ScoreEventInput[] = [
            {
              userId,
              actorUserId: userId,
              type: "STREAK_BONUS",
              deltaPoints: bonus,
              refType: "system",
              refId,
              meta: { length: streak.current_length },
            },
          ];
          await scoringService.recordEvents(events, t);
          awarded = bonus;
        }
      }

      const nm = nextMilestone(streak.current_length);
      return {
        streak,
        awarded,
        nextMilestone: nm,
        daysToNext: nm ? nm - streak.current_length : null,
        alreadyCounted: false,
      };
    });
  }
}

export const streakService = new StreakService();
export default streakService;
