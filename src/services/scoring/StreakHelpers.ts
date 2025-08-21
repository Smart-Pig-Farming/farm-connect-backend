import { toZonedTime } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";

export const STREAK_MILESTONES = [7, 30, 90, 180, 365];
export type SupportedZone = string; // placeholder; could validate against a whitelist later

export interface DayContext {
  todayStr: string; // formatted YYYY-MM-DD in chosen zone
  yesterdayStr: string;
  zone: string;
}

export function deriveDayContext(zone: string | undefined): DayContext {
  const tz = zone && zone.trim() ? zone : "UTC";
  const now = new Date();
  const zoned = toZonedTime(now, tz);
  const y = new Date(zoned.getTime());
  y.setDate(zoned.getDate() - 1);
  const fmt = (d: Date) => d.toISOString().substring(0, 10); // Using toISOString is safe because date-only portion after converting back will reflect actual calendar day in UTC; for nuanced formatting we could use format with tz.
  return { todayStr: fmt(zoned), yesterdayStr: fmt(y), zone: tz };
}

export function nextMilestone(current: number) {
  return STREAK_MILESTONES.find((m) => m > current) || null;
}

export function shouldIncrement(lastDay: string | null, ctx: DayContext) {
  if (!lastDay) return 1; // start new
  if (lastDay === ctx.todayStr) return 0; // already counted
  if (lastDay === ctx.yesterdayStr) return 1; // continue
  return -1; // reset
}

export function computeDiff(lastDay: string | null, ctx: DayContext) {
  if (!lastDay) return Infinity;
  // naive string compare by converting to Date
  try {
    const last = new Date(lastDay + "T00:00:00Z");
    const today = new Date(ctx.todayStr + "T00:00:00Z");
    return differenceInCalendarDays(today, last);
  } catch {
    return Infinity;
  }
}
