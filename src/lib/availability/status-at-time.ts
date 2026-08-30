import { addDays, startOfDay, startOfWeek } from "date-fns";
import type { PublicAvailabilitySlot } from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";
import { parseStoredTimestamp } from "@/lib/availability/format-when";

const STATUS_PRIORITY: Record<PublicStatus, number> = {
  Reserved: 5,
  Pending: 4,
  Blocked: 3,
  Closed: 2,
  Available: 1,
};

function overlaps(
  slotStart: Date,
  slotEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  return slotStart < rangeEnd && slotEnd > rangeStart;
}

function slotsForSpace(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
): PublicAvailabilitySlot[] {
  return slots.filter((s) => s.spaceId === spaceId);
}

/** Highest-priority status at a single instant (for map scrubber). */
export function getStatusAtInstant(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  instant: Date,
): PublicStatus {
  const matching = slotsForSpace(slots, spaceId).filter((s) =>
    overlaps(parseStoredTimestamp(s.startAt), parseStoredTimestamp(s.endAt), instant, instant),
  );

  if (matching.length === 0) {
    return "Available";
  }

  return matching.reduce((worst, slot) =>
    STATUS_PRIORITY[slot.publicStatus] > STATUS_PRIORITY[worst.publicStatus]
      ? slot
      : worst,
  ).publicStatus;
}

/**
 * Status across a time range — room is Available only if free for the entire window.
 * Per user request: see everything available for the whole selected period.
 */
export function getStatusForRange(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  rangeStart: Date,
  rangeEnd: Date,
): PublicStatus {
  const matching = slotsForSpace(slots, spaceId).filter((s) =>
    overlaps(parseStoredTimestamp(s.startAt), parseStoredTimestamp(s.endAt), rangeStart, rangeEnd),
  );

  if (matching.length === 0) {
    return "Available";
  }

  return matching.reduce((worst, slot) =>
    STATUS_PRIORITY[slot.publicStatus] > STATUS_PRIORITY[worst.publicStatus]
      ? slot
      : worst,
  ).publicStatus;
}

/** Highest-priority public status on a calendar day. Status and time only. */
export function getStatusForCalendarDay(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  day: Date,
): PublicStatus {
  const start = startOfDay(day);
  return getStatusForRange(slots, spaceId, start, addDays(start, 1));
}

/** Sunday week starts covering every occupancy block for a space. */
export function occupancyWeekSpan(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
): { firstWeekStart: Date; lastWeekStart: Date } | null {
  const spaceSlots = slotsForSpace(slots, spaceId);
  if (spaceSlots.length === 0) return null;

  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = Number.NEGATIVE_INFINITY;
  for (const slot of spaceSlots) {
    minMs = Math.min(minMs, parseStoredTimestamp(slot.startAt).getTime());
    maxMs = Math.max(maxMs, parseStoredTimestamp(slot.endAt).getTime());
  }
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return null;

  return {
    firstWeekStart: startOfWeek(new Date(minMs), { weekStartsOn: 0 }),
    lastWeekStart: startOfWeek(new Date(maxMs), { weekStartsOn: 0 }),
  };
}

/** Future blocks for a space, sorted chronologically. Privacy-safe — no event details. */
export function getFutureBlocksForSpace(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  from: Date,
): PublicAvailabilitySlot[] {
  return slotsForSpace(slots, spaceId)
    .filter((s) => parseStoredTimestamp(s.endAt) > from)
    .sort(
      (a, b) =>
        parseStoredTimestamp(a.startAt).getTime() -
        parseStoredTimestamp(b.startAt).getTime(),
    );
}

/** Blocks on a specific calendar day for the timeline view. */
export function getBlocksForDay(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  day: Date,
): PublicAvailabilitySlot[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return slotsForSpace(slots, spaceId)
    .filter((s) =>
      overlaps(
        parseStoredTimestamp(s.startAt),
        parseStoredTimestamp(s.endAt),
        dayStart,
        dayEnd,
      ),
    )
    .sort(
      (a, b) =>
        parseStoredTimestamp(a.startAt).getTime() -
        parseStoredTimestamp(b.startAt).getTime(),
    );
}

/** Minutes from midnight for positioning on the day timeline. */
export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 23;
export const TIMELINE_TOTAL_MINUTES =
  (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;

export function minuteToTimelinePercent(minute: number): number {
  const start = TIMELINE_START_HOUR * 60;
  const end = TIMELINE_END_HOUR * 60;
  const clamped = Math.max(start, Math.min(end, minute));
  return ((clamped - start) / (end - start)) * 100;
}
