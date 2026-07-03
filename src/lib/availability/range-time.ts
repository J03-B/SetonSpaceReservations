import { setHours, setMinutes, startOfDay } from "date-fns";

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

export function applyMinutesToDay(day: Date, minutes: number): Date {
  const base = startOfDay(day);
  return setMinutes(setHours(base, Math.floor(minutes / 60)), minutes % 60);
}
