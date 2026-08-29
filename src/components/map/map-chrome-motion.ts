"use client";

import type { CSSProperties } from "react";
import { CHROME_DRILL_MS } from "@/lib/map/drill-frame";
import { cn } from "@/lib/utils";

/** Same easing enter + exit so chrome feels tied to the map drill. */
const CHROME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type ChromeMotionMode = "css-enter" | "css-exit" | "idle";

/** Vertical inset for building floor maps (top nav clearance + matching bottom margin). */
export const MAP_FLOOR_INSET = "4.75rem";

/** Matches `left-4` on the planner column. */
export const MAP_PLANNER_LEFT_PX = 16;
/** Matches `w-[min(40rem,calc(100vw-2rem))]`. */
export const MAP_PLANNER_MAX_WIDTH_PX = 40 * 16;
export const MAP_PLANNER_VIEWPORT_GUTTER_PX = 32;
/** Gap between the stacked left column and the focused room. */
export const MAP_ROOM_FOCUS_GAP_PX = 16;

export const MAP_PLANNER_COLUMN_WIDTH_CLASS =
  "w-[min(40rem,calc(100vw-2rem))]";

export function mapPlannerColumnWidthPx(viewportWidth: number): number {
  return Math.min(
    MAP_PLANNER_MAX_WIDTH_PX,
    Math.max(0, viewportWidth - MAP_PLANNER_VIEWPORT_GUTTER_PX),
  );
}

export function mapSelectedRoomInsets(viewportWidth: number): {
  left: number;
  right: number;
} {
  return {
    left:
      MAP_PLANNER_LEFT_PX +
      mapPlannerColumnWidthPx(viewportWidth) +
      MAP_ROOM_FOCUS_GAP_PX,
    right: MAP_PLANNER_LEFT_PX,
  };
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
