import type { MapRegion } from "./map-config";
import { regionCameraFocus, regionCameraFrame } from "./region-geometry";

/** Zoom in / out from building overview */
export const FLOOR_ROOM_FOCUS_MS = 1000;
/** Pan between rooms while already zoomed */
export const FLOOR_ROOM_SWITCH_MS = 850;
export const FLOOR_LABEL_HOVER_SCALE = 1.28;
export const FLOOR_LABEL_SELECTED_SCALE = 1.28;
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
): FloorRoomCamera {
  if (!region || layerW <= 0 || layerH <= 0 || containerW <= 0) {
    return FLOOR_ROOM_REST_CAMERA;
  }

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
    (containerW * 0.44) / regionW,
    (containerH * 0.4) / regionH,
  );

  const focusScreenX = padX + fx;
  const focusScreenY = padY + fy;

  return {
    dx: containerW / 2 - focusScreenX,
    dy: containerH / 2 - focusScreenY,
    scale,
    originX: focus.x,
    originY: focus.y,
  };
}

export function lerpFloorRoomCamera(
  from: FloorRoomCamera,
  to: FloorRoomCamera,
  t: number,
): FloorRoomCamera {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    dx: from.dx + (to.dx - from.dx) * clamped,
    dy: from.dy + (to.dy - from.dy) * clamped,
    scale: from.scale + (to.scale - from.scale) * clamped,
    originX: from.originX + (to.originX - from.originX) * clamped,
    originY: from.originY + (to.originY - from.originY) * clamped,
  };
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
