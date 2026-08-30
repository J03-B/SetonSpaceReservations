"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type {
  PublicAvailabilitySlot,
  PublicSpace,
} from "@/lib/domain/types";
import {
  getFutureBlocksForSpace,
  getBlocksForDay,
  minuteToTimelinePercent,
  minutesSinceMidnight,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from "@/lib/availability/status-at-time";
import {
  MAP_STATUS_COLORS,
  type MapDisplayStatus,
} from "@/lib/map/status-colors";
import { MapNavigator } from "./map-navigator";
import { AvailabilityPlanner } from "./availability-planner";
import { MapStatusLegend } from "./map-status-legend";
import {
  MapNavigationBar,
  type MapNavigationActions,
  type MapNavigationMeta,
} from "./map-navigation-bar";
import { FloorSwitcher } from "./floor-switcher";
import { ROOT_MAP_ID } from "@/lib/map/map-config";
import { StatusBadge } from "@/components/ui/status-badge";
import { useChromeSlideVisible } from "@/hooks/use-chrome-slide-visible";
import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  chromeTargetShown,
  MAP_FLOOR_INSET,
  MAP_PLANNER_COLUMN_WIDTH_CLASS,
} from "@/components/map/map-chrome-motion";
import { cn } from "@/lib/utils";
import { submitReservationRequestAction } from "@/lib/auth/reservation-actions";
import { snapDateToPlannerSlot } from "@/lib/availability/range-time";
import { parseStoredTimestamp } from "@/lib/availability/format-when";
import { DEFAULT_TIMEZONE } from "@/lib/domain/statuses";

interface MapWorkspaceProps {
  spaces: PublicSpace[];
  slots: PublicAvailabilitySlot[];
  isSignedIn?: boolean;
  canRequest?: boolean;
  isManager?: boolean;
  initialSelectedSlug?: string;
  initialMapId?: string;
  campusEditMode?: boolean;
  buildingEditMode?: string | null;
}

function formatTimelineTime(date: Date): string {
  return format(date, "h:mm a");
}

function formatFullDate(date: Date): string {
  return format(date, "MMMM d, yyyy");
}

function DayTimeline({
  spaceId,
  slots,
  viewDate,
  nowLineAt,
  timezone,
}: {
  spaceId: string;
  slots: PublicAvailabilitySlot[];
  viewDate: Date;
  nowLineAt: Date;
  timezone: string;
}) {
  const dayBlocks = getBlocksForDay(slots, spaceId, viewDate);
  const nowPercent = minuteToTimelinePercent(minutesSinceMidnight(nowLineAt));

  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
    (_, i) => TIMELINE_START_HOUR + i,
  );

  return (
    <div className="relative flex gap-3">
      <div
        className="flex w-14 shrink-0 flex-col text-xs text-text-secondary"
        aria-hidden="true"
      >
        {hours.map((h) => (
          <div
            key={h}
            className="relative"
            style={{ height: `${100 / hours.length}%`, minHeight: 48 }}
          >
            <span className="absolute -top-2 right-1">
              {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
            </span>
          </div>
        ))}
      </div>

      <div
        className="relative min-h-[480px] flex-1 rounded-lg border border-border bg-surface-subtle"
        role="img"
        aria-label={`Schedule for ${formatFullDate(viewDate)}`}
      >
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: `${(i / (hours.length - 1)) * 100}%` }}
          />
        ))}

        {dayBlocks.map((block) => {
          const start = parseStoredTimestamp(block.startAt);
          const end = parseStoredTimestamp(block.endAt);
          const top = minuteToTimelinePercent(minutesSinceMidnight(start));
          const bottom = minuteToTimelinePercent(minutesSinceMidnight(end));
          const height = Math.max(bottom - top, 2);
          const colors = MAP_STATUS_COLORS[block.publicStatus as MapDisplayStatus];

          return (
            <div
              key={`${block.startAt}-${block.publicStatus}`}
              className="absolute left-2 right-2 overflow-hidden rounded-md border px-2 py-1 text-xs font-medium shadow-sm"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                minHeight: 28,
                backgroundColor: colors.fill,
                borderColor: colors.stroke,
              }}
            >
              <span className="block truncate text-text-primary">
                {formatTimelineTime(start)}–{formatTimelineTime(end)}
              </span>
              <span className="block truncate text-text-secondary">
                {colors.label}
              </span>
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
          style={{ top: `${nowPercent}%` }}
          aria-hidden="true"
        >
          <div className="h-0.5 flex-1 bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-red-500" />
        </div>
      </div>

      <p className="sr-only">
        Timeline for {formatFullDate(viewDate)} in {timezone}.{" "}
        {dayBlocks.length === 0
          ? "No scheduled blocks."
          : `${dayBlocks.length} scheduled blocks.`}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RoomDetailPanel({
  space,
  slots,
  viewTime,
  onClose,
  onRequest,
}: {
  space: PublicSpace;
  slots: PublicAvailabilitySlot[];
  viewTime: Date;
  onClose: () => void;
  onRequest: () => void;
}) {
  const futureBlocks = getFutureBlocksForSpace(slots, space.id, new Date());
  const viewDay = startOfDay(viewTime);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-panel-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-surface shadow-xl sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="room-panel-title" className="text-xl font-semibold">
              {space.name}
            </h2>
            {space.building ? (
              <p className="mt-1 text-sm text-text-secondary">{space.building}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-md px-3 text-sm text-text-secondary hover:bg-surface-subtle"
            aria-label="Close room details"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {space.description ? (
            <p className="mb-4 text-sm text-text-secondary">{space.description}</p>
          ) : null}

          <section aria-labelledby="timeline-heading">
            <h3
              id="timeline-heading"
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary"
            >
              Day schedule — {formatFullDate(viewDay)}
            </h3>
            <DayTimeline
              spaceId={space.id}
              slots={slots}
              viewDate={viewDay}
              nowLineAt={viewTime}
              timezone={space.timezone}
            />
          </section>

          <section className="mt-8" aria-labelledby="upcoming-heading">
            <h3
              id="upcoming-heading"
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary"
            >
              Upcoming times
            </h3>
            {futureBlocks.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No upcoming scheduled blocks. This space may be open for requests.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {futureBlocks.slice(0, 12).map((block) => (
                  <li
                    key={`${block.startAt}-${block.publicStatus}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-text-primary">
                        {formatInTimeZone(
                          parseStoredTimestamp(block.startAt),
                          block.timezone,
                          "MMM d, yyyy",
                        )}
                      </p>
                      <p className="text-text-secondary">
                        {formatInTimeZone(
                          parseStoredTimestamp(block.startAt),
                          block.timezone,
                          "h:mm a",
                        )}
                        –
                        {formatInTimeZone(
                          parseStoredTimestamp(block.endAt),
                          block.timezone,
                          "h:mm a",
                        )}{" "}
                        Eastern Time
                      </p>
                    </div>
                    <StatusBadge status={block.publicStatus} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="border-t border-border px-5 py-4">
          <p className="mb-3 text-xs text-text-secondary">
            Submitting a reservation request does not reserve the space. A space
            manager must approve every request.
          </p>
          <button
            type="button"
            onClick={onRequest}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover"
          >
            Request this space
          </button>
        </div>
      </div>
    </div>
  );
}

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

const ROOM_TIMELINE_HOUR_HEIGHT = 52;
const ROOM_TIMELINE_LABEL_WIDTH = 56;
const ROOM_DAY_HEADER_HEIGHT = 64;
const ROOM_NOW_SCROLL_OFFSET = 96;
const ROOM_TIMELINE_VISIBLE_DAYS = 4;
const ROOM_TIMELINE_SCROLLBAR = 8;

function sortDateRange(start: Date, end: Date): [Date, Date] {
  return start.getTime() <= end.getTime() ? [start, end] : [end, start];
}

function blockOverlapsRange(
  block: PublicAvailabilitySlot,
  start: Date,
  end: Date,
): boolean {
  return parseStoredTimestamp(block.startAt) < end && parseStoredTimestamp(block.endAt) > start;
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

function roomDayTop(date: Date): number {
  return (minutesSinceMidnight(date) / 60) * ROOM_TIMELINE_HOUR_HEIGHT;
}

function offsetInDay(date: Date, dayStart: Date, dayEnd: Date): number {
  if (date.getTime() <= dayStart.getTime()) return 0;
  if (date.getTime() >= dayEnd.getTime()) {
    return 24 * ROOM_TIMELINE_HOUR_HEIGHT;
  }
  return roomDayTop(date);
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
      <span className="max-w-full truncate rounded-sm bg-action-primary px-1.5 py-0.5 text-center text-xs font-semibold leading-4 text-white shadow-sm">
        Current selection
      </span>
    </div>
  );
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function clampDateToRange(date: Date, start: Date, end: Date): Date {
  const time = Math.max(start.getTime(), Math.min(end.getTime(), date.getTime()));
  return new Date(time);
}

function eventRecency(block: PublicAvailabilitySlot): number {
  return parseStoredTimestamp(block.requestUpdatedAt ?? block.startAt).getTime();
}

function dedupePendingBlocks(
  blocks: PublicAvailabilitySlot[],
): PublicAvailabilitySlot[] {
  const byWindow = new Map<string, PublicAvailabilitySlot>();
  const output: PublicAvailabilitySlot[] = [];

  for (const block of blocks) {
    if (block.publicStatus !== "Pending") {
      output.push(block);
      continue;
    }

    const key = `${block.spaceId}:${block.startAt}:${block.endAt}`;
    const current = byWindow.get(key);
    if (!current || eventRecency(block) > eventRecency(current)) {
      byWindow.set(key, block);
    }
  }

  return [...output, ...byWindow.values()].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

function RoomSchedulePanel({
  space,
  slots,
  rangeStart,
  rangeEnd,
  onClose,
  onRequest,
  isSignedIn,
  requestPending,
  requestBusy,
  requestError,
}: {
  space: PublicSpace;
  slots: PublicAvailabilitySlot[];
  rangeStart: Date;
  rangeEnd: Date;
  onClose: () => void;
  onRequest: (description: string) => void;
  isSignedIn: boolean;
  requestPending: boolean;
  requestBusy: boolean;
  requestError: string | null;
}) {
  const [now] = useState(() => new Date());
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription("");
  }, [space.id, rangeStart, rangeEnd]);

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const dayHeaderScrollRef = useRef<HTMLDivElement>(null);
  const timeColumnScrollRef = useRef<HTMLDivElement>(null);
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
  const [selectedStart, rawSelectedEnd] = sortDateRange(rangeStart, rangeEnd);
  const selectedEnd =
    rawSelectedEnd.getTime() > selectedStart.getTime()
      ? rawSelectedEnd
      : new Date(selectedStart.getTime() + 30 * 60000);
  const calendarDays = buildRoomCalendarDays(selectedStart, selectedEnd);
  const calendarStart = calendarDays[0] ?? startOfDay(selectedStart);
  const calendarEnd = addDays(
    calendarDays[calendarDays.length - 1] ?? calendarStart,
    1,
  );
  const timelineHeight = 24 * ROOM_TIMELINE_HOUR_HEIGHT;
  const todayIndex = calendarDays.findIndex((day) => isSameLocalDay(day, now));
  const needsHorizontalScroll = calendarDays.length > ROOM_TIMELINE_VISIBLE_DAYS;
  const daysTrackWidth = needsHorizontalScroll
    ? `max(100%, calc(100% * ${calendarDays.length} / ${ROOM_TIMELINE_VISIBLE_DAYS}))`
    : "100%";
  const dayGridTemplateColumns = `repeat(${calendarDays.length}, minmax(0, 1fr))`;
  const scrollAnchor =
    todayIndex >= 0
      ? now
      : clampDateToRange(selectedStart, calendarStart, calendarEnd);
  const scrollAnchorTop = roomDayTop(scrollAnchor);
  const futureBlocks = dedupePendingBlocks(
    getFutureBlocksForSpace(slots, space.id, now),
  );
  const visibleBlocks = dedupePendingBlocks(
    slots.filter(
      (block) =>
        block.spaceId === space.id &&
        blockOverlapsRange(block, calendarStart, calendarEnd),
    ),
  );
  const upcomingReservations = futureBlocks
    .filter((block) => block.publicStatus === "Reserved")
    .slice(0, 3);
  const pendingRequests = futureBlocks
    .filter((block) => block.publicStatus === "Pending")
    .slice(0, 6);
  const hourTicks = Array.from({ length: 24 }, (_, index) => index);

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

  const panClassName = cn(
    "select-none",
    panning ? "cursor-grabbing" : "cursor-grab",
  );

  const syncTimelineView = useCallback(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const top = timeline.scrollTop;
    const height = timeline.clientHeight;
    setTimelineView((prev) =>
      prev.top === top && prev.height === height ? prev : { top, height },
    );
    if (dayHeaderScrollRef.current) {
      dayHeaderScrollRef.current.scrollLeft = timeline.scrollLeft;
    }
    if (timeColumnScrollRef.current) {
      timeColumnScrollRef.current.scrollTop = timeline.scrollTop;
    }
  }, []);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const maxScroll = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
    const visibleDays = Math.min(
      ROOM_TIMELINE_VISIBLE_DAYS,
      Math.max(calendarDays.length, 1),
    );
    const dayWidth = timeline.clientWidth / visibleDays;
    const todayIsOffscreen =
      todayIndex >= visibleDays && dayWidth > 0;
    timeline.scrollTo({
      top: Math.max(
        0,
        Math.min(maxScroll, scrollAnchorTop - ROOM_NOW_SCROLL_OFFSET),
      ),
      left: todayIsOffscreen
        ? Math.min(
            Math.max(0, timeline.scrollWidth - timeline.clientWidth),
            todayIndex * dayWidth,
          )
        : 0,
      behavior: "auto",
    });
    syncTimelineView();
  }, [
    calendarDays.length,
    rangeStart,
    rangeEnd,
    scrollAnchorTop,
    space.id,
    syncTimelineView,
    todayIndex,
  ]);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    syncTimelineView();
    const observer = new ResizeObserver(syncTimelineView);
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [syncTimelineView]);

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-surface/97 shadow-lg backdrop-blur-sm"
      role="dialog"
      aria-modal="false"
      aria-labelledby="room-schedule-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-3">
        <div className="min-w-0">
          {space.building ? (
            <p className="truncate text-xs font-medium uppercase tracking-wide text-text-secondary">
              {space.building}
            </p>
          ) : null}
          <h2
            id="room-schedule-title"
            className="mt-0.5 truncate text-xl font-semibold leading-tight text-text-primary"
          >
            {space.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle"
          aria-label="Close room schedule"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-4 shrink-0"
          >
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex shrink-0"
            style={{ height: ROOM_DAY_HEADER_HEIGHT }}
          >
            <div
              className="shrink-0 border-b border-r border-border bg-surface"
              style={{ width: ROOM_TIMELINE_LABEL_WIDTH }}
              aria-hidden="true"
            />
            <div
              ref={dayHeaderScrollRef}
              className={cn(
                "room-timeline-day-header min-w-0 flex-1 overflow-x-hidden overflow-y-hidden border-b border-border",
                panClassName,
              )}
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={onPanPointerUp}
              onPointerCancel={onPanPointerUp}
              onLostPointerCapture={onPanPointerUp}
              onWheel={(event) => {
                const timeline = timelineScrollRef.current;
                if (!timeline || event.deltaX === 0) return;
                timeline.scrollLeft += event.deltaX;
              }}
            >
              <div
                className="grid h-full"
                style={{
                  width: daysTrackWidth,
                  minWidth: "100%",
                  gridTemplateColumns: dayGridTemplateColumns,
                }}
              >
                {calendarDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="flex min-w-0 items-center justify-center border-r border-border px-2.5 last:border-r-0"
                  >
                    <div className="flex h-12 w-full min-w-0 flex-col items-center justify-center rounded-md border border-border bg-surface-subtle px-1.5 text-center">
                      <span className="max-w-full truncate text-xs font-medium uppercase tracking-wide text-text-secondary">
                        {formatInTimeZone(day, space.timezone, "EEE")}
                      </span>
                      <span className="max-w-full truncate text-base font-semibold text-text-primary">
                        {formatInTimeZone(day, space.timezone, "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1">
            <div
              ref={timeColumnScrollRef}
              className={cn(
                "shrink-0 overflow-hidden border-r border-border bg-surface",
                panClassName,
              )}
              style={{
                width: ROOM_TIMELINE_LABEL_WIDTH,
                paddingBottom: needsHorizontalScroll
                  ? ROOM_TIMELINE_SCROLLBAR
                  : 0,
              }}
              aria-hidden="true"
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={onPanPointerUp}
              onPointerCancel={onPanPointerUp}
              onLostPointerCapture={onPanPointerUp}
              onWheel={(event) => {
                const timeline = timelineScrollRef.current;
                if (!timeline || event.deltaY === 0) return;
                timeline.scrollTop += event.deltaY;
              }}
            >
              <div className="relative" style={{ height: timelineHeight }}>
                {hourTicks.map((hour) => {
                  const tick = addHours(calendarStart, hour);
                  const top = hour * ROOM_TIMELINE_HOUR_HEIGHT;

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "pointer-events-none absolute inset-x-0",
                        hour > 0 && "border-t border-border/65",
                      )}
                      style={{ top, height: ROOM_TIMELINE_HOUR_HEIGHT }}
                    >
                      <span className="absolute left-1.5 top-1 text-xs font-medium text-text-secondary">
                        {formatInTimeZone(tick, space.timezone, "h a")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              ref={timelineScrollRef}
              onScroll={syncTimelineView}
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={onPanPointerUp}
              onPointerCancel={onPanPointerUp}
              onLostPointerCapture={onPanPointerUp}
              className={cn(
                "room-timeline-scroll relative min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain",
                panClassName,
              )}
              role="img"
              aria-label={`Scrollable calendar for ${space.name} from ${formatTimelineTime(
                selectedStart,
              )} to ${formatTimelineTime(selectedEnd)}. Drag to pan.`}
            >
              <div
                className="relative grid"
                style={{
                  width: daysTrackWidth,
                  minWidth: "100%",
                  height: timelineHeight,
                  gridTemplateColumns: dayGridTemplateColumns,
                }}
              >
                {hourTicks.map((hour) =>
                  hour > 0 ? (
                    <div
                      key={hour}
                      className="pointer-events-none absolute left-0 right-0 border-t border-border/65"
                      style={{ top: hour * ROOM_TIMELINE_HOUR_HEIGHT }}
                    />
                  ) : null,
                )}

                {calendarDays.map((day, dayIndex) => {
                  const dayStart = startOfDay(day);
                  const dayEnd = addDays(dayStart, 1);
                  const hasSelectedRange =
                    selectedStart < dayEnd && selectedEnd > dayStart;
                  const selectedTop = offsetInDay(
                    selectedStart,
                    dayStart,
                    dayEnd,
                  );
                  const selectedBottom = offsetInDay(
                    selectedEnd,
                    dayStart,
                    dayEnd,
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
                      className="relative min-w-0 border-r border-border last:border-r-0"
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
                        const top = offsetInDay(start, dayStart, dayEnd);
                        const bottom = offsetInDay(end, dayStart, dayEnd);
                        const status = block.publicStatus as MapDisplayStatus;
                        const colors =
                          CALENDAR_STATUS_COLORS[status] ??
                          CALENDAR_STATUS_COLORS.Reserved;
                        const pending = block.publicStatus === "Pending";

                        return (
                          <div
                            key={`${day.toISOString()}-${block.startAt}-${block.endAt}-${block.publicStatus}-${block.requestUpdatedAt ?? ""}`}
                            className={cn(
                              "absolute left-1.5 right-1.5 z-20 overflow-hidden rounded-md border px-2.5 py-1.5 text-sm shadow-sm",
                              pending && "border-dashed",
                            )}
                            style={{
                              top,
                              height: Math.max(bottom - top, 32),
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
                            <p className="truncate text-xs text-text-secondary">
                              {formatTimelineTime(start)}-{formatTimelineTime(end)}
                            </p>
                          </div>
                        );
                      })}

                      {showNowForDay ? (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
                          style={{
                            top: roomDayTop(now),
                            transform: "translateY(-50%)",
                          }}
                          aria-hidden="true"
                        >
                          <div className="absolute inset-x-0 h-0.5 bg-red-600" />
                          <span className="relative rounded-sm bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white shadow-sm">
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

        {pendingRequests.length > 0 ? (
          <section
            className="mt-3 shrink-0"
            aria-labelledby="room-requests-heading"
          >
            <h3
              id="room-requests-heading"
              className="mb-2 text-sm font-semibold text-text-primary"
            >
              Requests
            </h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {pendingRequests.map((block) => (
                <li
                  key={`${block.startAt}-${block.endAt}-pending`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      Pending
                    </p>
                    <p className="truncate text-sm text-text-secondary">
                      {formatInTimeZone(
                        parseStoredTimestamp(block.startAt),
                        block.timezone,
                        "MMM d, h:mm a",
                      )}
                      -
                      {formatInTimeZone(
                        parseStoredTimestamp(block.endAt),
                        block.timezone,
                        "h:mm a",
                      )}
                    </p>
                  </div>
                  <StatusBadge status={block.publicStatus} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {upcomingReservations.length > 0 ? (
          <section
            className="mt-3 shrink-0"
            aria-labelledby="next-reservations-heading"
          >
            <h3
              id="next-reservations-heading"
              className="mb-2 text-sm font-semibold text-text-primary"
            >
              Next reservations
            </h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {upcomingReservations.map((block) => (
                <li
                  key={`${block.startAt}-${block.endAt}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {CALENDAR_STATUS_COLORS[
                        block.publicStatus as MapDisplayStatus
                      ]?.label ?? block.publicStatus}
                    </p>
                    <p className="truncate text-sm text-text-secondary">
                      {formatInTimeZone(
                        parseStoredTimestamp(block.startAt),
                        block.timezone,
                        "MMM d, h:mm a",
                      )}
                      -
                      {formatInTimeZone(
                        parseStoredTimestamp(block.endAt),
                        block.timezone,
                        "h:mm a",
                      )}
                    </p>
                  </div>
                  <StatusBadge status={block.publicStatus} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {requestPending || isSignedIn ? (
        <div className="shrink-0 px-5 pb-3 pt-1">
          {requestPending ? (
            <div
              className="flex min-h-11 items-center justify-center rounded-md border border-status-pending/30 bg-status-pending-bg px-4 py-2"
              role="status"
            >
              <StatusBadge status="Pending" />
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <label
                  htmlFor={`request-reason-${space.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  Reason
                </label>
                <div className="w-full rounded-lg border border-border bg-surface-subtle px-3.5 py-3">
                  <textarea
                    id={`request-reason-${space.id}`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="min-h-20 w-full resize-y bg-transparent text-sm font-semibold text-text-primary outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRequest(description)}
                disabled={requestBusy || description.trim().length === 0}
                aria-label={
                  requestBusy
                    ? "Sending request"
                    : description.trim().length === 0
                      ? "Please provide a reason for the space."
                      : "Request this space"
                }
                className={cn(
                  "relative mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse transition-opacity duration-300",
                  description.trim().length === 0
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-action-primary-hover",
                  requestBusy && "pointer-events-none opacity-70",
                )}
              >
                {requestBusy ? (
                  "Sending request…"
                ) : (
                  <span className="grid place-items-center text-center" aria-hidden>
                    <span
                      className={cn(
                        "col-start-1 row-start-1 transition-opacity duration-300",
                        description.trim().length > 0
                          ? "opacity-0"
                          : "opacity-100",
                      )}
                    >
                      Please provide a reason for the space.
                    </span>
                    <span
                      className={cn(
                        "col-start-1 row-start-1 transition-opacity duration-300",
                        description.trim().length > 0
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    >
                      Request this space
                    </span>
                  </span>
                )}
              </button>
            </>
          )}
          {requestError ? (
            <p className="mt-2 text-center text-sm text-status-danger" role="alert">
              {requestError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MapWorkspace({
  spaces,
  slots,
  isSignedIn = false,
  canRequest = false,
  initialSelectedSlug,
  initialMapId,
  campusEditMode = false,
  buildingEditMode = null,
}: MapWorkspaceProps) {
  const router = useRouter();
  const [rangeStart, setRangeStart] = useState(() =>
    snapDateToPlannerSlot(new Date()),
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    addHours(snapDateToPlannerSlot(new Date()), 2),
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSelectedSlug ?? null,
  );
  const [selectedSpaceOverride, setSelectedSpaceOverride] =
    useState<PublicSpace | null>(null);
  const [activeMapId, setActiveMapId] = useState(
    buildingEditMode ?? initialMapId ?? ROOT_MAP_ID,
  );

  const isCampusView = activeMapId === ROOT_MAP_ID;
  const [navMeta, setNavMeta] = useState<MapNavigationMeta | null>(null);
  const navActionsRef = useRef<MapNavigationActions | null>(null);
  const chromeMotionMode = navMeta?.chromeMotionMode ?? "idle";
  const chromeShown = navMeta?.chromeShown ?? false;
  const chromeSlideTarget = navMeta
    ? chromeTargetShown(chromeMotionMode, chromeShown)
    : false;
  const chromeVisible = useChromeSlideVisible(chromeSlideTarget);

  const selectedSpace =
    spaces.find((s) => s.slug === selectedSlug && s.isActive) ??
    (selectedSpaceOverride?.slug === selectedSlug &&
    selectedSpaceOverride.isActive
      ? selectedSpaceOverride
      : null);

  const [localSlots, setLocalSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const visibleSlots = useMemo(() => {
    const extras = localSlots.filter(
      (local) =>
        !slots.some(
          (slot) =>
            slot.spaceId === local.spaceId &&
            slot.publicStatus === local.publicStatus &&
            parseStoredTimestamp(slot.startAt).getTime() ===
              parseStoredTimestamp(local.startAt).getTime() &&
            parseStoredTimestamp(slot.endAt).getTime() ===
              parseStoredTimestamp(local.endAt).getTime(),
        ),
    );
    return extras.length > 0 ? [...slots, ...extras] : slots;
  }, [slots, localSlots]);

  const requestPending = Boolean(
    selectedSpace &&
      visibleSlots.some(
        (slot) =>
          slot.spaceId === selectedSpace.id &&
          slot.publicStatus === "Pending" &&
          parseStoredTimestamp(slot.startAt) < rangeEnd &&
          parseStoredTimestamp(slot.endAt) > rangeStart,
      ),
  );

  useEffect(() => {
    setRequestError(null);
    setRequestBusy(false);
  }, [selectedSlug, rangeStart, rangeEnd]);

  const handleRequestSpace = useCallback(async (description: string) => {
    if (!selectedSpace) return;
    if (!isSignedIn) {
      router.push(
        `/sign-in?next=${encodeURIComponent(`/?room=${selectedSpace.slug}`)}`,
      );
      return;
    }
    if (!canRequest) {
      setRequestError("Your account cannot submit requests yet.");
      return;
    }

    const reason = description.trim();
    if (reason.length === 0) {
      setRequestError("Enter a reason for this request.");
      return;
    }

    const start = snapDateToPlannerSlot(rangeStart);
    const end = snapDateToPlannerSlot(rangeEnd);
    setRequestBusy(true);
    setRequestError(null);
    const result = await submitReservationRequestAction({
      roomId: selectedSpace.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      description: reason,
    });
    setRequestBusy(false);

    if (!result.ok) {
      setRequestError(result.error);
      return;
    }

    setLocalSlots((prev) => [
      ...prev.filter(
        (slot) =>
          !(
            slot.spaceId === selectedSpace.id &&
            slot.startAt === result.startAt &&
            slot.endAt === result.endAt
          ),
      ),
      {
        spaceId: selectedSpace.id,
        spaceSlug: selectedSpace.slug,
        spaceName: selectedSpace.name,
        startAt: result.startAt,
        endAt: result.endAt,
        publicStatus: "Pending",
        timezone: selectedSpace.timezone || DEFAULT_TIMEZONE,
      },
    ]);
    router.refresh();
  }, [
    canRequest,
    isSignedIn,
    rangeEnd,
    rangeStart,
    router,
    selectedSpace,
  ]);

  const handleRoomSelect = useCallback((space: PublicSpace) => {
    if (!space.isActive) return;
    setSelectedSlug(space.slug);
    setSelectedSpaceOverride(space);
  }, []);

  const clearSelectedRoom = useCallback(() => {
    setSelectedSlug(null);
    setSelectedSpaceOverride(null);
  }, []);

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setRangeStart(snapDateToPlannerSlot(start));
    setRangeEnd(snapDateToPlannerSlot(end));
  }, []);

  const handleMapLevelChange = useCallback((mapId: string) => {
    setActiveMapId(mapId);
    if (mapId === ROOT_MAP_ID) {
      setSelectedSlug(null);
      setSelectedSpaceOverride(null);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative h-full min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <MapNavigator
            spaces={spaces}
            slots={visibleSlots}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRoomSelect={handleRoomSelect}
            initialMapId={buildingEditMode ?? initialMapId}
            onMapLevelChange={handleMapLevelChange}
            campusEditMode={campusEditMode}
            buildingEditMode={buildingEditMode}
            onNavigationMetaChange={setNavMeta}
            navigationActionsRef={navActionsRef}
            selectedSpaceSlug={selectedSlug}
            onRoomDeselect={clearSelectedRoom}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 overflow-visible">
          {navMeta ? (
            <>
              <MapNavigationBar
                meta={navMeta}
                visible={chromeVisible}
                actionsRef={navActionsRef}
              />

              {!isCampusView ? (
                <MapStatusLegend
                  visible={chromeVisible}
                  chromeMotionMode={navMeta.chromeMotionMode}
                />
              ) : null}

              {navMeta.floorControl ? (
                <FloorSwitcher
                  control={navMeta.floorControl}
                  visible={chromeVisible}
                  chromeMotionMode={navMeta.chromeMotionMode}
                  onUp={() => navActionsRef.current?.onFloorUp?.()}
                  onDown={() => navActionsRef.current?.onFloorDown?.()}
                />
              ) : null}

              <div
                aria-label="Availability planner"
                aria-hidden={!chromeIsInteractive(chromeVisible)}
                className={cn(
                  "pointer-events-none absolute left-4 flex flex-col overflow-visible",
                  MAP_PLANNER_COLUMN_WIDTH_CLASS,
                )}
                style={{
                  top: MAP_FLOOR_INSET,
                  bottom: MAP_FLOOR_INSET,
                }}
              >
                <div
                  className={cn(
                    chromeSlideMotionClass,
                    "flex h-full min-h-0 flex-col",
                  )}
                  style={chromeSlideStyle(
                    chromeVisible,
                    "x",
                    navMeta.chromeMotionMode,
                  )}
                >
                  <div
                    className={cn(
                      "flex min-h-0 flex-1 flex-col gap-4",
                      selectedSpace && !isCampusView
                        ? "overflow-hidden"
                        : "overflow-y-auto",
                      chromeIsInteractive(chromeVisible)
                        ? "pointer-events-auto"
                        : "pointer-events-none",
                    )}
                  >
                    <div className="shrink-0">
                      <AvailabilityPlanner
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        onRangeChange={handleRangeChange}
                      />
                    </div>
                    {selectedSpace && !isCampusView ? (
                      <div className="flex min-h-64 flex-1 flex-col overflow-hidden">
                        <RoomSchedulePanel
                          space={selectedSpace}
                          slots={visibleSlots}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          onClose={() => setSelectedSlug(null)}
                          onRequest={(description) => {
                            void handleRequestSpace(description);
                          }}
                          isSignedIn={isSignedIn}
                          requestPending={requestPending}
                          requestBusy={requestBusy}
                          requestError={requestError}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
