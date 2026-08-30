"use client";

import type { CSSProperties } from "react";
import { CHROME_DRILL_MS } from "@/lib/map/drill-frame";
import { cn } from "@/lib/utils";

/** Same easing enter + exit so chrome feels tied to the map drill. */
const CHROME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type ChromeMotionMode = "css-enter" | "css-exit" | "idle";

/** Vertical inset for building floor maps (top nav clearance + matching bottom margin). */
export const MAP_FLOOR_INSET = "4.75rem";
/** Side overlay cards sit closer to the edges than the floor plan inset. */
export const MAP_OVERLAY_INSET = "1rem";

/** Matches `left-4` on the planner column. */
export const MAP_PLANNER_LEFT_PX = 16;
/** Matches `clamp(16.5rem, 21vw, 22rem)`. */
export const MAP_PLANNER_MIN_WIDTH_PX = 16.5 * 16;
export const MAP_PLANNER_MAX_WIDTH_PX = 22 * 16;
export const MAP_PLANNER_FLUID_VW = 0.2;
/** Matches `clamp(15rem, 18vw, 20rem)`. */
export const MAP_REQUEST_MIN_WIDTH_PX = 15 * 16;
export const MAP_REQUEST_MAX_WIDTH_PX = 20 * 16;
export const MAP_REQUEST_FLUID_VW = 0.18;
/** Gap between a side column and the focused room. */
export const MAP_ROOM_FOCUS_GAP_PX = 16;
/** Right gutter when only the floor switcher is showing. */
export const MAP_FLOOR_SWITCHER_INSET_PX = 88;

export const MAP_OVERLAY_PAD_CLASS = "p-4";
export const MAP_OVERLAY_GAP_PX = 12;

export const MAP_PLANNER_COLUMN_WIDTH_CLASS =
  "@container w-[clamp(16.5rem,20vw,22rem)]";
export const MAP_REQUEST_COLUMN_WIDTH_CLASS =
  "@container w-[clamp(15rem,18vw,20rem)]";

export function mapPlannerColumnWidthPx(viewportWidth: number): number {
  return Math.min(
    MAP_PLANNER_MAX_WIDTH_PX,
    Math.max(MAP_PLANNER_MIN_WIDTH_PX, viewportWidth * MAP_PLANNER_FLUID_VW),
  );
}

export function mapRequestColumnWidthPx(viewportWidth: number): number {
  return Math.min(
    MAP_REQUEST_MAX_WIDTH_PX,
    Math.max(MAP_REQUEST_MIN_WIDTH_PX, viewportWidth * MAP_REQUEST_FLUID_VW),
  );
}

export function mapSelectedRoomInsets(
  viewportWidth: number,
  options?: { requestPanel?: boolean },
): {
  left: number;
  right: number;
} {
  return {
    left:
      MAP_PLANNER_LEFT_PX +
      mapPlannerColumnWidthPx(viewportWidth) +
      MAP_ROOM_FOCUS_GAP_PX,
    right: options?.requestPanel
      ? MAP_PLANNER_LEFT_PX +
        mapRequestColumnWidthPx(viewportWidth) +
        MAP_ROOM_FOCUS_GAP_PX +
        MAP_FLOOR_SWITCHER_INSET_PX
      : MAP_FLOOR_SWITCHER_INSET_PX,
  };
}

export const ROOM_SCHEDULE_VISIBLE_HOURS = 6;
export const ROOM_WEEK_VISIBLE_HOURS = 12;
export const ROOM_TIMELINE_HOUR_MIN = 32;
export const ROOM_TIMELINE_HOUR_MAX = 44;
export const ROOM_WEEK_HOUR_MIN = 28;
export const ROOM_WEEK_HOUR_MAX = 56;
export const ROOM_DAY_HEADER_HEIGHT = 52;
const ROOM_CARD_CHROME_PX = 136;

export function roomTimelineHourHeight(
  viewportHeight: number,
  visibleHours = ROOM_SCHEDULE_VISIBLE_HOURS,
  minHeight = ROOM_TIMELINE_HOUR_MIN,
  maxHeight = ROOM_TIMELINE_HOUR_MAX,
): number {
  if (viewportHeight <= 0) return 40;
  return Math.min(
    maxHeight,
    Math.max(minHeight, viewportHeight / visibleHours),
  );
}

export function roomScheduleCardHeightPx(): number {
  return (
    ROOM_CARD_CHROME_PX +
    ROOM_SCHEDULE_VISIBLE_HOURS * 40
  );
}

export function splitLeftOverlayColumn(columnHeight: number): {
  planner: number;
  room: number;
} {
  if (columnHeight <= 0) {
    return { planner: 0, room: 0 };
  }
  const usable = Math.max(0, columnHeight - MAP_OVERLAY_GAP_PX);
  const roomIdeal = roomScheduleCardHeightPx();
  const room = Math.round(
    usable < roomIdeal + 260
      ? Math.min(roomIdeal, usable * 0.42)
      : roomIdeal,
  );
  return { planner: usable - room, room };
}

export function chromeSlideStyle(
  visible: boolean,
  axis: "x" | "y" | "x-end",
  mode: ChromeMotionMode,
): CSSProperties {
  const hidden =
    axis === "y"
      ? "translate3d(0, -5.5rem, 0)"
      : axis === "x-end"
        ? "translate3d(calc(100% + 1rem), 0, 0)"
        : "translate3d(calc(-100% - 1rem), 0, 0)";
  const shown = "translate3d(0, 0, 0)";
  const animating = mode !== "idle";

  return {
    transform: visible ? shown : hidden,
    opacity: visible ? 1 : 0,
    transitionProperty: animating ? "transform, opacity" : "none",
    transitionDuration: animating ? `${CHROME_DRILL_MS}ms` : "0ms",
    transitionTimingFunction: CHROME_EASE,
  };
}

export const chromeSlideMotionClass = cn(
  "will-change-[transform,opacity]",
  "motion-reduce:transition-none",
);

export function chromeIsInteractive(visible: boolean): boolean {
  return visible;
}

export function chromeTargetShown(
  mode: ChromeMotionMode,
  shown: boolean,
): boolean {
  return mode === "idle" ? true : shown;
}
