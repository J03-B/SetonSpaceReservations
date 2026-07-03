import type { PublicAvailabilitySlot } from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";

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
    overlaps(new Date(s.startAt), new Date(s.endAt), instant, instant),
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
    overlaps(new Date(s.startAt), new Date(s.endAt), rangeStart, rangeEnd),
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

/** Future blocks for a space, sorted chronologically. Privacy-safe — no event details. */
export function getFutureBlocksForSpace(
  slots: PublicAvailabilitySlot[],
  spaceId: string,
  from: Date,
): PublicAvailabilitySlot[] {
  return slotsForSpace(slots, spaceId)
    .filter((s) => new Date(s.endAt) > from)
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
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
      overlaps(new Date(s.startAt), new Date(s.endAt), dayStart, dayEnd),
    )
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
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
