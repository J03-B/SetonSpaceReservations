"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { RoomRequestPanel } from "./room-request-panel";
import { RoomSchedulePanel } from "./room-schedule-panel";
import { ROOT_MAP_ID } from "@/lib/map/map-config";
import { StatusBadge } from "@/components/ui/status-badge";
import { useChromeSlideVisible } from "@/hooks/use-chrome-slide-visible";
import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  chromeTargetShown,
  MAP_OVERLAY_GAP_PX,
  MAP_OVERLAY_INSET,
  MAP_PLANNER_COLUMN_WIDTH_CLASS,
  MAP_REQUEST_COLUMN_WIDTH_CLASS,
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
                {formatTimelineTime(start)}â€“{formatTimelineTime(end)}
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
              Day schedule â€” {formatFullDate(viewDay)}
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
                        â€“
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

  const roomChrome = Boolean(selectedSpace && !isCampusView);
  const showRequestPanel = Boolean(canRequest && roomChrome);

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
            showRequestPanel={showRequestPanel}
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

              {showRequestPanel && selectedSpace ? (
                <div
                  className={cn(
                    "pointer-events-none fixed top-1/2 z-40 -translate-y-1/2",
                    MAP_REQUEST_COLUMN_WIDTH_CLASS,
                  )}
                  style={{
                    right: navMeta.floorControl ? "5.75rem" : "1rem",
                  }}
                >
                  <div
                    className={cn(
                      chromeSlideMotionClass,
                      chromeIsInteractive(chromeVisible)
                        ? "pointer-events-auto"
                        : "pointer-events-none",
                    )}
                    style={chromeSlideStyle(
                      chromeVisible,
                      "x-end",
                      navMeta.chromeMotionMode,
                    )}
                  >
                    <RoomRequestPanel
                      spaceId={selectedSpace.id}
                      spaceName={selectedSpace.name}
                      isSignedIn={isSignedIn}
                      requestPending={requestPending}
                      requestBusy={requestBusy}
                      requestError={requestError}
                      onRequest={(description) => {
                        void handleRequestSpace(description);
                      }}
                    />
                  </div>
                </div>
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
                  "pointer-events-none absolute left-4 flex min-h-0 flex-col overflow-hidden",
                  MAP_PLANNER_COLUMN_WIDTH_CLASS,
                )}
                style={{
                  top: MAP_OVERLAY_INSET,
                  bottom: MAP_OVERLAY_INSET,
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
                      "flex h-full min-h-0 flex-col overflow-hidden",
                      chromeIsInteractive(chromeVisible)
                        ? "pointer-events-auto"
                        : "pointer-events-none",
                    )}
                    style={{ gap: MAP_OVERLAY_GAP_PX }}
                  >
                    <div className="flex max-h-[58%] min-h-0 shrink-0 flex-col overflow-hidden">
                      <AvailabilityPlanner
                        className="max-h-full"
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        onRangeChange={handleRangeChange}
                      />
                    </div>
                    {roomChrome && selectedSpace ? (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <RoomSchedulePanel
                          space={selectedSpace}
                          slots={visibleSlots}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
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
