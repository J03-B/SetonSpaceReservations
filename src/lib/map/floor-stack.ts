import type { CSSProperties } from "react";

export const FLOOR_STACK_MS = 880;
/** Resting ghost of the floor below — faint enough that the current floor reads fully lit. */
export const FLOOR_BELOW_OPACITY = 0.035;

export type FloorStackPose = "current" | "ghost" | "above";
export type FloorStackDirection = "up" | "down";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function poseTransform(pose: FloorStackPose): string {
  switch (pose) {
    case "current":
      return "translate3d(0, 0, 0) rotateX(0deg) scale(1)";
    case "ghost":
      return "translate3d(0, 0, 0) rotateX(0deg) scale(1)";
    case "above":
      return "translate3d(0, -18%, 160px) rotateX(-10deg) scale(1.04)";
  }
}

export function floorStackLayerStyle(
  pose: FloorStackPose,
  reducedMotion: boolean,
  animate: boolean,
): CSSProperties {
  const opacity =
    pose === "current" ? 1 : pose === "ghost" ? FLOOR_BELOW_OPACITY : 0;

  return {
    isolation: "isolate",
    opacity,
    transform:
      reducedMotion || (pose === "current" && !animate)
        ? "none"
        : poseTransform(pose),
    transformOrigin: "50% 50%",
    transitionProperty: animate ? "transform, opacity" : "none",
    transitionDuration: animate ? `${FLOOR_STACK_MS}ms` : "0ms",
    transitionTimingFunction: EASE,
    willChange: animate ? "transform, opacity" : "auto",
  };
}

export function floorStackStartPose(
  role: "from" | "to",
  direction: FloorStackDirection,
): FloorStackPose {
  if (direction === "up") {
    return role === "from" ? "current" : "above";
  }
  return role === "from" ? "current" : "ghost";
}

export function floorStackEndPose(
  role: "from" | "to",
  direction: FloorStackDirection,
): FloorStackPose {
  if (direction === "up") {
    return role === "from" ? "ghost" : "current";
  }
  return role === "from" ? "above" : "current";
}
