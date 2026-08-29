import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/lib/domain/statuses";

const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i;

/** Eastern wall-clock string for timestamp columns, e.g. 2026-08-29 02:00:00. */
export function toEasternWallClock(date: Date): string {
  const snapped = new Date(Math.floor(date.getTime() / 60_000) * 60_000);
  return formatInTimeZone(snapped, DEFAULT_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Parse a stored start/end value.
 * Naive strings are America/New_York wall clock.
 * Strings with an offset are treated as absolute instants.
 */
export function parseStoredTimestamp(value: string): Date {
  const withT = value.trim().includes("T")
    ? value.trim()
    : value.trim().replace(" ", "T");
  const withColonOffset = withT.replace(/([+-]\d{2})$/, "$1:00");
  if (HAS_OFFSET.test(withColonOffset)) {
    return new Date(withColonOffset);
  }
  const naive = withColonOffset.replace(/\.\d+$/, "");
  return fromZonedTime(naive, DEFAULT_TIMEZONE);
}

/** Manager-facing range. Same day shares one date; different days show both. */
export function formatCampusWhen(startAt: string, endAt: string): string {
  const start = parseStoredTimestamp(startAt);
  const end = parseStoredTimestamp(endAt);
  const startDay = formatInTimeZone(start, DEFAULT_TIMEZONE, "yyyy-MM-dd");
  const endDay = formatInTimeZone(end, DEFAULT_TIMEZONE, "yyyy-MM-dd");

  if (startDay === endDay) {
    const day = formatInTimeZone(start, DEFAULT_TIMEZONE, "EEE, MMM d");
    const startTime = formatInTimeZone(start, DEFAULT_TIMEZONE, "h:mm a");
    const endTime = formatInTimeZone(end, DEFAULT_TIMEZONE, "h:mm a");
    return `${day}, ${startTime}–${endTime}`;
  }

  const yearFormat =
    formatInTimeZone(start, DEFAULT_TIMEZONE, "yyyy") ===
    formatInTimeZone(end, DEFAULT_TIMEZONE, "yyyy")
      ? "EEE, MMM d, h:mm a"
      : "EEE, MMM d, yyyy, h:mm a";
  const startLabel = formatInTimeZone(start, DEFAULT_TIMEZONE, yearFormat);
  const endLabel = formatInTimeZone(end, DEFAULT_TIMEZONE, yearFormat);
  return `${startLabel} –\n${endLabel}`;
}
