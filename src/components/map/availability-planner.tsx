"use client";

import {
  addDays,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyMinutesToDay,
  clampMinutes,
  minutesSinceMidnight,
  pickDateRangeHandle,
  placeRangeHandle,
  setRangeDate,
  slideRangeToDay,
} from "@/lib/availability/range-time";
import {
  PlannerDatePicker,
  PlannerTimePicker,
} from "@/components/map/planner-range-inputs";
import { cn } from "@/lib/utils";
import type { PublicAvailabilitySlot } from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  getStatusForCalendarDay,
  occupancyWeekSpan,
} from "@/lib/availability/status-at-time";
import { FLOOR_STATUS_COLORS } from "@/lib/map/status-colors";

const WEEK_PAD = 1;
const DRAG_THRESHOLD_PX = 3;
const VISIBLE_WEEK_ROWS = 3;
const MAX_WEEK_ROWS = 104;
const POINTER_BLEND = 0.22;
const WEEK_SCROLL_DURATION_MS = 240;
/** How far toward the next stop (0–1) before a drag snaps to it. */
const WEEK_SCROLL_SNAP_PULL = 0.55;
const EXPAND_BEYOND_PX = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Matches cubic-bezier(0.22, 1, 0.36, 1) used elsewhere in the planner. */
function easeWeekScroll(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const ax = 3 * 0.22 - 3 * 0.36 + 1;
  const bx = 3 * 0.36 - 6 * 0.22;
  const cx = 3 * 0.22;
  const ay = 3 * 1 - 3 * 1 + 1;
  const by = 3 * 1 - 6 * 1;
  const cy = 3 * 1;
  const sampleX = (p: number) => ((ax * p + bx) * p + cx) * p;
  const sampleDX = (p: number) => (3 * ax * p + 2 * bx) * p + cx;
  const sampleY = (p: number) => ((ay * p + by) * p + cy) * p;
  let p = t;
  for (let i = 0; i < 8; i++) {
    const dx = sampleDX(p);
    if (dx === 0) break;
    p = Math.max(0, Math.min(1, p - (sampleX(p) - t) / dx));
  }
  return sampleY(p);
}

interface DragViewportHint {
  expandUpWeeks: number;
  expandDownWeeks: number;
}

interface FrozenWeekWindow {
  firstWeekStartMs: number;
  lastWeekStartMs: number;
}

function computeCalendarWeeks(
  rangeStart: Date,
  rangeEnd: Date,
  dragHint?: DragViewportHint | null,
  frozenWeeks?: FrozenWeekWindow | null,
  occupancySpan?: { firstWeekStart: Date; lastWeekStart: Date } | null,
): Date[][] {
  let firstWeekStart: Date;
  let lastWeekStart: Date;

  if (frozenWeeks) {
    firstWeekStart = new Date(frozenWeeks.firstWeekStartMs);
    lastWeekStart = new Date(frozenWeeks.lastWeekStartMs);
  } else {
    const lo = startOfDay(
      rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd,
    );
    const hi = startOfDay(
      rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart,
    );
    firstWeekStart = addDays(startOfWeek(lo, { weekStartsOn: 0 }), -7 * WEEK_PAD);
    lastWeekStart = addDays(startOfWeek(hi, { weekStartsOn: 0 }), 7 * WEEK_PAD);
    if (occupancySpan) {
      if (occupancySpan.firstWeekStart.getTime() < firstWeekStart.getTime()) {
        firstWeekStart = occupancySpan.firstWeekStart;
      }
      if (occupancySpan.lastWeekStart.getTime() > lastWeekStart.getTime()) {
        lastWeekStart = occupancySpan.lastWeekStart;
      }
    }
  }

  if (dragHint?.expandUpWeeks) {
    firstWeekStart = addDays(firstWeekStart, -7);
  }
  if (dragHint?.expandDownWeeks) {
    lastWeekStart = addDays(lastWeekStart, 7);
  }

  const weeks: Date[][] = [];
  let weekStart = firstWeekStart;

  while (weekStart <= lastWeekStart || weeks.length === 0) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)));
    weekStart = addDays(weekStart, 7);
    if (weeks.length >= MAX_WEEK_ROWS) break;
  }

  return weeks;
}

function weekIndexContaining(weeks: Date[][], day: Date): number {
  const ms = startOfDay(day).getTime();
  const index = weeks.findIndex((weekDays) =>
    weekDays.some((weekDay) => startOfDay(weekDay).getTime() === ms),
  );
  return index < 0 ? 0 : index;
}

function visibleWeekWindow(
  weekCount: number,
  focusIndex: number,
): { from: number; to: number } {
  if (weekCount <= 0) return { from: 0, to: 0 };
  const from = Math.max(0, focusIndex - 1);
  const to = Math.min(weekCount - 1, from + VISIBLE_WEEK_ROWS - 1);
  return {
    from: Math.max(0, to - VISIBLE_WEEK_ROWS + 1),
    to,
  };
}

function weekSnapItems(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>("[data-week-snap]"));
}

function clampWeekScrollIndex(index: number, weekCount: number): number {
  const max = Math.max(0, weekCount - VISIBLE_WEEK_ROWS);
  return Math.max(0, Math.min(max, index));
}

function nearestWeekScrollIndex(
  scrollTop: number,
  offsets: number[],
  weekCount: number,
): number {
  if (offsets.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < offsets.length; i++) {
    const dist = Math.abs(offsets[i] - scrollTop);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return clampWeekScrollIndex(best, weekCount);
}

type WeekScrollOptions = { immediate?: boolean };

function WeekRowStepper({
  weekCount,
  index,
  disabled,
  onIndexChange,
}: {
  weekCount: number;
  index: number;
  disabled?: boolean;
  onIndexChange: (index: number, options?: WeekScrollOptions) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  const onIndexChangeRef = useRef(onIndexChange);
  const dragRef = useRef<{
    pointerId: number;
    moved: boolean;
    startY: number;
    committedIndex: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const max = Math.max(0, weekCount - VISIBLE_WEEK_ROWS);
  const segmentCount = max + 1;

  useLayoutEffect(() => {
    indexRef.current = index;
    onIndexChangeRef.current = onIndexChange;
  }, [index, onIndexChange]);

  const measureThumb = useCallback(() => {
    const track = trackRef.current;
    if (!track) return { height: 0, stride: 0 };
    const gap =
      Number.parseFloat(getComputedStyle(track).rowGap) ||
      Number.parseFloat(getComputedStyle(track).gap) ||
      3.2;
    const height =
      (track.clientHeight - gap * Math.max(0, segmentCount - 1)) /
      Math.max(1, segmentCount);
    return { height, stride: height + gap };
  }, [segmentCount]);

  const setThumbY = useCallback((y: number, animate: boolean) => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    const { height } = measureThumb();
    thumb.style.height = `${Math.max(0, height)}px`;
    const reduce = prefersReducedMotion();
    thumb.style.transition =
      animate && !reduce
        ? `transform ${WEEK_SCROLL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : "none";
    thumb.style.transform = `translateY(${y}px)`;
  }, [measureThumb]);

  const yForProgress = useCallback(
    (progress: number) => measureThumb().stride * progress,
    [measureThumb],
  );

  const magneticIndexFromClientY = useCallback(
    (clientY: number, current: number) => {
      const track = trackRef.current;
      const { height, stride } = measureThumb();
      if (!track || stride <= 0) return current;
      const rect = track.getBoundingClientRect();
      const y = Math.max(
        0,
        Math.min(max * stride, clientY - rect.top - height / 2),
      );
      const progress = y / stride;
      const delta = progress - current;
      if (Math.abs(delta) < WEEK_SCROLL_SNAP_PULL) return current;
      if (Math.abs(delta) >= 1) {
        return clampWeekScrollIndex(Math.round(progress), weekCount);
      }
      return clampWeekScrollIndex(current + (delta > 0 ? 1 : -1), weekCount);
    },
    [max, measureThumb, weekCount],
  );

  const segmentFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return indexRef.current;
      const rect = track.getBoundingClientRect();
      const ratio = (clientY - rect.top) / Math.max(1, rect.height);
      return clampWeekScrollIndex(
        Math.floor(Math.max(0, Math.min(0.999, ratio)) * segmentCount),
        weekCount,
      );
    },
    [segmentCount, weekCount],
  );

  const thumbReadyRef = useRef(false);
  const prevSegmentCountRef = useRef(segmentCount);

  useLayoutEffect(() => {
    if (!thumbRef.current) {
      thumbReadyRef.current = false;
      return;
    }
    const countChanged = prevSegmentCountRef.current !== segmentCount;
    prevSegmentCountRef.current = segmentCount;
    const shouldAnimate =
      thumbReadyRef.current && !countChanged && !prefersReducedMotion();
    setThumbY(yForProgress(index), shouldAnimate);
    thumbReadyRef.current = true;
  }, [index, segmentCount, setThumbY, yForProgress]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      if (dragRef.current?.moved) return;
      setThumbY(yForProgress(indexRef.current), false);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [setThumbY, yForProgress]);

  if (max <= 0) return null;

  return (
    <div
      className={cn(
        "planner-week-stepper",
        dragging && "planner-week-stepper--dragging",
      )}
      role="scrollbar"
      tabIndex={disabled ? -1 : 0}
      aria-orientation="vertical"
      aria-controls="availability-planner-weeks"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={index}
      aria-valuetext={`Weeks ${index + 1} to ${index + VISIBLE_WEEK_ROWS} of ${weekCount}`}
      aria-label="Scroll calendar by week"
      aria-disabled={disabled || undefined}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowDown" || event.key === "PageDown") {
          event.preventDefault();
          onIndexChange(index + 1);
        }
        if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          onIndexChange(index - 1);
        }
        if (event.key === "Home") {
          event.preventDefault();
          onIndexChange(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          onIndexChange(max);
        }
      }}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* ignore untrusted test pointers */
        }
        dragRef.current = {
          pointerId: event.pointerId,
          moved: false,
          startY: event.clientY,
          committedIndex: indexRef.current,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (disabled || !drag || drag.pointerId !== event.pointerId) return;
        if (!drag.moved) {
          if (Math.abs(event.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
          drag.moved = true;
          setDragging(true);
        }
        const next = magneticIndexFromClientY(event.clientY, drag.committedIndex);
        if (next === drag.committedIndex) return;
        drag.committedIndex = next;
        onIndexChangeRef.current(next);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const moved = drag.moved;
        const next = moved
          ? magneticIndexFromClientY(event.clientY, drag.committedIndex)
          : segmentFromClientY(event.clientY);
        dragRef.current = null;
        setDragging(false);
        onIndexChange(next);
      }}
      onPointerCancel={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
        setThumbY(yForProgress(indexRef.current), !prefersReducedMotion());
      }}
    >
      <div ref={trackRef} className="planner-week-stepper-track">
        {Array.from({ length: segmentCount }, (_, segment) => (
          <div
            key={segment}
            className="planner-week-stepper-segment"
            aria-hidden="true"
          />
        ))}
        <div
          ref={thumbRef}
          className="planner-week-stepper-thumb"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function weekRangeSegment(
  weekDays: Date[],
  rangeLoDay: Date,
  rangeHiDay: Date,
): { lo: number; hi: number } | null {
  const loMs = rangeLoDay.getTime();
  const hiMs = rangeHiDay.getTime();
  let lo = -1;
  let hi = -1;

  weekDays.forEach((day, index) => {
    const ms = startOfDay(day).getTime();
    if (ms >= loMs && ms <= hiMs) {
      if (lo === -1) lo = index;
      hi = index;
    }
  });

  return lo >= 0 ? { lo, hi } : null;
}

function hitTestDay(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement,
  weeks: Date[][],
  viewportEl?: HTMLElement | null,
): Date | null {
  if (weeks.length === 0) return null;

  const rows = Array.from(
    gridEl.querySelectorAll<HTMLElement>("[data-week-row]"),
  );
  if (rows.length === 0) return null;

  const view = viewportEl?.getBoundingClientRect();
  const colForX = (row: HTMLElement) => {
    const cells = row.querySelectorAll<HTMLElement>("[data-day-cell]");
    for (let col = 0; col < cells.length; col++) {
      if (clientX <= cells[col].getBoundingClientRect().right) return col;
    }
    return Math.max(0, cells.length - 1);
  };

  for (let weekIndex = 0; weekIndex < rows.length; weekIndex++) {
    const rowRect = rows[weekIndex].getBoundingClientRect();
    if (view && (rowRect.bottom < view.top || rowRect.top > view.bottom)) {
      continue;
    }

    const cells = rows[weekIndex].querySelectorAll<HTMLElement>("[data-day-cell]");
    for (let col = 0; col < cells.length; col++) {
      const rect = cells[col].getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return weeks[weekIndex]?.[col] ?? null;
      }
    }
  }

  let nearestIndex = -1;
  let nearestDist = Infinity;
  for (let weekIndex = 0; weekIndex < rows.length; weekIndex++) {
    const rowRect = rows[weekIndex].getBoundingClientRect();
    if (view && (rowRect.bottom < view.top || rowRect.top > view.bottom)) {
      continue;
    }
    const midY = (rowRect.top + rowRect.bottom) / 2;
    const dist = Math.abs(clientY - midY);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIndex = weekIndex;
    }
  }
  if (nearestIndex >= 0) {
    return weeks[nearestIndex]?.[colForX(rows[nearestIndex])] ?? null;
  }

  const visibleIndexes = rows.flatMap((row, index) => {
    if (!view) return [index];
    const rect = row.getBoundingClientRect();
    return rect.bottom > view.top && rect.top < view.bottom ? [index] : [];
  });
  const firstVisible = rows[visibleIndexes[0] ?? 0];
  const lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1] ?? rows.length - 1;
  const lastVisible = rows[lastVisibleIndex];

  if (view && clientY < view.top) {
    return weeks[visibleIndexes[0] ?? 0]?.[colForX(firstVisible)] ?? null;
  }
  if (view && clientY > view.bottom) {
    return weeks[lastVisibleIndex]?.[colForX(lastVisible)] ?? null;
  }

  const firstRect = rows[0].getBoundingClientRect();
  const lastRect = rows[rows.length - 1]?.getBoundingClientRect();

  if (clientY < firstRect.top) {
    return weeks[0]?.[colForX(rows[0])] ?? null;
  }
  if (lastRect && clientY > lastRect.bottom) {
    const last = rows[rows.length - 1];
    return weeks[weeks.length - 1]?.[colForX(last)] ?? null;
  }

  return null;
}

function getDayCellMetrics(
  day: Date,
  gridEl: HTMLElement,
  weeks: Date[][],
): { x: number; y: number; width: number; height: number } | null {
  const gridRect = gridEl.getBoundingClientRect();

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const col = weeks[weekIndex].findIndex((d) => isSameDay(d, day));
    if (col === -1) continue;

    const row = gridEl.querySelectorAll<HTMLElement>("[data-week-row]")[weekIndex];
    const cell = row?.querySelectorAll<HTMLElement>("[data-day-cell]")[col];
    if (!cell) continue;

    const cellRect = cell.getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width / 2 - gridRect.left,
      y: cellRect.top + cellRect.height / 2 - gridRect.top,
      width: cellRect.width,
      height: cellRect.height,
    };
  }

  return null;
}

function pointerExpandDirection(
  pointerY: number,
  gridEl: HTMLElement,
): "up" | "down" | null {
  const rows = gridEl.querySelectorAll<HTMLElement>("[data-week-row]");
  if (rows.length === 0) return null;

  const first = rows[0].getBoundingClientRect();
  const last = rows[rows.length - 1].getBoundingClientRect();
  if (pointerY > last.bottom + EXPAND_BEYOND_PX) return "down";
  if (pointerY < first.top - EXPAND_BEYOND_PX) return "up";
  return null;
}

function clockHandAngles(minutes: number): {
  hourDegrees: number;
  minuteDegrees: number;
} {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60) % 12;
  const minute = normalized % 60;

  return {
    hourDegrees: (hour + minute / 60) * 30,
    minuteDegrees: minute * 6,
  };
}

function dayClockDegrees(minutes: number): number {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return (normalized / (24 * 60)) * 360 - 90;
}

function pointOnClock(degrees: number, radius: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: 20 + Math.cos(radians) * radius,
    y: 20 + Math.sin(radians) * radius,
  };
}

function ClockHands({ minutes }: { minutes: number }) {
  const { hourDegrees, minuteDegrees } = clockHandAngles(minutes);
  const hour = pointOnClock(hourDegrees - 90, 8);
  const minute = pointOnClock(minuteDegrees - 90, 12.5);

  return (
    <svg
      className="pointer-events-none absolute inset-1 z-10"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        className="text-action-primary/25"
        strokeWidth="1.5"
      />
      <line
        x1="20"
        y1="20"
        x2={hour.x}
        y2={hour.y}
        stroke="currentColor"
        className="text-action-primary"
        strokeLinecap="round"
        strokeWidth="2.75"
      />
      <line
        x1="20"
        y1="20"
        x2={minute.x}
        y2={minute.y}
        stroke="currentColor"
        className="text-action-primary"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
      <circle cx="20" cy="20" r="1.8" className="fill-action-primary" />
    </svg>
  );
}

function ClockRange({
  startMinutes,
  endMinutes,
}: {
  startMinutes: number;
  endMinutes: number;
}) {
  const dayMinutes = 24 * 60;
  const normalizedStart = ((startMinutes % dayMinutes) + dayMinutes) % dayMinutes;
  const normalizedEnd = ((endMinutes % dayMinutes) + dayMinutes) % dayMinutes;
  const span =
    normalizedEnd >= normalizedStart
      ? normalizedEnd - normalizedStart
      : dayMinutes - normalizedStart + normalizedEnd;
  const safeSpan = span === 0 ? dayMinutes : span;
  const startDegrees = dayClockDegrees(normalizedStart);
  const endDegrees = startDegrees + (safeSpan / dayMinutes) * 360;
  const start = pointOnClock(startDegrees, 13.5);
  const end = pointOnClock(endDegrees, 13.5);
  const startHand = pointOnClock(startDegrees, 10.5);
  const endHand = pointOnClock(endDegrees, 10.5);
  const largeArc = safeSpan > dayMinutes / 2 ? 1 : 0;
  const isFullDay = safeSpan === dayMinutes;

  return (
    <svg
      className="pointer-events-none absolute inset-1 z-10"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="13.5"
        fill="none"
        stroke="currentColor"
        className="text-action-primary/20"
        strokeWidth="2"
      />
      {isFullDay ? (
        <circle
          cx="20"
          cy="20"
          r="13.5"
          fill="none"
          stroke="currentColor"
          className="text-action-primary"
          strokeLinecap="round"
          strokeWidth="4"
        />
      ) : (
        <path
          d={`M ${start.x} ${start.y} A 13.5 13.5 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="currentColor"
          className="text-action-primary"
          strokeLinecap="round"
          strokeWidth="4"
        />
      )}
      <line
        x1="20"
        y1="20"
        x2={startHand.x}
        y2={startHand.y}
        stroke="currentColor"
        className="text-action-primary"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="20"
        x2={endHand.x}
        y2={endHand.y}
        stroke="currentColor"
        className="text-action-primary"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx={start.x} cy={start.y} r="2" className="fill-action-primary" />
      <circle cx={end.x} cy={end.y} r="2" className="fill-action-primary" />
      <circle cx="20" cy="20" r="1.8" className="fill-action-primary" />
    </svg>
  );
}

interface AvailabilityPlannerProps {
  rangeStart: Date;
  rangeEnd: Date;
  onRangeChange: (start: Date, end: Date) => void;
  occupancySlots?: PublicAvailabilitySlot[];
  spaceId?: string;
  className?: string;
}

type DragHandle = "start" | "end";

function RangeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
        {children}
      </div>
    </div>
  );
}

export function AvailabilityPlanner({
  rangeStart,
  rangeEnd,
  onRangeChange,
  occupancySlots = [],
  spaceId,
  className,
}: AvailabilityPlannerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [draggingHandle, setDraggingHandle] = useState<DragHandle | null>(null);
  const [dragHint, setDragHint] = useState<DragViewportHint | null>(null);
  const [lockedStart, setLockedStart] = useState(false);
  const [lockedEnd, setLockedEnd] = useState(false);
  const [weekScrollIndex, setWeekScrollIndex] = useState(0);
  const weekScrollIndexRef = useRef(0);
  const weekScrollAnimRef = useRef<number | null>(null);
  const userHasScrolledRef = useRef(false);
  const syncingScrollRef = useRef(false);
  const [newWeekKeys, setNewWeekKeys] = useState<Set<string>>(new Set());
  const [newWeekDirection, setNewWeekDirection] = useState<
    Map<string, "up" | "down">
  >(new Map());

  const gridRef = useRef<HTMLDivElement>(null);
  const weeksScrollRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const scrollFocusMsRef = useRef<number | null>(null);
  const weeksRef = useRef<Date[][]>([]);
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    originMinutes: number;
    originDayMs: number;
    anchorDayMs: number;
    anchorMinutes: number;
    snappedDayMs: number;
    visualX: number;
    visualY: number;
    ghostPlaced: boolean;
    rowHeight: number;
    expandUpLatched: boolean;
    expandDownLatched: boolean;
    minWeekStartMs: number;
    maxWeekStartMs: number;
    moved: boolean;
    otherLocked: boolean;
    slideStartMs: number;
    slideEndMs: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragLoopRef = useRef<() => void>(() => {});
  const prevWeekKeysRef = useRef<Set<string>>(new Set());

  const startDay = startOfDay(rangeStart);
  const endDay = startOfDay(rangeEnd);
  const startMinutes = minutesSinceMidnight(rangeStart);
  const endMinutes = minutesSinceMidnight(rangeEnd);
  const rangeLoDay = startDay <= endDay ? startDay : endDay;
  const rangeHiDay = startDay <= endDay ? endDay : startDay;

  const [frozenWeeks, setFrozenWeeks] = useState<FrozenWeekWindow | null>(null);

  const occupancySpan = useMemo(
    () => (spaceId ? occupancyWeekSpan(occupancySlots, spaceId) : null),
    [occupancySlots, spaceId],
  );

  const weeks = useMemo(
    () =>
      computeCalendarWeeks(
        rangeStart,
        rangeEnd,
        draggingHandle ? dragHint : null,
        draggingHandle ? frozenWeeks : null,
        occupancySpan,
      ),
    [rangeStart, rangeEnd, draggingHandle, dragHint, frozenWeeks, occupancySpan],
  );

  const occupancyByDay = useMemo(() => {
    const byDay = new Map<string, PublicStatus>();
    if (!spaceId) return byDay;
    for (const weekDays of weeks) {
      for (const day of weekDays) {
        const status = getStatusForCalendarDay(occupancySlots, spaceId, day);
        if (status !== "Available") {
          byDay.set(startOfDay(day).toISOString(), status);
        }
      }
    }
    return byDay;
  }, [occupancySlots, spaceId, weeks]);

  useLayoutEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);

  useEffect(() => {
    const currentKeys = weeks.map((w) => w[0].toISOString());
    const prevSet = prevWeekKeysRef.current;
    const added = new Set<string>();
    const directions = new Map<string, "up" | "down">();
    const prevSorted = [...prevSet].sort();

    currentKeys.forEach((key) => {
      if (!prevSet.has(key)) {
        added.add(key);
        const minPrev = prevSorted[0];
        directions.set(key, minPrev && key < minPrev ? "up" : "down");
      }
    });

    if (added.size > 0) {
      setNewWeekKeys(added);
      setNewWeekDirection(directions);
      const timer = window.setTimeout(() => {
        setNewWeekKeys(new Set());
        setNewWeekDirection(new Map());
      }, 420);
      prevWeekKeysRef.current = new Set(currentKeys);
      return () => window.clearTimeout(timer);
    }
    prevWeekKeysRef.current = new Set(currentKeys);
  }, [weeks]);

  const applyWeekScrollIndex = useCallback((
    nextIndex: number,
    options?: WeekScrollOptions,
  ) => {
    const scroll = weeksScrollRef.current;
    const grid = gridRef.current;
    if (!scroll || !grid) return;

    const snaps = weekSnapItems(grid);
    const index = clampWeekScrollIndex(nextIndex, snaps.length);
    const top = snaps[index]?.offsetTop ?? 0;
    const alreadyThere = weekScrollIndexRef.current === index;
    const atRest = Math.abs(scroll.scrollTop - top) < 1;
    const animatingThis = alreadyThere && weekScrollAnimRef.current != null;
    if (options?.immediate !== true && (animatingThis || (alreadyThere && atRest))) {
      return;
    }

    userHasScrolledRef.current = true;

    if (weekScrollAnimRef.current != null) {
      cancelAnimationFrame(weekScrollAnimRef.current);
      weekScrollAnimRef.current = null;
    }

    if (weekScrollIndexRef.current !== index) {
      weekScrollIndexRef.current = index;
      setWeekScrollIndex(index);
    }

    const from = scroll.scrollTop;
    const immediate =
      options?.immediate === true ||
      prefersReducedMotion() ||
      Math.abs(from - top) < 1;

    syncingScrollRef.current = true;

    if (immediate) {
      if (Math.abs(from - top) > 0.5) {
        scroll.scrollTop = top;
      }
      window.requestAnimationFrame(() => {
        syncingScrollRef.current = false;
      });
      return;
    }

    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / WEEK_SCROLL_DURATION_MS);
      scroll.scrollTop = from + (top - from) * easeWeekScroll(t);
      if (t < 1) {
        weekScrollAnimRef.current = requestAnimationFrame(tick);
        return;
      }
      weekScrollAnimRef.current = null;
      scroll.scrollTop = top;
      syncingScrollRef.current = false;
    };
    weekScrollAnimRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (weekScrollAnimRef.current != null) {
        cancelAnimationFrame(weekScrollAnimRef.current);
      }
    },
    [],
  );

  const focusDay = draggingHandle === "end" ? rangeEnd : rangeStart;

  useLayoutEffect(() => {
    const scroll = weeksScrollRef.current;
    const grid = gridRef.current;
    if (!scroll || !grid) return;

    const syncVisibleWeeks = () => {
      const snaps = weekSnapItems(grid);
      if (snaps.length === 0) {
        scroll.style.height = "";
        scroll.style.maxHeight = "";
        return;
      }

      const visible = Math.min(VISIBLE_WEEK_ROWS, snaps.length);
      const firstSnap = snaps[0];
      const lastVisibleSnap = snaps[visible - 1];
      const nextHeight = `${
        lastVisibleSnap.offsetTop + lastVisibleSnap.offsetHeight - firstSnap.offsetTop
      }px`;
      if (scroll.style.height !== nextHeight) {
        scroll.style.height = nextHeight;
        scroll.style.maxHeight = nextHeight;
      }

      const focusMs = scrollFocusMsRef.current;
      const focus =
        !draggingHandle && focusMs != null ? new Date(focusMs) : focusDay;
      const focusIndex = weekIndexContaining(weeks, focus);
      const followFocus =
        draggingHandle != null ||
        focusMs != null ||
        !userHasScrolledRef.current;
      const from = followFocus
        ? visibleWeekWindow(snaps.length, focusIndex).from
        : clampWeekScrollIndex(weekScrollIndexRef.current, snaps.length);
      const first = snaps[from];
      if (!first) return;

      if (followFocus) {
        if (weekScrollAnimRef.current != null) {
          cancelAnimationFrame(weekScrollAnimRef.current);
          weekScrollAnimRef.current = null;
          syncingScrollRef.current = false;
        }
        if (Math.abs(scroll.scrollTop - first.offsetTop) > 1) {
          scroll.scrollTop = first.offsetTop;
        }
        if (weekScrollIndexRef.current !== from) {
          weekScrollIndexRef.current = from;
          setWeekScrollIndex(from);
        }
      }

      if (!draggingHandle) scrollFocusMsRef.current = null;
    };

    syncVisibleWeeks();
    const frame = requestAnimationFrame(syncVisibleWeeks);
    const observer = new ResizeObserver(syncVisibleWeeks);
    observer.observe(scroll);
    observer.observe(grid);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [draggingHandle, dragHint, focusDay, weeks]);

  useEffect(() => {
    const scroll = weeksScrollRef.current;
    const grid = gridRef.current;
    if (!scroll || !grid) return;

    let wheelLock = false;
    let wheelUnlock = 0;
    let snapTimer = 0;

    let touchStartY: number | null = null;

    const stepBy = (direction: number) => {
      if (direction === 0 || draggingHandle) return;
      applyWeekScrollIndex(weekScrollIndexRef.current + direction);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (draggingHandle) return;
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY == null || draggingHandle) return;
      const endY = event.changedTouches[0]?.clientY;
      const dy = endY == null ? 0 : touchStartY - endY;
      touchStartY = null;
      if (Math.abs(dy) < 28) return;
      stepBy(dy > 0 ? 1 : -1);
    };

    const onWheel = (event: WheelEvent) => {
      if (weeks.length <= VISIBLE_WEEK_ROWS) return;
      event.preventDefault();
      if (wheelLock) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
      if (delta === 0) return;
      wheelLock = true;
      stepBy(delta > 0 ? 1 : -1);
      wheelUnlock = window.setTimeout(() => {
        wheelLock = false;
      }, 90);
    };

    const onScroll = () => {
      if (draggingHandle || syncingScrollRef.current) return;
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        const snaps = weekSnapItems(grid);
        const offsets = snaps.map((item) => item.offsetTop);
        const index = nearestWeekScrollIndex(
          scroll.scrollTop,
          offsets,
          snaps.length,
        );
        applyWeekScrollIndex(index);
      }, 40);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        stepBy(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        stepBy(-1);
      }
    };

    scroll.addEventListener("wheel", onWheel, { passive: false });
    scroll.addEventListener("scroll", onScroll, { passive: true });
    scroll.addEventListener("keydown", onKeyDown);
    scroll.addEventListener("touchstart", onTouchStart, { passive: true });
    scroll.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(wheelUnlock);
      window.clearTimeout(snapTimer);
      scroll.removeEventListener("wheel", onWheel);
      scroll.removeEventListener("scroll", onScroll);
      scroll.removeEventListener("keydown", onKeyDown);
      scroll.removeEventListener("touchstart", onTouchStart);
      scroll.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyWeekScrollIndex, draggingHandle, weeks.length]);

  const measureGrid = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || weeks.length === 0) {
      return { colWidth: 80, rowHeight: 84 };
    }
    const rect = grid.getBoundingClientRect();
    const firstRow = grid.querySelector<HTMLElement>("[data-week-row]");
    return {
      colWidth: rect.width / 7,
      rowHeight: firstRow?.offsetHeight ?? rect.height / weeks.length,
    };
  }, [weeks.length]);

  const commitRange = useCallback(
    (handle: DragHandle, day: Date, minutes: number) => {
      const other = handle === "start" ? rangeEnd : rangeStart;
      const placed = placeRangeHandle(day, minutes, other);
      scrollFocusMsRef.current = startOfDay(day).getTime();
      userHasScrolledRef.current = false;
      onRangeChange(placed.start, placed.end);
    },
    [onRangeChange, rangeEnd, rangeStart],
  );

  const lockHandle = useCallback((handle: DragHandle) => {
    if (handle === "start") setLockedStart(true);
    else setLockedEnd(true);
  }, []);

  const commitDate = useCallback(
    (handle: DragHandle, day: Date) => {
      const otherLocked = handle === "start" ? lockedEnd : lockedStart;
      const next = setRangeDate(
        handle,
        day,
        rangeStart,
        rangeEnd,
        otherLocked,
      );
      lockHandle(handle);
      scrollFocusMsRef.current = startOfDay(day).getTime();
      userHasScrolledRef.current = false;
      onRangeChange(next.start, next.end);
    },
    [
      lockHandle,
      lockedEnd,
      lockedStart,
      onRangeChange,
      rangeEnd,
      rangeStart,
    ],
  );

  const onCalendarDaySelect = useCallback(
    (day: Date) => {
      const handle = pickDateRangeHandle(
        day,
        rangeStart,
        rangeEnd,
        lockedStart,
        lockedEnd,
      );
      if (!handle) return;
      commitDate(handle, day);
    },
    [commitDate, lockedEnd, lockedStart, rangeEnd, rangeStart],
  );

  const updateGhostPosition = useCallback((snappedDay: Date) => {
    const grid = gridRef.current;
    const ghost = ghostRef.current;
    const drag = dragRef.current;
    if (!grid || !ghost || !drag) return;

    const metrics = getDayCellMetrics(snappedDay, grid, weeksRef.current);
    if (!metrics) return;

    ghost.style.width = `${metrics.width}px`;
    ghost.style.height = `${metrics.height}px`;

    const gridRect = grid.getBoundingClientRect();
    const ptrX = drag.pointerX - gridRect.left;
    const ptrY = drag.pointerY - gridRect.top;
    const targetX = metrics.x + (ptrX - metrics.x) * POINTER_BLEND;
    const targetY = metrics.y + (ptrY - metrics.y) * POINTER_BLEND;

    if (!drag.ghostPlaced) {
      drag.visualX = metrics.x;
      drag.visualY = metrics.y;
      drag.ghostPlaced = true;
    } else {
      drag.visualX += (targetX - drag.visualX) * 0.32;
      drag.visualY += (targetY - drag.visualY) * 0.32;
    }

    ghost.style.transform = `translate(${drag.visualX}px, ${drag.visualY}px) translate(-50%, -50%)`;
  }, []);

  const finishDrag = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    dragRef.current = null;
    setFrozenWeeks(null);
    setDraggingHandle(null);
    setDragHint(null);
  }, []);

  const dragLoop = useCallback(() => {
    const drag = dragRef.current;
    const grid = gridRef.current;
    if (!drag || !grid) return;

    const currentWeeks = weeksRef.current;
    const hit = hitTestDay(
      drag.pointerX,
      drag.pointerY,
      grid,
      currentWeeks,
      weeksScrollRef.current,
    );
    let snappedDay = hit ?? new Date(drag.snappedDayMs);
    let snappedWeekStartMs = startOfWeek(snappedDay, { weekStartsOn: 0 }).getTime();

    if (snappedWeekStartMs < drag.minWeekStartMs) {
      const dayOffset = Math.round(
        (drag.minWeekStartMs - snappedWeekStartMs) / MS_PER_DAY,
      );
      snappedDay = addDays(snappedDay, dayOffset);
      snappedWeekStartMs = drag.minWeekStartMs;
    } else if (snappedWeekStartMs > drag.maxWeekStartMs) {
      const dayOffset = Math.round(
        (drag.maxWeekStartMs - snappedWeekStartMs) / MS_PER_DAY,
      );
      snappedDay = addDays(snappedDay, dayOffset);
      snappedWeekStartMs = drag.maxWeekStartMs;
    }

    const snappedMs = startOfDay(snappedDay).getTime();

    if (
      !drag.expandUpLatched &&
      !drag.expandDownLatched &&
      currentWeeks.length < MAX_WEEK_ROWS
    ) {
      const direction = pointerExpandDirection(drag.pointerY, grid);
      if (direction === "up") {
        drag.expandUpLatched = true;
        setDragHint({ expandUpWeeks: 1, expandDownWeeks: 0 });
      } else if (direction === "down") {
        drag.expandDownLatched = true;
        setDragHint({ expandUpWeeks: 0, expandDownWeeks: 1 });
      }
    }

    if (snappedMs !== drag.snappedDayMs) {
      drag.snappedDayMs = snappedMs;
      if (drag.otherLocked) {
        const other = applyMinutesToDay(
          new Date(drag.anchorDayMs),
          drag.anchorMinutes,
        );
        const placed = placeRangeHandle(
          snappedDay,
          drag.originMinutes,
          other,
        );
        onRangeChange(placed.start, placed.end);
        if (placed.handle !== drag.handle) {
          drag.handle = placed.handle;
          setDraggingHandle(placed.handle);
        }
      } else {
        const next = slideRangeToDay(
          drag.handle,
          snappedDay,
          new Date(drag.slideStartMs),
          new Date(drag.slideEndMs),
        );
        onRangeChange(next.start, next.end);
      }
    }

    updateGhostPosition(snappedDay);
    rafRef.current = requestAnimationFrame(dragLoopRef.current);
  }, [onRangeChange, updateGhostPosition]);

  useLayoutEffect(() => {
    dragLoopRef.current = dragLoop;
  }, [dragLoop]);

  const onHandlePointerDown = useCallback(
    (handle: DragHandle) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const { rowHeight } = measureGrid();
      const originDate = handle === "start" ? startDay : endDay;
      const originMinutes = handle === "start" ? startMinutes : endMinutes;
      const anchorDate = handle === "start" ? endDay : startDay;
      const anchorMinutes = handle === "start" ? endMinutes : startMinutes;
      const grid = gridRef.current;
      const visibleWeeks = weeksRef.current;
      const firstWeek = visibleWeeks[0];
      const lastWeek = visibleWeeks[visibleWeeks.length - 1];
      const originWeekStart = startOfWeek(originDate, { weekStartsOn: 0 });
      const firstWeekStart = firstWeek?.[0] ?? originWeekStart;
      const lastWeekStart = lastWeek?.[0] ?? originWeekStart;
      setFrozenWeeks({
        firstWeekStartMs: firstWeekStart.getTime(),
        lastWeekStartMs: lastWeekStart.getTime(),
      });
      let visualX = 0;
      let visualY = 0;

      if (grid) {
        const metrics = getDayCellMetrics(originDate, grid, weeksRef.current);
        if (metrics) {
          visualX = metrics.x;
          visualY = metrics.y;
        }
      }

      dragRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        pointerX: e.clientX,
        pointerY: e.clientY,
        originMinutes,
        originDayMs: originDate.getTime(),
        anchorDayMs: anchorDate.getTime(),
        anchorMinutes,
        snappedDayMs: originDate.getTime(),
        visualX,
        visualY,
        ghostPlaced: false,
        rowHeight,
        expandUpLatched: false,
        expandDownLatched: false,
        minWeekStartMs: addDays(firstWeekStart, -7).getTime(),
        maxWeekStartMs: addDays(lastWeekStart, 7).getTime(),
        moved: false,
        otherLocked: handle === "start" ? lockedEnd : lockedStart,
        slideStartMs: rangeStart.getTime(),
        slideEndMs: rangeEnd.getTime(),
      };

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;

        if (!drag.moved) {
          if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.moved = true;
          drag.pointerX = ev.clientX;
          drag.pointerY = ev.clientY;
          lockHandle(drag.handle);
          setDraggingHandle(drag.handle);
          setDragHint({
            expandUpWeeks: 0,
            expandDownWeeks: 0,
          });
          rafRef.current = requestAnimationFrame(dragLoopRef.current);
          return;
        }

        drag.pointerX = ev.clientX;
        drag.pointerY = ev.clientY;
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        const drag = dragRef.current;
        const wasClick = Boolean(drag && !drag.moved);
        const originDayMs = drag?.originDayMs;
        finishDrag();
        if (wasClick && originDayMs != null) {
          onCalendarDaySelect(new Date(originDayMs));
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      endDay,
      endMinutes,
      finishDrag,
      lockHandle,
      lockedEnd,
      lockedStart,
      measureGrid,
      onCalendarDaySelect,
      rangeEnd,
      rangeStart,
      startDay,
      startMinutes,
    ],
  );

  useLayoutEffect(() => {
    if (!draggingHandle) return;
    const drag = dragRef.current;
    if (!drag || drag.ghostPlaced) return;
    updateGhostPosition(new Date(drag.snappedDayMs));
  }, [draggingHandle, updateGhostPosition]);

  const jumpToToday = useCallback(() => {
    const now = new Date();
    const startM = clampMinutes(minutesSinceMidnight(now));
    const endM = clampMinutes(startM + 120);
    setLockedStart(false);
    setLockedEnd(false);
    scrollFocusMsRef.current = today.getTime();
    userHasScrolledRef.current = false;
    onRangeChange(
      applyMinutesToDay(today, startM),
      applyMinutesToDay(today, endM),
    );
  }, [onRangeChange, today]);

  const visibleMonthLabel = useMemo(() => {
    const visible = weeks.slice(
      weekScrollIndex,
      weekScrollIndex + VISIBLE_WEEK_ROWS,
    );
    const first = visible[0]?.[0];
    const lastWeek = visible[visible.length - 1];
    const last = lastWeek?.[lastWeek.length - 1];
    if (!first || !last) return "";
    if (isSameMonth(first, last)) return format(first, "MMMM yyyy");
    if (first.getFullYear() === last.getFullYear()) {
      return `${format(first, "MMMM")}–${format(last, "MMMM yyyy")}`;
    }
    return `${format(first, "MMMM yyyy")}–${format(last, "MMMM yyyy")}`;
  }, [weekScrollIndex, weeks]);

  const isDayInRange = useCallback(
    (day: Date) => {
      const d = startOfDay(day).getTime();
      return d >= rangeLoDay.getTime() && d <= rangeHiDay.getTime();
    },
    [rangeHiDay, rangeLoDay],
  );

  return (
    <section
      className={cn(
        "flex min-h-0 max-h-full flex-col overflow-hidden rounded-xl border border-border bg-surface/97 p-4 shadow-lg backdrop-blur-sm",
        className,
      )}
      aria-labelledby="availability-planner-heading"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2
          id="availability-planner-heading"
          className="text-lg font-semibold text-text-primary"
        >
          Time range
        </h2>
        <button
          type="button"
          onClick={jumpToToday}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-action-primary hover:bg-surface-subtle"
        >
          Today
        </button>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 shrink-0 flex-col select-none",
          draggingHandle && "cursor-grabbing touch-none",
        )}
      >
        {weeks[0] ? (
          <>
            {visibleMonthLabel ? (
              <p
                className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                aria-live="polite"
              >
                {visibleMonthLabel}
              </p>
            ) : null}
            <div className="mb-2 grid w-full min-w-0 shrink-0 grid-cols-7 gap-1.5 px-1">
              {weeks[0].map((day) => (
                <span
                  key={day.toISOString()}
                  className={cn(
                    "text-center text-xs font-medium uppercase tracking-wide",
                    isSameDay(day, today)
                      ? "text-action-primary"
                      : "text-text-secondary",
                  )}
                >
                  {format(day, "EEE")}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <div className="flex min-h-0 min-w-0 w-full">
        <div
          ref={weeksScrollRef}
          id="availability-planner-weeks"
          tabIndex={0}
          className={cn(
            "planner-weeks-scroll min-h-0 min-w-0 w-full flex-1 outline-none focus-visible:ring-2 focus-visible:ring-action-primary/40",
            draggingHandle && "planner-weeks-scroll--frozen",
          )}
          aria-label="Calendar dates"
        >
          <div
            ref={gridRef}
            data-weeks-list
            className="relative flex w-full flex-col gap-1.5 px-1"
          >
            {draggingHandle ? (
              <div
                ref={ghostRef}
                className="planner-drag-handle pointer-events-none absolute left-0 top-0 z-30 rounded-xl border-[3px] shadow-md"
                aria-hidden="true"
                style={{
                  borderColor: "var(--text-primary)",
                  backgroundColor: "rgba(30, 77, 140, 0.18)",
                }}
              >
                {isSameDay(startDay, endDay) ? (
                  <ClockRange
                    startMinutes={startMinutes}
                    endMinutes={endMinutes}
                  />
                ) : (
                  <ClockHands
                    minutes={
                      draggingHandle === "start" ? startMinutes : endMinutes
                    }
                  />
                )}
              </div>
            ) : null}

            {weeks.map((weekDays) => {
            const weekKey = weekDays[0].toISOString();
            const segment = weekRangeSegment(weekDays, rangeLoDay, rangeHiDay);
            const isNewRow = !draggingHandle && newWeekKeys.has(weekKey);
            const enterDir = newWeekDirection.get(weekKey);

            return (
              <div key={weekKey} data-week-snap className="planner-week-snap">
              <div
                data-week-row
                className={cn(
                  "relative grid w-full min-w-0 grid-cols-7 gap-1.5",
                  isNewRow &&
                    enterDir === "up" &&
                    "planner-week-row-enter-up",
                  isNewRow &&
                    enterDir === "down" &&
                    "planner-week-row-enter-down",
                )}
              >
                {segment ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 rounded-xl bg-action-primary/30"
                    style={{
                      left: `calc(${(segment.lo / 7) * 100}% + 1px)`,
                      width: `calc(${((segment.hi - segment.lo + 1) / 7) * 100}% - 2px)`,
                    }}
                    aria-hidden="true"
                  />
                ) : null}

                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  const isStart = isSameDay(day, startDay);
                  const isEnd = isSameDay(day, endDay);
                  const inRange = isDayInRange(day);
                  const isHandle = isStart || isEnd;
                  const isDraggingThis =
                    (draggingHandle === "start" && isStart) ||
                    (draggingHandle === "end" && isEnd);
                  const clockMinutes =
                    isStart && !isEnd
                      ? startMinutes
                      : isEnd && !isStart
                        ? endMinutes
                        : null;
                  const dragHandle =
                    isStart && !isEnd ? "start" : isEnd && !isStart ? "end" : null;
                  const occupancyStatus = occupancyByDay.get(
                    startOfDay(day).toISOString(),
                  );
                  const occupancyColors = occupancyStatus
                    ? FLOOR_STATUS_COLORS[occupancyStatus]
                    : null;
                  const occupancyLabel = occupancyColors?.label;
                  const dateAction =
                    pickDateRangeHandle(
                      day,
                      rangeStart,
                      rangeEnd,
                      lockedStart,
                      lockedEnd,
                    ) === "end"
                      ? `Set end date to ${format(day, "MMMM d")}`
                      : `Set start date to ${format(day, "MMMM d")}`;

                  return (
                    <div
                      key={day.toISOString()}
                      className="relative z-[1] aspect-square min-w-0"
                    >
                      <div
                        data-day-cell
                        className="absolute inset-0"
                      >
                        {occupancyColors ? (
                          <span
                            className="pointer-events-none absolute inset-0 rounded-xl border"
                            style={{
                              backgroundColor: occupancyColors.fill,
                              borderColor: occupancyColors.stroke,
                            }}
                            aria-hidden="true"
                          />
                        ) : !inRange && !isHandle ? (
                          <span
                            className="pointer-events-none absolute inset-0 rounded-xl border border-border/60 bg-surface-subtle/70"
                            aria-hidden="true"
                          />
                        ) : null}

                        {isHandle && !isDraggingThis ? (
                          <span
                            className="pointer-events-none absolute inset-0 z-20 rounded-xl border-[3px] border-text-primary shadow-sm"
                            aria-hidden="true"
                          />
                        ) : null}

                        {isStart && isEnd && !isDraggingThis ? (
                          <ClockRange
                            startMinutes={startMinutes}
                            endMinutes={endMinutes}
                          />
                        ) : null}

                        {clockMinutes != null && !isDraggingThis ? (
                          <ClockHands minutes={clockMinutes} />
                        ) : null}

                        {!isHandle ? (
                          <button
                            type="button"
                            onClick={() => onCalendarDaySelect(day)}
                            aria-label={
                              occupancyLabel
                                ? `${dateAction}, ${occupancyLabel}`
                                : dateAction
                            }
                            className={cn(
                              "absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl font-bold",
                              inRange && "text-action-primary",
                              isToday && !inRange && "text-action-primary",
                              !inRange && !isToday && "text-text-secondary",
                            )}
                          >
                            <span className="text-sm leading-none @[20rem]:text-base @[23rem]:text-lg">
                              {format(day, "d")}
                            </span>
                          </button>
                        ) : null}

                        {isStart && isEnd && !isDraggingThis ? (
                          <>
                            <button
                              type="button"
                              aria-label="Drag to set start date"
                              onPointerDown={onHandlePointerDown("start")}
                              className="absolute -bottom-1 -left-1 -top-1 z-40 w-[calc(50%+0.25rem)] touch-none cursor-grab rounded-l-xl bg-transparent active:cursor-grabbing"
                            />
                            <button
                              type="button"
                              aria-label="Drag to set end date"
                              onPointerDown={onHandlePointerDown("end")}
                              className="absolute -bottom-1 -right-1 -top-1 z-40 w-[calc(50%+0.25rem)] touch-none cursor-grab rounded-r-xl bg-transparent active:cursor-grabbing"
                            />
                          </>
                        ) : null}
                        {dragHandle && !isDraggingThis ? (
                          <button
                            type="button"
                            aria-label={`Drag to set ${dragHandle} date`}
                            onPointerDown={onHandlePointerDown(dragHandle)}
                            className={cn(
                              "absolute -inset-1 z-40 touch-none rounded-xl bg-transparent",
                              draggingHandle === dragHandle
                                ? "cursor-grabbing"
                                : "cursor-grab",
                            )}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })}
          </div>
        </div>
        <WeekRowStepper
          weekCount={weeks.length}
          index={weekScrollIndex}
          disabled={Boolean(draggingHandle)}
          onIndexChange={applyWeekScrollIndex}
        />
        </div>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-3">
        <RangeField label="Start date">
          <PlannerDatePicker
            value={rangeStart}
            onChange={(day) => commitDate("start", day)}
            displayClassName="text-base"
          />
        </RangeField>

        <RangeField label="Start time">
          <PlannerTimePicker
            minutes={startMinutes}
            onChange={(m) => commitRange("start", startDay, m)}
            displayClassName="text-base"
          />
        </RangeField>

        <RangeField label="End date">
          <PlannerDatePicker
            value={rangeEnd}
            onChange={(day) => commitDate("end", day)}
            displayClassName="text-base"
          />
        </RangeField>

        <RangeField label="End time">
          <PlannerTimePicker
            minutes={endMinutes}
            onChange={(m) => commitRange("end", endDay, m)}
            displayClassName="text-base"
          />
        </RangeField>
      </div>
    </section>
  );
}
