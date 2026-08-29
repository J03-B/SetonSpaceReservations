import { startOfDay } from "date-fns";

export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 22;

const TIMELINE_MIN = TIMELINE_START_HOUR * 60;
const TIMELINE_MAX = TIMELINE_END_HOUR * 60;

export function clampMinutes(value: number): number {
  return Math.min(TIMELINE_MAX, Math.max(TIMELINE_MIN, value));
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return TIMELINE_MIN;
  return clampMinutes(h * 60 + m);
}

export function minuteToTimelinePercent(minutes: number): number {
  const span = TIMELINE_MAX - TIMELINE_MIN;
  return ((clampMinutes(minutes) - TIMELINE_MIN) / span) * 100;
}

export function snapMinutesToPlannerSlot(minutes: number): number {
  const clamped = Math.min(23 * 60 + 30, Math.max(0, minutes));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60 >= 15 ? 30 : 0;
  return hour * 60 + minute;
}

export function applyMinutesToDay(day: Date, minutes: number): Date {
  const base = startOfDay(day);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );
}

export function snapDateToPlannerSlot(date: Date): Date {
  return applyMinutesToDay(
    date,
    snapMinutesToPlannerSlot(minutesSinceMidnight(date)),
  );
}

export type DateRangeHandle = "start" | "end";

/**
 * Move one endpoint to `day` while keeping the other endpoint fixed.
 * If the moved day crosses the other day, roles swap so the other date does not jump.
 */
export function placeRangeHandle(
  day: Date,
  minutes: number,
  other: Date,
): { start: Date; end: Date; handle: DateRangeHandle } {
  const next = applyMinutesToDay(day, minutes);
  const nextDay = startOfDay(next).getTime();
  const otherDay = startOfDay(other).getTime();

  if (
    nextDay < otherDay ||
    (nextDay === otherDay && next.getTime() <= other.getTime())
  ) {
    return { start: next, end: other, handle: "start" };
  }

  return { start: other, end: next, handle: "end" };
}

/**
 * Which range endpoint a calendar-day click should move.
 * Outside or between the current days: the closer endpoint.
 * Clicking a day that already has one endpoint: the other endpoint.
 */
export function pickDateRangeHandle(
  clickedDay: Date,
  rangeStart: Date,
  rangeEnd: Date,
): DateRangeHandle | null {
  const click = startOfDay(clickedDay).getTime();
  const start = startOfDay(rangeStart).getTime();
  const end = startOfDay(rangeEnd).getTime();

  if (click === start && click === end) return null;
  if (click === start) return "end";
  if (click === end) return "start";

  const distStart = Math.abs(click - start);
  const distEnd = Math.abs(click - end);
  return distStart <= distEnd ? "start" : "end";
}
