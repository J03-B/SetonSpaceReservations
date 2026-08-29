import type { MapRegion } from "./map-config";
import { regionCameraFocus, regionCameraFrame } from "./region-geometry";

/** Zoom in / out from building overview */
export const FLOOR_ROOM_FOCUS_MS = 1000;
/** Zoom back to the floor overview — slightly longer so it can ease out and settle */
export const FLOOR_ROOM_ZOOM_OUT_MS = 1150;
/** Pan between rooms while already zoomed */
export const FLOOR_ROOM_SWITCH_MS = 850;
/** Room outline hover — must stay snappy; never reuse camera zoom duration */
export const FLOOR_HOVER_MS = 150;
export const FLOOR_LABEL_HOVER_SCALE = 1;
export const FLOOR_LABEL_SELECTED_SCALE = 1.28;
/** Other room names while a room is selected and the camera zooms in */
export const FLOOR_LABEL_DIMMED_SCALE = 0.72;
export const FLOOR_DIMMED_OPACITY = 0.14;

export interface FloorRoomCamera {
  dx: number;
  dy: number;
  scale: number;
  originX: number;
  originY: number;
}

export const FLOOR_ROOM_REST_CAMERA: FloorRoomCamera = {
  dx: 0,
  dy: 0,
  scale: 1,
  originX: 50,
  originY: 50,
};

export interface FloorRoomCameraInsets {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

/** Center the whole floor plan in the remaining chrome opening, not the full screen. */
export function computeFloorOverviewCamera(
  layerW: number,
  layerH: number,
  containerW: number,
  containerH: number,
  insets?: FloorRoomCameraInsets,
): FloorRoomCamera {
  if (layerW <= 0 || layerH <= 0 || containerW <= 0 || containerH <= 0) {
    return FLOOR_ROOM_REST_CAMERA;
  }

  const left = Math.max(0, insets?.left ?? 0);
  const right = Math.max(0, insets?.right ?? 0);
  const top = Math.max(0, insets?.top ?? 0);
  const bottom = Math.max(0, insets?.bottom ?? 0);
  const visibleW = Math.max(1, containerW - left - right);
  const visibleH = Math.max(1, containerH - top - bottom);

  const scale = Math.min(1, visibleW / layerW, visibleH / layerH);

  return {
    dx: left + visibleW / 2 - containerW / 2,
    dy: top + visibleH / 2 - containerH / 2,
    scale,
    originX: 50,
    originY: 50,
  };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function computeFloorRoomCamera(
  region: MapRegion | null,
  layerW: number,
  layerH: number,
  containerW: number,
  containerH: number,
  insets?: FloorRoomCameraInsets,
): FloorRoomCamera {
  if (!region || layerW <= 0 || layerH <= 0 || containerW <= 0) {
    return FLOOR_ROOM_REST_CAMERA;
  }

  const left = Math.max(0, insets?.left ?? 0);
  const right = Math.max(0, insets?.right ?? 0);
  const top = Math.max(0, insets?.top ?? 0);
  const bottom = Math.max(0, insets?.bottom ?? 0);
  const visibleW = Math.max(1, containerW - left - right);
  const visibleH = Math.max(1, containerH - top - bottom);

  const focus = regionCameraFocus(region);
  const frame = regionCameraFrame(region);

  const fx = (focus.x / 100) * layerW;
  const fy = (focus.y / 100) * layerH;
  const padX = (containerW - layerW) / 2;
  const padY = (containerH - layerH) / 2;

  const regionW = Math.max((frame.width / 100) * layerW, layerW * 0.06);
  const regionH = Math.max((frame.height / 100) * layerH, layerH * 0.06);

  const scale = Math.min(
    2.35,
    Math.max(
      1,
      Math.min((visibleW * 0.86) / regionW, (visibleH * 0.7) / regionH),
    ),
  );

  // Keep origin at the layer center so room-to-room lerp is a pan, not a
  // warp around a moving transform-origin (Main Building rooms sit far apart).
  const cx = layerW / 2;
  const cy = layerH / 2;

  return {
    dx: left + visibleW / 2 - (padX + fx * scale + cx * (1 - scale)),
    dy: top + visibleH / 2 - (padY + fy * scale + cy * (1 - scale)),
    scale,
    originX: 50,
    originY: 50,
  };
}

export function lerpFloorRoomCamera(
  from: FloorRoomCamera,
  to: FloorRoomCamera,
  t: number,
): FloorRoomCamera {
  const clamped = Math.min(1, Math.max(0, t));
  const fromScale = Math.max(from.scale, 0.001);
  const toScale = Math.max(to.scale, 0.001);
  return {
    dx: from.dx + (to.dx - from.dx) * clamped,
    dy: from.dy + (to.dy - from.dy) * clamped,
    scale: Math.exp(
      Math.log(fromScale) + (Math.log(toScale) - Math.log(fromScale)) * clamped,
    ),
    originX: from.originX + (to.originX - from.originX) * clamped,
    originY: from.originY + (to.originY - from.originY) * clamped,
  };
}

export function camerasNearlyEqual(
  a: FloorRoomCamera,
  b: FloorRoomCamera,
): boolean {
  return (
    Math.abs(a.dx - b.dx) < 0.8 &&
    Math.abs(a.dy - b.dy) < 0.8 &&
    Math.abs(a.scale - b.scale) < 0.01 &&
    Math.abs(a.originX - b.originX) < 0.2 &&
    Math.abs(a.originY - b.originY) < 0.2
  );
}

export function floorRoomCameraToStyle(camera: FloorRoomCamera): {
  transform: string;
  transformOrigin: string;
} {
  if (
    Math.abs(camera.scale - 1) < 0.001 &&
    Math.abs(camera.dx) < 0.5 &&
    Math.abs(camera.dy) < 0.5
  ) {
    return { transform: "none", transformOrigin: "50% 50%" };
  }

  return {
    transform: `translate3d(${camera.dx}px, ${camera.dy}px, 0) scale(${camera.scale})`,
    transformOrigin: `${camera.originX}% ${camera.originY}%`,
  };
}

/** @deprecated Use computeFloorRoomCamera + floorRoomCameraToStyle */
export function computeFloorRoomFocusStyle(
  region: MapRegion,
  layerW: number,
  layerH: number,
  containerW: number,
  containerH: number,
  progress: number,
): { transform: string; transformOrigin: string } {
  const rest = FLOOR_ROOM_REST_CAMERA;
  const focused = computeFloorRoomCamera(
    region,
    layerW,
    layerH,
    containerW,
    containerH,
  );
  const t = easeInOutCubic(Math.min(1, Math.max(0, progress)));
  return floorRoomCameraToStyle(lerpFloorRoomCamera(rest, focused, t));
}
