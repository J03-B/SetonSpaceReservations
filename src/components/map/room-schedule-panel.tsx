"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import { addDays, addHours, format, startOfDay, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type {
  PublicAvailabilitySlot,
  PublicSpace,
} from "@/lib/domain/types";
import { minutesSinceMidnight } from "@/lib/availability/status-at-time";
import { type MapDisplayStatus } from "@/lib/map/status-colors";
import {
  ROOM_DAY_HEADER_HEIGHT,
  ROOM_SCHEDULE_VISIBLE_HOURS,
  ROOM_TIMELINE_HOUR_MAX,
  ROOM_TIMELINE_HOUR_MIN,
  ROOM_WEEK_HOUR_MAX,
  ROOM_WEEK_HOUR_MIN,
  ROOM_WEEK_VISIBLE_HOURS,
  roomTimelineHourHeight,
} from "@/components/map/map-chrome-motion";
import { parseStoredTimestamp } from "@/lib/availability/format-when";
import { cn } from "@/lib/utils";

const CALENDAR_STATUS_COLORS: Record<
  MapDisplayStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  Available: {
    bg: "rgba(34, 197, 94, 0.16)",
    border: "#16a34a",
    text: "#166534",
    label: "Open",
  },
  Pending: {
    bg: "rgba(234, 179, 8, 0.28)",
    border: "#ca8a04",
    text: "#854d0e",
    label: "Pending",
  },
  Reserved: {
    bg: "rgba(239, 68, 68, 0.22)",
    border: "#dc2626",
    text: "#991b1b",
    label: "Reserved",
  },
  Blocked: {
    bg: "rgba(107, 114, 128, 0.2)",
    border: "#4b5563",
    text: "#374151",
    label: "Blocked",
  },
  Closed: {
    bg: "rgba(156, 163, 175, 0.2)",
    border: "#9ca3af",
    text: "#4b5563",
    label: "Closed",
  },
};

const ROOM_TIMELINE_LABEL_WIDTH = 52;
const ROOM_NOW_SCROLL_OFFSET = 96;
const COMPACT_VISIBLE_DAYS = 3;
const WEEK_DAYS = 7;
const EXPAND_MS = 420;
const WEEK_CHROME_FADE_MS = 140;
const EXPAND_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EXPAND_EASE_X1 = 0.22;
const EXPAND_EASE_Y1 = 1;
const EXPAND_EASE_X2 = 0.36;
const EXPAND_EASE_Y2 = 1;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function cubicBezierPoint(p1: number, p2: number, t: number): number {
  const rest = 1 - t;
  return 3 * rest * rest * t * p1 + 3 * rest * t * t * p2 + t * t * t;
}

function cubicBezierDerivative(p1: number, p2: number, t: number): number {
  const rest = 1 - t;
  return 3 * rest * rest * p1 + 6 * rest * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

function expandEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  let guess = x;
  for (let i = 0; i < 8; i += 1) {
    const current = cubicBezierPoint(EXPAND_EASE_X1, EXPAND_EASE_X2, guess);
    const slope = cubicBezierDerivative(EXPAND_EASE_X1, EXPAND_EASE_X2, guess);
    if (Math.abs(slope) < 1e-6) break;
    guess = Math.min(1, Math.max(0, guess - (current - x) / slope));
  }
  return cubicBezierPoint(EXPAND_EASE_Y1, EXPAND_EASE_Y2, guess);
}

type ExpandPhase = "collapsed" | "opening" | "open" | "closing";

type FrameRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function formatTimelineTime(date: Date): string {
  return format(date, "h:mm a");
}

function sortDateRange(start: Date, end: Date): [Date, Date] {
  return start.getTime() <= end.getTime() ? [start, end] : [end, start];
}

function blockOverlapsRange(
  block: PublicAvailabilitySlot,
  start: Date,
  end: Date,
): boolean {
  return (
    parseStoredTimestamp(block.startAt) < end &&
    parseStoredTimestamp(block.endAt) > start
  );
}

function buildRoomCalendarDays(start: Date, end: Date): Date[] {
  const first = startOfDay(start);
  const last = startOfDay(end);
  const days: Date[] = [];
  let cursor = first;

  while (cursor <= last || days.length === 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: WEEK_DAYS }, (_, index) => addDays(start, index));
}

function buildCompactDays(start: Date): Date[] {
  const weekDays = buildWeekDays(start);
  const selectedIndex = weekDays.findIndex((day) =>
    isSameLocalDay(day, startOfDay(start)),
  );
  const startIndex =
    selectedIndex >= 0
      ? Math.min(selectedIndex, WEEK_DAYS - COMPACT_VISIBLE_DAYS)
      : 0;
  return weekDays.slice(startIndex, startIndex + COMPACT_VISIBLE_DAYS);
}

function roomDayTop(date: Date, hourHeight: number): number {
  return (minutesSinceMidnight(date) / 60) * hourHeight;
}

function offsetInDay(
  date: Date,
  dayStart: Date,
  dayEnd: Date,
  hourHeight: number,
): number {
  if (date.getTime() <= dayStart.getTime()) return 0;
  if (date.getTime() >= dayEnd.getTime()) {
    return 24 * hourHeight;
  }
  return roomDayTop(date, hourHeight);
}

function visibleSelectionCenter(
  rangeTop: number,
  rangeBottom: number,
  viewTop: number,
  viewHeight: number,
): number | null {
  if (viewHeight <= 0) return null;
  const visibleTop = Math.max(rangeTop, viewTop);
  const visibleBottom = Math.min(rangeBottom, viewTop + viewHeight);
  if (visibleBottom <= visibleTop) return null;
  return (visibleTop + visibleBottom) / 2;
}

function isTimelineScrollbarPointer(
  timeline: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const rect = timeline.getBoundingClientRect();
  return (
    clientX >= rect.left + timeline.clientWidth ||
    clientY >= rect.top + timeline.clientHeight
  );
}

function panTimelineBy(timeline: HTMLElement, dx: number, dy: number) {
  const maxLeft = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
  const maxTop = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
  timeline.scrollLeft = Math.min(
    maxLeft,
    Math.max(0, timeline.scrollLeft - dx),
  );
  timeline.scrollTop = Math.min(
    maxTop,
    Math.max(0, timeline.scrollTop - dy),
  );
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function clampDateToRange(date: Date, start: Date, end: Date): Date {
  const time = Math.max(
    start.getTime(),
    Math.min(end.getTime(), date.getTime()),
  );
  return new Date(time);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function frameFromElement(element: HTMLElement): FrameRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function getExpandedFrame(): FrameRect {
  const marginX = Math.max(24, window.innerWidth * 0.04);
  const marginY = Math.max(24, window.innerHeight * 0.05);
  const width = Math.min(window.innerWidth - marginX * 2, 1120);
  const height = Math.min(window.innerHeight - marginY * 2, 860);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

function CurrentSelectionLabel({
  selectedTop,
  selectedHeight,
  viewTop,
  viewHeight,
}: {
  selectedTop: number;
  selectedHeight: number;
  viewTop: number;
  viewHeight: number;
}) {
  const center = visibleSelectionCenter(
    selectedTop,
    selectedTop + selectedHeight,
    viewTop,
    viewHeight,
  );
  if (center == null) return null;

  return (
    <div
      className="pointer-events-none absolute left-1 right-1 z-[25] flex justify-center px-1"
      style={{
        top: center,
        transform: "translateY(-50%)",
      }}
    >
      <span className="rounded-sm bg-action-primary px-1.5 py-0.5 text-center text-xs font-semibold leading-4 text-white shadow-sm">
        <span className="block">Selected</span>
        <span className="block">Time</span>
      </span>
    </div>
  );
}

function ExpandIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M8 3H3v5M16 3h5v5M16 21h5v-5M8 21H3v-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({
  className,
  direction,
}: {
  className?: string;
  direction: "left" | "right";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d={direction === "left" ? "M15 5L8 12l7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function hourMarkOpacity(
  hour: number,
  hourHeight: number,
  viewTop: number,
  shownHours: number,
): number {
  const hoursFromTop = (hour * hourHeight - viewTop) / Math.max(hourHeight, 1);
  const fadeStart = Math.max(0, shownHours - 0.85);
  if (hoursFromTop <= fadeStart) return 1;
  if (hoursFromTop >= shownHours) return 0;
  return 1 - (hoursFromTop - fadeStart) / (shownHours - fadeStart);
}

function RoomTimeline({
  space,
  slots,
  days,
  rangeStart,
  rangeEnd,
  visibleHours,
  hourMin,
  hourMax,
  visibleSpan,
  animateColumns = false,
  columnPhase = "idle",
  pinDay = null,
}: {
  space: PublicSpace;
  slots: PublicAvailabilitySlot[];
  days: Date[];
  rangeStart: Date;
  rangeEnd: Date;
  visibleHours: number;
  hourMin: number;
  hourMax: number;
  visibleSpan?: number;
  animateColumns?: boolean;
  columnPhase?: "idle" | "opening" | "closing";
  pinDay?: Date | null;
}) {
  const [now] = useState(() => new Date());
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const [timelineView, setTimelineView] = useState({
    top: 0,
    height: 0,
  });
  const [viewportHeight, setViewportHeight] = useState(0);
  const hourHeight = roomTimelineHourHeight(
    viewportHeight,
    visibleHours,
    hourMin,
    hourMax,
  );
  const [selectedStart, rawSelectedEnd] = sortDateRange(rangeStart, rangeEnd);
  const selectedEnd =
    rawSelectedEnd.getTime() > selectedStart.getTime()
      ? rawSelectedEnd
      : new Date(selectedStart.getTime() + 30 * 60000);
  const calendarStart = days[0] ?? startOfDay(selectedStart);
  const calendarEnd = addDays(days[days.length - 1] ?? calendarStart, 1);
  const timelineHeight = 24 * hourHeight;
  const todayIndex = days.findIndex((day) => isSameLocalDay(day, now));
  const span = Math.max(1, visibleSpan ?? days.length);
  const pinIndex = pinDay
    ? Math.max(
        0,
        days.findIndex((day) => isSameLocalDay(day, pinDay)),
      )
    : 0;
  const daysTrackWidth = `calc((100% - ${ROOM_TIMELINE_LABEL_WIDTH}px) * ${days.length} / ${span} + ${ROOM_TIMELINE_LABEL_WIDTH}px)`;
  const dayGridTemplateColumns = `repeat(${days.length}, minmax(0, 1fr))`;
  const trackTransition = animateColumns
    ? `width ${EXPAND_MS}ms ${EXPAND_EASE}`
    : undefined;
  const scrollAnchor =
    todayIndex >= 0
      ? now
      : clampDateToRange(selectedStart, calendarStart, calendarEnd);
  const scrollAnchorTop = roomDayTop(scrollAnchor, hourHeight);
  const visibleBlocks = slots.filter(
    (block) =>
      block.spaceId === space.id &&
      blockOverlapsRange(block, calendarStart, calendarEnd),
  );
  const hourTicks = Array.from({ length: 24 }, (_, index) => index);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const measure = () => {
      setViewportHeight(
        Math.max(0, timeline.clientHeight - ROOM_DAY_HEADER_HEIGHT),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [space.id, days.length]);

  const onPanPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      const timeline = timelineScrollRef.current;
      if (!timeline) return;
      if (
        event.currentTarget === timeline &&
        isTimelineScrollbarPointer(timeline, event.clientX, event.clientY)
      ) {
        return;
      }
      event.preventDefault();
      panRef.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning(true);
    },
    [],
  );

  const onPanPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const pan = panRef.current;
    const timeline = timelineScrollRef.current;
    if (!pan || pan.pointerId !== event.pointerId || !timeline) return;
    const dx = event.clientX - pan.lastX;
    const dy = event.clientY - pan.lastY;
    pan.lastX = event.clientX;
    pan.lastY = event.clientY;
    panTimelineBy(timeline, dx, dy);
  }, []);

  const onPanPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPanning(false);
  }, []);

  const syncTimelineView = useCallback(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const top = timeline.scrollTop;
    const height = Math.max(0, timeline.clientHeight - ROOM_DAY_HEADER_HEIGHT);
    setTimelineView((prev) =>
      prev.top === top && prev.height === height ? prev : { top, height },
    );
  }, []);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const maxScroll = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
    const visibleDays = Math.min(span, Math.max(days.length, 1));
    const dayWidth =
      (timeline.clientWidth - ROOM_TIMELINE_LABEL_WIDTH) / visibleDays;
    const todayIsOffscreen = todayIndex >= visibleDays && dayWidth > 0;
    timeline.scrollTo({
      top: Math.max(
        0,
        Math.min(maxScroll, scrollAnchorTop - ROOM_NOW_SCROLL_OFFSET),
      ),
      left: animateColumns
        ? timeline.scrollLeft
        : todayIsOffscreen
          ? Math.min(
              Math.max(0, timeline.scrollWidth - timeline.clientWidth),
              todayIndex * dayWidth,
            )
          : 0,
      behavior: "auto",
    });
    syncTimelineView();
  }, [
    animateColumns,
    days.length,
    rangeStart,
    rangeEnd,
    scrollAnchorTop,
    space.id,
    span,
    syncTimelineView,
    todayIndex,
  ]);

  useEffect(() => {
    if (!animateColumns || columnPhase === "idle") return;
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const dayArea = Math.max(
      0,
      timeline.clientWidth - ROOM_TIMELINE_LABEL_WIDTH,
    );
    const fromSpan =
      columnPhase === "opening" ? COMPACT_VISIBLE_DAYS : WEEK_DAYS;
    const toSpan = columnPhase === "opening" ? WEEK_DAYS : COMPACT_VISIBLE_DAYS;
    const fromScroll =
      fromSpan < days.length ? pinIndex * (dayArea / fromSpan) : 0;
    const toScroll = toSpan < days.length ? pinIndex * (dayArea / toSpan) : 0;
    const started = performance.now();
    let frame = 0;
    const easeOut = (t: number) => 1 - (1 - t) ** 3;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / EXPAND_MS);
      timeline.scrollLeft = fromScroll + (toScroll - fromScroll) * easeOut(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animateColumns, columnPhase, days.length, pinIndex]);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    syncTimelineView();
    const observer = new ResizeObserver(syncTimelineView);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [syncTimelineView]);

  const panClassName = cn(
    "select-none",
    panning ? "cursor-grabbing" : "cursor-grab",
  );

  return (
    <div
      ref={timelineScrollRef}
      onScroll={syncTimelineView}
      onPointerDown={onPanPointerDown}
      onPointerMove={onPanPointerMove}
      onPointerUp={onPanPointerUp}
      onPointerCancel={onPanPointerUp}
      onLostPointerCapture={onPanPointerUp}
      className={cn(
        "room-timeline-scroll relative min-h-0 min-w-0 flex-1 overscroll-contain",
        animateColumns ? "overflow-x-hidden overflow-y-auto" : "overflow-auto",
        panClassName,
      )}
      role="img"
      aria-label={`Scrollable calendar for ${space.name} from ${formatTimelineTime(
        selectedStart,
      )} to ${formatTimelineTime(selectedEnd)}. Drag to pan.`}
    >
      <div
        className="relative"
        style={{
          width: daysTrackWidth,
          minWidth: "100%",
          height: ROOM_DAY_HEADER_HEIGHT + timelineHeight,
          transition: trackTransition,
        }}
      >
        <div
          className="sticky top-0 z-40 flex bg-surface"
          style={{ height: ROOM_DAY_HEADER_HEIGHT }}
        >
          <div
            className="sticky left-0 z-50 shrink-0 border-b border-r border-border bg-surface"
            style={{ width: ROOM_TIMELINE_LABEL_WIDTH }}
            aria-hidden="true"
          />
          <div
            className="grid min-w-0 flex-1 border-b border-border"
            style={{ gridTemplateColumns: dayGridTemplateColumns }}
          >
            {days.map((day) => {
              const isToday = isSameLocalDay(day, now);
              return (
                <div
                  key={day.toISOString()}
                  className="flex min-w-0 flex-col items-center justify-center border-r border-border last:border-r-0"
                >
                  <span className="text-[11px] font-medium uppercase leading-none tracking-wide text-text-secondary">
                    {formatInTimeZone(day, space.timezone, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "mt-1 flex size-7 items-center justify-center text-sm font-semibold leading-none",
                      isToday
                        ? "rounded-full bg-action-primary text-white"
                        : "text-text-primary",
                    )}
                  >
                    {formatInTimeZone(day, space.timezone, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-border bg-surface"
            style={{ width: ROOM_TIMELINE_LABEL_WIDTH, height: timelineHeight }}
            aria-hidden="true"
          >
            <div className="relative" style={{ height: timelineHeight }}>
              {hourTicks.map((hour) => {
                const tick = addHours(startOfDay(calendarStart), hour);
                const markOpacity = hourMarkOpacity(
                  hour,
                  hourHeight,
                  timelineView.top,
                  visibleHours,
                );
                return (
                  <span
                    key={hour}
                    className="absolute right-1.5 -translate-y-1/2 text-[11px] font-medium tabular-nums text-text-secondary"
                    style={{
                      top: hour * hourHeight,
                      opacity: markOpacity,
                    }}
                  >
                    {formatInTimeZone(tick, space.timezone, "h a")}
                  </span>
                );
              })}
            </div>
          </div>

          <div
            className="relative min-w-0 flex-1 grid"
            style={{
              height: timelineHeight,
              gridTemplateColumns: dayGridTemplateColumns,
            }}
          >
            {hourTicks.map((hour) =>
              hour > 0 ? (
                <div
                  key={hour}
                  className="pointer-events-none absolute left-0 right-0 border-t border-border/65"
                  style={{
                    top: hour * hourHeight,
                    opacity: hourMarkOpacity(
                      hour,
                      hourHeight,
                      timelineView.top,
                      visibleHours,
                    ),
                  }}
                />
              ) : null,
            )}

            {days.map((day, dayIndex) => {
              const dayStart = startOfDay(day);
              const dayEnd = addDays(dayStart, 1);
              const hasSelectedRange =
                selectedStart < dayEnd && selectedEnd > dayStart;
              const selectedTop = offsetInDay(
                selectedStart,
                dayStart,
                dayEnd,
                hourHeight,
              );
              const selectedBottom = offsetInDay(
                selectedEnd,
                dayStart,
                dayEnd,
                hourHeight,
              );
              const selectedHeight = Math.max(
                selectedBottom - selectedTop,
                32,
              );
              const dayBlocks = visibleBlocks.filter((block) =>
                blockOverlapsRange(block, dayStart, dayEnd),
              );
              const showNowForDay = todayIndex === dayIndex;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative min-w-0 border-r border-border last:border-r-0",
                    showNowForDay && "bg-action-primary/5",
                  )}
                >
                  {hasSelectedRange ? (
                    <>
                      <div
                        className="absolute left-1 right-1 z-10 rounded-md border-2 border-action-primary/55 bg-action-primary/25"
                        style={{
                          top: selectedTop,
                          height: selectedHeight,
                        }}
                        aria-hidden="true"
                      />
                      <CurrentSelectionLabel
                        selectedTop={selectedTop}
                        selectedHeight={selectedHeight}
                        viewTop={timelineView.top}
                        viewHeight={timelineView.height}
                      />
                    </>
                  ) : null}

                  {dayBlocks.map((block) => {
                    const start = parseStoredTimestamp(block.startAt);
                    const end = parseStoredTimestamp(block.endAt);
                    const top = offsetInDay(
                      start,
                      dayStart,
                      dayEnd,
                      hourHeight,
                    );
                    const bottom = offsetInDay(
                      end,
                      dayStart,
                      dayEnd,
                      hourHeight,
                    );
                    const status = block.publicStatus as MapDisplayStatus;
                    const colors =
                      CALENDAR_STATUS_COLORS[status] ??
                      CALENDAR_STATUS_COLORS.Reserved;
                    const pending = block.publicStatus === "Pending";

                    return (
                      <div
                        key={`${day.toISOString()}-${block.startAt}-${block.endAt}-${block.publicStatus}-${block.requestUpdatedAt ?? ""}`}
                        className={cn(
                          "absolute left-1 right-1 z-20 overflow-hidden rounded-md border px-1.5 py-1 text-xs shadow-sm",
                          pending && "border-dashed",
                        )}
                        style={{
                          top,
                          height: Math.max(bottom - top, 24),
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <p
                          className="truncate font-semibold"
                          style={{ color: colors.text }}
                        >
                          {colors.label}
                        </p>
                        <p className="truncate text-[11px] text-text-secondary">
                          {formatTimelineTime(start)}-{formatTimelineTime(end)}
                        </p>
                      </div>
                    );
                  })}

                  {showNowForDay ? (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
                      style={{
                        top: roomDayTop(now, hourHeight),
                        transform: "translateY(-50%)",
                      }}
                      aria-hidden="true"
                    >
                      <div className="absolute inset-x-0 h-0.5 bg-red-600" />
                      <span className="relative rounded-sm bg-red-600 px-1.5 text-[11px] font-semibold leading-4 text-white shadow-sm">
                        Now
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCardChrome({
  space,
  weekLabel,
  expanded,
  onExpand,
  onCollapse,
  onPrevWeek,
  onNextWeek,
  weekNavEnabled = true,
  weekChromeOpacity = 1,
  iconProgress = expanded ? 1 : 0,
  expandButtonRef,
  closeButtonRef,
  children,
}: {
  space: PublicSpace;
  weekLabel?: string;
  expanded: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  weekNavEnabled?: boolean;
  weekChromeOpacity?: number;
  iconProgress?: number;
  expandButtonRef?: Ref<HTMLButtonElement>;
  closeButtonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  const closeWeight = Math.min(1, Math.max(0, iconProgress));
  const isCloseControl = closeWeight > 0.5;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-surface/97 shadow-lg backdrop-blur-sm">
      <div
        className={cn(
          "relative flex shrink-0 gap-3 p-4 pb-2",
          expanded ? "items-center" : "items-start",
        )}
      >
        <div className="shrink-0">
          {space.building ? (
            <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-text-secondary">
              {space.building}
            </p>
          ) : null}
          <h2
            id={expanded ? "room-week-title" : "room-schedule-title"}
            className="mt-0.5 whitespace-nowrap text-lg font-semibold leading-tight text-text-primary"
          >
            {space.name}
          </h2>
        </div>
        {weekLabel ? (
          <div
            className="pointer-events-none absolute inset-x-14 top-4 flex h-9 items-center justify-center motion-reduce:transition-none"
            style={{
              opacity: weekChromeOpacity,
              transition: `opacity ${WEEK_CHROME_FADE_MS}ms ${EXPAND_EASE}`,
            }}
            aria-hidden={weekChromeOpacity < 0.08}
          >
            <div
              className={cn(
                "flex h-9 items-center gap-0.5",
                weekChromeOpacity > 0.08 && "pointer-events-auto",
              )}
            >
              {onPrevWeek ? (
                <button
                  type="button"
                  onClick={onPrevWeek}
                  disabled={!weekNavEnabled}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-primary hover:bg-surface-subtle disabled:pointer-events-none"
                  aria-label="Previous week"
                  tabIndex={weekNavEnabled ? 0 : -1}
                >
                  <ChevronIcon className="size-4" direction="left" />
                </button>
              ) : null}
              <p className="whitespace-nowrap px-1 text-base font-medium text-text-primary">
                {weekLabel}
              </p>
              {onNextWeek ? (
                <button
                  type="button"
                  onClick={onNextWeek}
                  disabled={!weekNavEnabled}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-primary hover:bg-surface-subtle disabled:pointer-events-none"
                  aria-label="Next week"
                  tabIndex={weekNavEnabled ? 0 : -1}
                >
                  <ChevronIcon className="size-4" direction="right" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {expanded ? (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCollapse}
            className="relative ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle"
            aria-label={isCloseControl ? "Close week view" : "Expand week view"}
          >
            <span className="relative size-4">
              <CloseIcon
                className="absolute inset-0 size-4"
                style={{ opacity: closeWeight }}
              />
              <ExpandIcon
                className="absolute inset-0 size-4"
                style={{ opacity: 1 - closeWeight }}
              />
            </span>
          </button>
        ) : (
          <button
            ref={expandButtonRef}
            type="button"
            onClick={onExpand}
            className="relative ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle"
            aria-label="Expand week view"
            aria-expanded={false}
          >
            <ExpandIcon className="size-4 shrink-0" />
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{children}</div>
    </div>
  );
}

export function RoomSchedulePanel({
  space,
  slots,
  rangeStart,
  rangeEnd,
}: {
  space: PublicSpace;
  slots: PublicAvailabilitySlot[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const compactRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<ExpandPhase>("collapsed");
  const [origin, setOrigin] = useState<FrameRect | null>(null);
  const [frame, setFrame] = useState<FrameRect | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(rangeStart, { weekStartsOn: 0 }),
  );
  const [visibleSpan, setVisibleSpan] = useState(COMPACT_VISIBLE_DAYS);
  const [expandProgress, setExpandProgress] = useState(0);
  const phaseRef = useRef<ExpandPhase>("collapsed");
  phaseRef.current = phase;

  const [selectedStart] = sortDateRange(rangeStart, rangeEnd);
  const compactDays = buildCompactDays(selectedStart);
  const weekDays = buildWeekDays(weekAnchor);
  const weekStart = weekDays[0] ?? startOfDay(weekAnchor);
  const weekEnd = weekDays[6] ?? weekStart;
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  const expanded = phase !== "collapsed";
  const animating = phase === "opening" || phase === "closing";
  const pinDay = compactDays[0] ?? selectedStart;

  useEffect(() => {
    setMounted(true);
  }, []);

  const openExpand = useCallback(() => {
    const card = compactRef.current;
    if (!card) return;
    const nextOrigin = frameFromElement(card);
    setWeekAnchor(startOfWeek(selectedStart, { weekStartsOn: 0 }));
    setVisibleSpan(COMPACT_VISIBLE_DAYS);
    setOrigin(nextOrigin);
    setFrame(nextOrigin);
    setPhase("opening");
    restoreFocusRef.current = true;
  }, [selectedStart]);

  const closeExpand = useCallback(() => {
    if (phaseRef.current === "collapsed" || phaseRef.current === "closing") {
      return;
    }
    const card = compactRef.current;
    if (!card) {
      setPhase("collapsed");
      setVisibleSpan(COMPACT_VISIBLE_DAYS);
      return;
    }
    setOrigin(frameFromElement(card));
    if (prefersReducedMotion()) {
      setPhase("collapsed");
      setFrame(null);
      setVisibleSpan(COMPACT_VISIBLE_DAYS);
      return;
    }
    setVisibleSpan(COMPACT_VISIBLE_DAYS);
    setPhase("closing");
    setFrame(frameFromElement(card));
  }, []);

  useLayoutEffect(() => {
    if (phase !== "opening") return;
    if (prefersReducedMotion()) {
      setFrame(getExpandedFrame());
      setVisibleSpan(WEEK_DAYS);
      setPhase("open");
      return;
    }
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setFrame(getExpandedFrame());
        setVisibleSpan(WEEK_DAYS);
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "open") return;
    const onResize = () => setFrame(getExpandedFrame());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeExpand();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeExpand, expanded]);

  useEffect(() => {
    if (phase === "open") {
      closeButtonRef.current?.focus();
    }
    if (phase === "collapsed" && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      expandButtonRef.current?.focus();
    }
  }, [phase]);

  const finishPhase = useCallback((current: ExpandPhase) => {
    if (current === "opening") setPhase("open");
    if (current === "closing") {
      setPhase("collapsed");
      setFrame(null);
      setVisibleSpan(COMPACT_VISIBLE_DAYS);
    }
  }, []);

  const handleFlyTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "width" && event.propertyName !== "top") {
        return;
      }
      finishPhase(phase);
    },
    [finishPhase, phase],
  );

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return;
    const timer = window.setTimeout(() => finishPhase(phase), EXPAND_MS + 80);
    return () => window.clearTimeout(timer);
  }, [finishPhase, phase]);

  useEffect(() => {
    if (phase === "open") {
      setExpandProgress(1);
      return;
    }
    if (phase === "collapsed") {
      setExpandProgress(0);
      return;
    }
    if (phase !== "opening" && phase !== "closing") return;
    if (prefersReducedMotion()) {
      setExpandProgress(phase === "opening" ? 1 : 0);
      return;
    }
    const from = phase === "opening" ? 0 : 1;
    const to = phase === "opening" ? 1 : 0;
    setExpandProgress(from);
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / EXPAND_MS);
      setExpandProgress(from + (to - from) * expandEase(t));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const goPrevWeek = useCallback(() => {
    setWeekAnchor((current) => addDays(current, -7));
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekAnchor((current) => addDays(current, 7));
  }, []);

  const flyStyle: CSSProperties | undefined = frame
    ? {
        top: frame.top,
        left: frame.left,
        width: frame.width,
        height: frame.height,
        transitionProperty: animating ? "top, left, width, height" : "none",
        transitionDuration: animating ? `${EXPAND_MS}ms` : "0ms",
        transitionTimingFunction: EXPAND_EASE,
      }
    : undefined;

  const timelineProps = {
    space,
    slots,
    rangeStart,
    rangeEnd,
  };

  return (
    <>
      <div
        ref={compactRef}
        className={cn("h-full min-h-0 w-full", expanded && "invisible")}
        aria-hidden={expanded}
      >
        <ScheduleCardChrome
          space={space}
          expanded={false}
          onExpand={openExpand}
          expandButtonRef={expandButtonRef}
        >
          <RoomTimeline
            {...timelineProps}
            days={compactDays}
            visibleHours={ROOM_SCHEDULE_VISIBLE_HOURS}
            hourMin={ROOM_TIMELINE_HOUR_MIN}
            hourMax={ROOM_TIMELINE_HOUR_MAX}
            visibleSpan={COMPACT_VISIBLE_DAYS}
          />
        </ScheduleCardChrome>
      </div>

      {mounted && expanded && frame && origin
        ? createPortal(
            <div className="fixed inset-0 z-[70]">
              <button
                type="button"
                className="absolute inset-0 z-0 bg-black/40 motion-reduce:transition-none"
                style={{
                  opacity: phase === "closing" ? 0 : 1,
                  transition: `opacity ${EXPAND_MS}ms ${EXPAND_EASE}`,
                }}
                aria-label="Close week view"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  closeExpand();
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="room-week-title"
                className="fixed z-10 overflow-hidden motion-reduce:transition-none"
                style={flyStyle}
                onTransitionEnd={handleFlyTransitionEnd}
              >
                <ScheduleCardChrome
                  space={space}
                  weekLabel={weekLabel}
                  expanded
                  onCollapse={closeExpand}
                  onPrevWeek={goPrevWeek}
                  onNextWeek={goNextWeek}
                  weekNavEnabled={phase === "open"}
                  weekChromeOpacity={phase === "closing" ? 0 : 1}
                  iconProgress={expandProgress}
                  closeButtonRef={closeButtonRef}
                >
                  <RoomTimeline
                    {...timelineProps}
                    days={weekDays}
                    visibleHours={lerp(
                      ROOM_SCHEDULE_VISIBLE_HOURS,
                      ROOM_WEEK_VISIBLE_HOURS,
                      expandProgress,
                    )}
                    hourMin={lerp(
                      ROOM_TIMELINE_HOUR_MIN,
                      ROOM_WEEK_HOUR_MIN,
                      expandProgress,
                    )}
                    hourMax={lerp(
                      ROOM_TIMELINE_HOUR_MAX,
                      ROOM_WEEK_HOUR_MAX,
                      expandProgress,
                    )}
                    visibleSpan={visibleSpan}
                    animateColumns={animating}
                    columnPhase={
                      phase === "opening" || phase === "closing"
                        ? phase
                        : "idle"
                    }
                    pinDay={pinDay}
                  />
                </ScheduleCardChrome>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
