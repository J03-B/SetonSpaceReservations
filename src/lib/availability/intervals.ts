import { parseStoredTimestamp, toEasternWallClock } from "@/lib/availability/format-when";

export type MsInterval = {
  start: number;
  end: number;
};

export function toMsInterval(startAt: string, endAt: string): MsInterval {
  return {
    start: parseStoredTimestamp(startAt).getTime(),
    end: parseStoredTimestamp(endAt).getTime(),
  };
}

export function wallClockFromMs(ms: number): string {
  return toEasternWallClock(new Date(ms));
}

export function intervalsTouchOrOverlap(a: MsInterval, b: MsInterval) {
  return a.start <= b.end && a.end >= b.start;
}

export function unionIntervals(intervals: MsInterval[]): MsInterval | null {
  if (intervals.length === 0) return null;
  return {
    start: Math.min(...intervals.map((item) => item.start)),
    end: Math.max(...intervals.map((item) => item.end)),
  };
}

/** Remove cut intervals from range. Adjacent leftovers stay separate. */
export function subtractIntervals(
  range: MsInterval,
  cuts: MsInterval[],
): MsInterval[] {
  let parts = [range];
  for (const cut of cuts) {
    const next: MsInterval[] = [];
    for (const part of parts) {
      if (cut.end <= part.start || cut.start >= part.end) {
        next.push(part);
        continue;
      }
      if (cut.start > part.start) {
        next.push({ start: part.start, end: cut.start });
      }
      if (cut.end < part.end) {
        next.push({ start: cut.end, end: part.end });
      }
    }
    parts = next.filter((part) => part.end > part.start);
  }
  return parts;
}
