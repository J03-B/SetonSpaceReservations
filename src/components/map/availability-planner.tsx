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
  Fragment,
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

const VISIBLE_RADIUS = 3;
const DRAG_THRESHOLD_PX = 3;
const VISIBLE_WEEK_ROWS = 4;
const MAX_WEEK_ROWS = 16;
const POINTER_BLEND = 0.22;
const EXPAND_BEYOND_PX = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    const firstDay = addDays(lo, -VISIBLE_RADIUS);
    const lastDay = addDays(hi, VISIBLE_RADIUS);
    firstWeekStart = startOfWeek(firstDay, { weekStartsOn: 0 });
    lastWeekStart = startOfWeek(lastDay, { weekStartsOn: 0 });
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

function MonthBanner({ month }: { month: Date }) {
  return (
    <div
      className="flex items-center gap-2 py-1"
      aria-label={format(month, "MMMM yyyy")}
    >
      <span className="h-px min-w-3 flex-1 bg-border" />
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {format(month, "MMMM yyyy")}
      </span>
      <span className="h-px min-w-3 flex-1 bg-border" />
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <div className="rounded-lg border border-border bg-surface-subtle px-3.5 py-3">
        {children}
      </div>
    </div>
  );
}

export function AvailabilityPlanner({
  rangeStart,
  rangeEnd,
  onRangeChange,
  className,
}: AvailabilityPlannerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [draggingHandle, setDraggingHandle] = useState<DragHandle | null>(null);
  const [dragHint, setDragHint] = useState<DragViewportHint | null>(null);
  const [lockedStart, setLockedStart] = useState(false);
  const [lockedEnd, setLockedEnd] = useState(false);
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

  const dragFreezeRef = useRef<FrozenWeekWindow | null>(null);

  const weeks = useMemo(
    () =>
      computeCalendarWeeks(
        rangeStart,
        rangeEnd,
        draggingHandle ? dragHint : null,
        draggingHandle ? dragFreezeRef.current : null,
      ),
    [rangeStart, rangeEnd, draggingHandle, dragHint],
  );

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

  useLayoutEffect(() => {
    const scroll = weeksScrollRef.current;
    if (!scroll) return;

    const applyMaxHeight = () => {
      const list = scroll.querySelector<HTMLElement>("[data-weeks-list]");
      const rows = list?.querySelectorAll<HTMLElement>("[data-week-row]");
      if (!list || !rows?.length) return;

      if (weeks.length <= VISIBLE_WEEK_ROWS) {
        scroll.style.maxHeight = "";
        return;
      }

      const lastVisible = rows[VISIBLE_WEEK_ROWS - 1] ?? rows[rows.length - 1];
      scroll.style.maxHeight = `${
        lastVisible.offsetTop + lastVisible.offsetHeight
      }px`;
    };

    applyMaxHeight();
    const frame = requestAnimationFrame(applyMaxHeight);
    const observer = new ResizeObserver(applyMaxHeight);
    observer.observe(scroll);
    const list = scroll.querySelector("[data-weeks-list]");
    if (list) observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [weeks.length]);

  useLayoutEffect(() => {
    if (!draggingHandle) return;
    const drag = dragRef.current;
    const scroll = weeksScrollRef.current;
    const grid = gridRef.current;
    if (!drag || !scroll || !grid) return;

    const rows = grid.querySelectorAll<HTMLElement>("[data-week-row]");
    const last = rows[rows.length - 1];
    if (!last) return;

    if (drag.expandDownLatched) {
      scroll.scrollTop = Math.max(
        0,
        last.offsetTop + last.offsetHeight - scroll.clientHeight,
      );
    } else if (drag.expandUpLatched) {
      scroll.scrollTop = 0;
    }
  }, [draggingHandle, dragHint, weeks.length]);

  useLayoutEffect(() => {
    if (draggingHandle) return;
    const scroll = weeksScrollRef.current;
    const grid = gridRef.current;
    if (!scroll || !grid || weeks.length <= VISIBLE_WEEK_ROWS) return;

    const targetMs = scrollFocusMsRef.current;
    if (targetMs == null) return;
    scrollFocusMsRef.current = null;

    const rows = Array.from(grid.querySelectorAll<HTMLElement>("[data-week-row]"));
    const rowIndex = weeks.findIndex((weekDays) =>
      weekDays.some((day) => startOfDay(day).getTime() === targetMs),
    );
    const row = rows[rowIndex];
    if (!row) return;

    const scrollRect = scroll.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < scrollRect.top) {
      scroll.scrollTop -= scrollRect.top - rowRect.top;
    } else if (rowRect.bottom > scrollRect.bottom) {
      scroll.scrollTop += rowRect.bottom - scrollRect.bottom;
    }
  }, [draggingHandle, weeks]);

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
    dragFreezeRef.current = null;
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
      dragFreezeRef.current = {
        firstWeekStartMs: firstWeekStart.getTime(),
        lastWeekStartMs: lastWeekStart.getTime(),
      };
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
    onRangeChange(
      applyMinutesToDay(today, startM),
      applyMinutesToDay(today, endM),
    );
  }, [onRangeChange, today]);

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
        "flex min-h-0 flex-col rounded-xl border border-border bg-surface/97 p-5 shadow-lg backdrop-blur-sm",
        className,
      )}
      aria-labelledby="availability-planner-heading"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          id="availability-planner-heading"
          className="text-xl font-semibold text-text-primary"
        >
          Time range
        </h2>
        <button
          type="button"
          onClick={jumpToToday}
          className="shrink-0 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-action-primary hover:bg-surface-subtle"
        >
          Today
        </button>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col select-none touch-none",
          draggingHandle && "cursor-grabbing",
        )}
      >
        {weeks[0] ? (
          <div className="mb-2 grid w-full min-w-0 grid-cols-7 gap-1.5 px-1">
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
        ) : null}

        <div
          ref={weeksScrollRef}
          className="planner-weeks-scroll min-h-0 min-w-0 w-full"
          aria-label="Calendar dates"
        >
          <div
            ref={gridRef}
            data-weeks-list
            className="relative flex w-full min-w-0 flex-col gap-1.5 p-1"
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
                      dragRef.current?.originMinutes ??
                      (draggingHandle === "start" ? startMinutes : endMinutes)
                    }
                  />
                )}
              </div>
            ) : null}

            {weeks.map((weekDays, weekIndex) => {
            const weekKey = weekDays[0].toISOString();
            const segment = weekRangeSegment(weekDays, rangeLoDay, rangeHiDay);
            const isNewRow = !draggingHandle && newWeekKeys.has(weekKey);
            const enterDir = newWeekDirection.get(weekKey);
            const previousSunday = weeks[weekIndex - 1]?.[0];
            const showMonthBanner =
              weekIndex === 0 ||
              (previousSunday != null &&
                !isSameMonth(weekDays[0], previousSunday));

            return (
              <Fragment key={weekKey}>
                {showMonthBanner ? <MonthBanner month={weekDays[0]} /> : null}
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
                  const isMidWeekMonthStart =
                    day.getDate() === 1 && day.getDay() !== 0;

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "relative z-[1] min-w-0",
                        isMidWeekMonthStart &&
                          "border-l-2 border-border-strong pl-0.5",
                      )}
                    >
                      <div
                        data-day-cell
                        className="relative aspect-square w-full"
                      >
                        {!inRange && !isHandle ? (
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
                              pickDateRangeHandle(
                                day,
                                rangeStart,
                                rangeEnd,
                                lockedStart,
                                lockedEnd,
                              ) ===
                              "end"
                                ? `Set end date to ${format(day, "MMMM d")}`
                                : `Set start date to ${format(day, "MMMM d")}`
                            }
                            className={cn(
                              "absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl font-bold",
                              inRange && "text-action-primary",
                              isToday && !inRange && "text-action-primary",
                              !inRange && !isToday && "text-text-secondary",
                            )}
                          >
                            {isMidWeekMonthStart && !inRange ? (
                              <span className="text-[0.55rem] font-semibold uppercase leading-none tracking-wide">
                                {format(day, "MMM")}
                              </span>
                            ) : null}
                            <span className="text-lg leading-none">
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
              </Fragment>
            );
          })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid shrink-0 grid-cols-2 gap-4">
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
