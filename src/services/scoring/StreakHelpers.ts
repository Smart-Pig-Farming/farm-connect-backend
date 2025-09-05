import { differenceInCalendarDays, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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
  // Format directly in the requested timezone to avoid UTC boundary drift.
  const todayStr = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const yesterdayStr = formatInTimeZone(addDays(now, -1), tz, "yyyy-MM-dd");
  return { todayStr, yesterdayStr, zone: tz };
}

// Dynamically list supported IANA timezones (Node 20+). Fallback to a minimal curated subset if not available.
let cachedTimezones: string[] | null = null;
export function listSupportedTimezones(): string[] {
  if (cachedTimezones) return cachedTimezones!.slice();
  try {
    const intlAny: any = Intl as any;
    if (typeof intlAny.supportedValuesOf === "function") {
      cachedTimezones = intlAny.supportedValuesOf("timeZone");
      return cachedTimezones!.slice();
    }
  } catch {}
  cachedTimezones = [
    "UTC",
    "Africa/Kigali",
    "Africa/Nairobi",
    "Europe/London",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Tokyo",
  ];
  return cachedTimezones!.slice();
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
