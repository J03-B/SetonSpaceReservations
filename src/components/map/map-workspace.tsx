"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type {
  PublicActivityCategory,
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
import { ROOT_MAP_ID } from "@/lib/map/map-config";
import { StatusBadge } from "@/components/ui/status-badge";
import { useChromeSlideVisible } from "@/hooks/use-chrome-slide-visible";
import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  chromeTargetShown,
  MAP_PLANNER_COLUMN_WIDTH_CLASS,
} from "@/components/map/map-chrome-motion";
import { cn } from "@/lib/utils";

interface MapWorkspaceProps {
  spaces: PublicSpace[];
  slots: PublicAvailabilitySlot[];
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
          const start = new Date(block.startAt);
          const end = new Date(block.endAt);
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
                          new Date(block.startAt),
                          block.timezone,
                          "MMM d, yyyy",
                        )}
                      </p>
                      <p className="text-text-secondary">
                        {formatInTimeZone(
                          new Date(block.startAt),
                          block.timezone,
                          "h:mm a",
                        )}
                        –
                        {formatInTimeZone(
                          new Date(block.endAt),
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

const ACTIVITY_COLORS: Record<
  PublicActivityCategory,
  { bg: string; border: string; text: string; dot: string }
> = {
  Academic: {
    bg: "rgba(30, 77, 140, 0.14)",
    border: "#1e4d8c",
    text: "#163a6b",
    dot: "#1e4d8c",
  },
  Club: {
    bg: "rgba(26, 127, 75, 0.14)",
    border: "#1a7f4b",
    text: "#14643b",
    dot: "#1a7f4b",
  },
  Other: {
    bg: "rgba(154, 103, 0, 0.16)",
    border: "#9a6700",
    text: "#6f4a00",
    dot: "#9a6700",
  },
};

const ROOM_TIMELINE_HOUR_HEIGHT = 52;
const ROOM_TIMELINE_LABEL_WIDTH = 56;
const ROOM_DAY_HEADER_HEIGHT = 52;
const ROOM_TIMELINE_MIN_VIEW_HEIGHT = 280;
const ROOM_NOW_SCROLL_OFFSET = 96;

function resolveActivityCategory(
  block: PublicAvailabilitySlot,
): PublicActivityCategory {
  if (block.activityCategory) return block.activityCategory;
  if (block.publicStatus === "Blocked" || block.publicStatus === "Closed") {
    return "Other";
  }
  return "Academic";
}

function sortDateRange(start: Date, end: Date): [Date, Date] {
  return start.getTime() <= end.getTime() ? [start, end] : [end, start];
}

function blockOverlapsRange(
  block: PublicAvailabilitySlot,
  start: Date,
  end: Date,
): boolean {
  return new Date(block.startAt) < end && new Date(block.endAt) > start;
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

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function clampDateToRange(date: Date, start: Date, end: Date): Date {
  const time = Math.max(start.getTime(), Math.min(end.getTime(), date.getTime()));
  return new Date(time);
}

function eventRecency(block: PublicAvailabilitySlot): number {
  return new Date(block.requestUpdatedAt ?? block.startAt).getTime();
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
}: {
  space: PublicSpace;
  slots: PublicAvailabilitySlot[];
  rangeStart: Date;
  rangeEnd: Date;
  onClose: () => void;
  onRequest: () => void;
}) {
  const [now] = useState(() => new Date());
  const timelineScrollRef = useRef<HTMLDivElement>(null);
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
  const compactDayHeaders = calendarDays.length >= 8;
  const gridTemplateColumns = `${ROOM_TIMELINE_LABEL_WIDTH}px repeat(${calendarDays.length}, minmax(0, 1fr))`;
  const todayIndex = calendarDays.findIndex((day) => isSameLocalDay(day, now));
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
  const hourTicks = Array.from({ length: 25 }, (_, index) => index);

  useLayoutEffect(() => {
    const timeline = timelineScrollRef.current;
    if (!timeline) return;
    const maxScroll = Math.max(0, timeline.scrollHeight - timeline.clientHeight);
    timeline.scrollTo({
      top: Math.max(
        0,
        Math.min(
          maxScroll,
          ROOM_DAY_HEADER_HEIGHT + scrollAnchorTop - ROOM_NOW_SCROLL_OFFSET,
        ),
      ),
      behavior: "auto",
    });
  }, [rangeStart, rangeEnd, scrollAnchorTop, space.id]);

  return (
    <div
      className="flex h-full min-h-[20rem] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface/97 shadow-lg backdrop-blur-sm"
      role="dialog"
      aria-modal="false"
      aria-labelledby="room-schedule-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3.5">
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

      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-subtle">
          <div
            ref={timelineScrollRef}
            className="room-timeline-scroll relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
            style={{ minHeight: ROOM_TIMELINE_MIN_VIEW_HEIGHT }}
            role="img"
            aria-label={`Scrollable calendar for ${space.name} from ${formatTimelineTime(
              selectedStart,
            )} to ${formatTimelineTime(selectedEnd)}`}
          >
            <div className="min-w-0">
              <div
                className="sticky top-0 z-40 grid border-b border-border bg-surface/95 shadow-sm backdrop-blur"
                style={{
                  gridTemplateColumns,
                  height: ROOM_DAY_HEADER_HEIGHT,
                }}
              >
                <div className="border-r border-border/70" aria-hidden="true" />
                {calendarDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center border-r border-border/60 text-center last:border-r-0",
                      compactDayHeaders ? "px-0.5" : "px-2",
                    )}
                  >
                    <span className="max-w-full truncate text-xs font-medium uppercase tracking-wide text-text-secondary">
                      {formatInTimeZone(day, space.timezone, "EEE")}
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate font-semibold text-text-primary",
                        compactDayHeaders ? "text-sm" : "text-base",
                      )}
                    >
                      {formatInTimeZone(
                        day,
                        space.timezone,
                        compactDayHeaders ? "M/d" : "MMM d",
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns,
                  height: timelineHeight,
                }}
              >
                {hourTicks.map((hour) => {
                  const tick = addHours(calendarStart, hour);
                  const top = hour * ROOM_TIMELINE_HOUR_HEIGHT;

                  return (
                    <div
                      key={hour}
                      className="pointer-events-none absolute left-0 right-0 border-t border-border/65"
                      style={{ top }}
                    >
                      <span className="absolute left-1.5 top-1 text-xs font-medium text-text-secondary">
                        {formatInTimeZone(tick, space.timezone, "h a")}
                      </span>
                    </div>
                  );
                })}

                <div className="relative border-r border-border/70" aria-hidden="true" />

                {calendarDays.map((day, dayIndex) => {
                  const dayStart = startOfDay(day);
                  const dayEnd = addDays(dayStart, 1);
                  const selectedRangeStart = clampDateToRange(
                    selectedStart,
                    dayStart,
                    dayEnd,
                  );
                  const selectedRangeEnd = clampDateToRange(
                    selectedEnd,
                    dayStart,
                    dayEnd,
                  );
                  const hasSelectedRange =
                    selectedStart < dayEnd && selectedEnd > dayStart;
                  const selectedTop = roomDayTop(selectedRangeStart);
                  const selectedBottom = roomDayTop(selectedRangeEnd);
                  const dayBlocks = visibleBlocks.filter((block) =>
                    blockOverlapsRange(block, dayStart, dayEnd),
                  );
                  const showNowForDay = todayIndex === dayIndex;

                  return (
                    <div
                      key={day.toISOString()}
                      className="relative min-w-0 border-r border-border/60 bg-surface-subtle/60 last:border-r-0"
                    >
                      {hasSelectedRange ? (
                        <div
                          className="absolute left-1 right-1 rounded-md border border-action-primary/20 bg-action-primary/10"
                          style={{
                            top: selectedTop,
                            height: Math.max(selectedBottom - selectedTop, 3),
                          }}
                          aria-hidden="true"
                        />
                      ) : null}

                      {dayBlocks.map((block) => {
                        const start = new Date(block.startAt);
                        const end = new Date(block.endAt);
                        const segmentStart = clampDateToRange(start, dayStart, dayEnd);
                        const segmentEnd = clampDateToRange(end, dayStart, dayEnd);
                        const top = roomDayTop(segmentStart);
                        const bottom = roomDayTop(segmentEnd);
                        const category = resolveActivityCategory(block);
                        const colors = ACTIVITY_COLORS[category];
                        const pending = block.publicStatus === "Pending";

                        return (
                          <div
                            key={`${day.toISOString()}-${block.startAt}-${block.endAt}-${block.publicStatus}-${block.requestUpdatedAt ?? ""}`}
                            className={cn(
                              "absolute left-1.5 right-1.5 overflow-hidden rounded-md border px-2.5 py-1.5 text-sm shadow-sm",
                              pending && "border-dashed opacity-70",
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
                              {category}
                            </p>
                            <p className="truncate text-xs text-text-secondary">
                              {formatTimelineTime(start)}-{formatTimelineTime(end)}
                            </p>
                            {pending ? (
                              <p className="truncate text-xs text-text-secondary">
                                Pending request
                              </p>
                            ) : null}
                          </div>
                        );
                      })}

                      {showNowForDay ? (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                          style={{ top: roomDayTop(now) }}
                          aria-hidden="true"
                        >
                          <span className="-ml-11 rounded-sm bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white shadow-sm">
                            Now
                          </span>
                          <div className="h-0.5 flex-1 bg-red-600" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-4 shrink-0" aria-labelledby="next-reservations-heading">
          <h3
            id="next-reservations-heading"
            className="mb-2 text-sm font-semibold text-text-primary"
          >
            Next reservations
          </h3>
          {upcomingReservations.length === 0 ? (
            <p className="rounded-md border border-border bg-surface-subtle px-3 py-2 text-sm text-text-secondary">
              No upcoming approved reservations.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {upcomingReservations.map((block) => (
                <li
                  key={`${block.startAt}-${block.endAt}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {resolveActivityCategory(block)}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {formatInTimeZone(
                        new Date(block.startAt),
                        block.timezone,
                        "MMM d, h:mm a",
                      )}
                      -
                      {formatInTimeZone(
                        new Date(block.endAt),
                        block.timezone,
                        "h:mm a",
                      )}
                    </p>
                  </div>
                  <StatusBadge status={block.publicStatus} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onRequest}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover"
        >
          Request this space
        </button>
      </div>
    </div>
  );
}

export function MapWorkspace({
  spaces,
  slots,
  initialSelectedSlug,
  initialMapId,
  campusEditMode = false,
  buildingEditMode = null,
}: MapWorkspaceProps) {
  const now = new Date();
  const [rangeStart, setRangeStart] = useState(() => now);
  const [rangeEnd, setRangeEnd] = useState(() => addHours(now, 2));
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSelectedSlug ?? null,
  );
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

  const selectedSpace = spaces.find((s) => s.slug === selectedSlug) ?? null;

  const handleRoomSelect = useCallback(
    (space: PublicSpace) => {
      setSelectedSlug(space.slug);
    },
    [],
  );

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setRangeStart(start);
    setRangeEnd(end);
  }, []);

  const handleMapLevelChange = useCallback((mapId: string) => {
    setActiveMapId(mapId);
    if (mapId === ROOT_MAP_ID) {
      setSelectedSlug(null);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative h-full min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <MapNavigator
            spaces={spaces}
            slots={slots}
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
            onRoomDeselect={() => setSelectedSlug(null)}
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

              <div
                aria-label="Availability planner"
                aria-hidden={!chromeIsInteractive(chromeVisible)}
                className={cn(
                  "pointer-events-none absolute bottom-[5.25rem] left-4 top-[4.75rem] flex flex-col overflow-hidden",
                  MAP_PLANNER_COLUMN_WIDTH_CLASS,
                )}
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
                      "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto",
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
                      <div className="flex min-h-[20rem] flex-1 flex-col">
                        <RoomSchedulePanel
                          space={selectedSpace}
                          slots={slots}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          onClose={() => setSelectedSlug(null)}
                          onRequest={() => {
                            window.location.href = `/sign-in?space=${selectedSpace.slug}`;
                          }}
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
