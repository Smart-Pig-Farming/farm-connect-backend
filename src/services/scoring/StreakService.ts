import UserStreak from "../../models/UserStreak";
import scoringService, { ScoreEventInput } from "./ScoringService";
import { Points } from "./ScoreTypes";

const MILESTONES = [7, 30, 90, 180, 365];

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

class StreakService {
  async recordLogin(userId: number) {
    const today = new Date();
    const dayStr = today.toISOString().substring(0, 10); // YYYY-MM-DD

    let streak = await UserStreak.findByPk(userId);
    if (!streak) {
      streak = await UserStreak.create({
        user_id: userId,
        current_length: 1,
        best_length: 1,
        last_day: dayStr as any,
      });
      const bonus = bonusFor(1); // none
      return { streak, awarded: null };
    }

    let lastDayStr: string | null = null;
    if (streak.last_day) {
      if (typeof streak.last_day === "string") {
        // Already a YYYY-MM-DD (DATEONLY) string
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

    if (lastDayStr === dayStr) {
      return { streak, awarded: null }; // already counted today
    }

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yStr = yesterday.toISOString().substring(0, 10);

    if (lastDayStr === yStr) {
      streak.current_length += 1;
    } else {
      streak.current_length = 1; // reset
    }
    if (streak.current_length > streak.best_length)
      streak.best_length = streak.current_length;
    streak.last_day = dayStr as any;
    await streak.save();

    const bonus = bonusFor(streak.current_length);
    if (bonus) {
      const events: ScoreEventInput[] = [
        {
          userId,
          actorUserId: userId,
          type: "STREAK_BONUS",
          deltaPoints: bonus,
          refType: "system",
          refId: `streak-${streak.current_length}`,
          meta: { length: streak.current_length },
        },
      ];
      await scoringService.recordEvents(events);
      return { streak, awarded: bonus };
    }
    return { streak, awarded: null };
  }
}

export const streakService = new StreakService();
export default streakService;
