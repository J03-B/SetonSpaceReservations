"use client";

import type { CSSProperties } from "react";
import { CHROME_DRILL_MS } from "@/lib/map/drill-frame";
import { cn } from "@/lib/utils";

/** Same easing enter + exit so chrome feels tied to the map drill. */
const CHROME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type ChromeMotionMode = "css-enter" | "css-exit" | "idle";

/** Vertical inset for building floor maps (top nav clearance + matching bottom margin). */
export const MAP_FLOOR_INSET = "4.75rem";

export function chromeSlideStyle(
  visible: boolean,
  axis: "x" | "y",
  mode: ChromeMotionMode,
): CSSProperties {
  const hidden =
    axis === "y"
      ? "translate3d(0, -5.5rem, 0)"
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
