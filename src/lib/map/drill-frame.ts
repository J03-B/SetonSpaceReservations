import type { MapPoint, MapRegion } from "./map-config";
import {
  boundingBoxFromPoints,
  regionCameraFocus,
  regionCameraFrame,
} from "./region-geometry";

const ZOOM_REST = 1.2;
const ZOOM_MIN = 1.2;
const DRILL_ZOOM_MAX = 4.8;
const DRILL_FILL = 0.82;
const CAMPUS_REST_VIEWPORT_X = 0.5;
const CAMPUS_REST_BOTTOM = 0.94;
const CAMPUS_REST_BOTTOM_MOBILE = 0.9;

export interface DrillCameraState {
  panX: number;
  panY: number;
  zoom: number;
  focusX: number;
  focusY: number;
}

export interface DrillAnimSpec {
  direction: "in" | "out";
  start: DrillCameraState;
  end: DrillCameraState;
}

export interface PanBounds {
  fitW: number;
  fitH: number;
  maxPanX: number;
  maxPanY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computePanBounds(
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  zoom: number,
): PanBounds {
  if (viewportW <= 0 || viewportH <= 0 || imageW <= 0 || imageH <= 0) {
    return { fitW: 0, fitH: 0, maxPanX: 0, maxPanY: 0 };
  }

  const imageAspect = imageW / imageH;
  const viewportAspect = viewportW / viewportH;

  let fitW: number;
  let fitH: number;
  if (imageAspect > viewportAspect) {
    fitW = viewportW;
    fitH = viewportW / imageAspect;
  } else {
    fitH = viewportH;
    fitW = viewportH * imageAspect;
  }

  const maxPanX = Math.max(0, (fitW * zoom - viewportW) / 2);
  const maxPanY = Math.max(0, (fitH * zoom - viewportH) / 2);

  return { fitW, fitH, maxPanX, maxPanY };
}

export function computeCampusRestCamera(
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  mobileMode = false,
): DrillCameraState {
  const zoom = ZOOM_REST;
  const nx = 24 / 100;
  const base = computePanBounds(viewportW, viewportH, imageW, imageH, ZOOM_REST);
  const atZoom = computePanBounds(viewportW, viewportH, imageW, imageH, zoom);

  const panX = clamp(
    (CAMPUS_REST_VIEWPORT_X - nx) * base.fitW,
    -atZoom.maxPanX,
    atZoom.maxPanX,
  );
  const bottom = mobileMode ? CAMPUS_REST_BOTTOM_MOBILE : CAMPUS_REST_BOTTOM;
  const panY = -atZoom.maxPanY * bottom;

  return { panX, panY, zoom, focusX: 50, focusY: 50 };
}

export function computeDrillCameraTarget(
  region: MapRegion,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
): DrillCameraState {
  const focus = regionCameraFocus(region);
  const frame = regionCameraFrame(region);
  const focusX = focus.x;
  const focusY = focus.y;
  const nx = focusX / 100;
  const ny = focusY / 100;
  const rw = Math.max(frame.width / 100, 0.035);
  const rh = Math.max(frame.height / 100, 0.035);

  const base = computePanBounds(viewportW, viewportH, imageW, imageH, ZOOM_REST);
  const targetZoom = clamp(
    Math.min(
      (DRILL_FILL * viewportW) / (rw * base.fitW),
      (DRILL_FILL * viewportH) / (rh * base.fitH),
    ),
    ZOOM_MIN,
    DRILL_ZOOM_MAX,
  );

  const atZoom = computePanBounds(viewportW, viewportH, imageW, imageH, targetZoom);

  let panX = (0.5 - nx) * base.fitW;
  let panY = (0.5 - ny) * base.fitH;

  panX = clamp(panX, -atZoom.maxPanX, atZoom.maxPanX);
  panY = clamp(panY, -atZoom.maxPanY, atZoom.maxPanY);

  return { panX, panY, zoom: targetZoom, focusX, focusY };
}

/** Hover-style camera near a building — never the wide rest pose. */
function computeHoverFallbackCamera(
  region: MapRegion,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
): DrillCameraState {
  const focus = regionCameraFocus(region);
  const nx = focus.x / 100;
  const ny = focus.y / 100;
  const targetZoom = clamp(ZOOM_MIN + (DRILL_ZOOM_MAX - ZOOM_MIN) * 0.08, ZOOM_MIN, 1.55);
  const panBounds = computePanBounds(
    viewportW,
    viewportH,
    imageW,
    imageH,
    targetZoom,
  );

  return {
    panX: clamp(
      (0.5 - nx) * 2 * panBounds.maxPanX,
      -panBounds.maxPanX,
      panBounds.maxPanX,
    ),
    panY: clamp(
      (0.5 - ny) * 2 * panBounds.maxPanY,
      -panBounds.maxPanY,
      panBounds.maxPanY,
    ),
    zoom: targetZoom,
    focusX: focus.x,
    focusY: focus.y,
  };
}

function computeDrillPanAtZoom(
  region: MapRegion,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  zoom: number,
): Pick<DrillCameraState, "panX" | "panY" | "focusX" | "focusY"> {
  const focus = regionCameraFocus(region);
  const nx = focus.x / 100;
  const ny = focus.y / 100;
  const base = computePanBounds(viewportW, viewportH, imageW, imageH, ZOOM_REST);
  const atZoom = computePanBounds(viewportW, viewportH, imageW, imageH, zoom);

  let panX = (0.5 - nx) * base.fitW;
  let panY = (0.5 - ny) * base.fitH;
  panX = clamp(panX, -atZoom.maxPanX, atZoom.maxPanX);
  panY = clamp(panY, -atZoom.maxPanY, atZoom.maxPanY);

  return { panX, panY, focusX: focus.x, focusY: focus.y };
}

export function buildDrillAnimSpec(
  region: MapRegion,
  direction: "in" | "out",
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  liveCamera?: DrillCameraState,
  mobileMode = false,
  /** Natural hover camera at pointer — used as drill-out destination instead of rest. */
  exitHoverCamera?: DrillCameraState,
): DrillAnimSpec {
  const target = computeDrillCameraTarget(
    region,
    viewportW,
    viewportH,
    imageW,
    imageH,
  );

  const start =
    direction === "in"
      ? (liveCamera ??
        computeCampusRestCamera(viewportW, viewportH, imageW, imageH, mobileMode))
      : { ...target };

  const end =
    direction === "in"
      ? { ...target }
      : (exitHoverCamera ??
        computeHoverFallbackCamera(
          region,
          viewportW,
          viewportH,
          imageW,
          imageH,
        ));

  if (direction === "in") {
    end.zoom = Math.max(start.zoom, target.zoom);
    if (end.zoom !== target.zoom) {
      const atZoom = computeDrillPanAtZoom(
        region,
        viewportW,
        viewportH,
        imageW,
        imageH,
        end.zoom,
      );
      end.panX = atZoom.panX;
      end.panY = atZoom.panY;
      end.focusX = atZoom.focusX;
      end.focusY = atZoom.focusY;
    }
  }

  return { direction, start, end };
}

export function lerpDrillCamera(spec: DrillAnimSpec, progress: number): DrillCameraState {
  const moveT = easeInOutCubic(clamp(progress, 0, 1));
  const focusT =
    spec.direction === "in"
      ? clamp((moveT - 0.12) / 0.88, 0, 1)
      : moveT;

  return {
    panX: spec.start.panX + (spec.end.panX - spec.start.panX) * moveT,
    panY: spec.start.panY + (spec.end.panY - spec.start.panY) * moveT,
    zoom: spec.start.zoom + (spec.end.zoom - spec.start.zoom) * moveT,
    focusX: spec.start.focusX + (spec.end.focusX - spec.start.focusX) * focusT,
    focusY: spec.start.focusY + (spec.end.focusY - spec.start.focusY) * focusT,
  };
}

function regionBounds(region: MapRegion): Pick<MapRegion, "x" | "y" | "width" | "height"> {
  if (region.points && region.points.length >= 3) {
    return boundingBoxFromPoints(region.points);
  }
  return {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  };
}

function mapPointToScreen(
  px: number,
  py: number,
  viewportW: number,
  viewportH: number,
  fitW: number,
  fitH: number,
  camera: DrillCameraState,
): MapPoint {
  const ox = (camera.focusX / 100) * fitW;
  const oy = (camera.focusY / 100) * fitH;
  const lx = (px / 100) * fitW;
  const ly = (py / 100) * fitH;
  const z = camera.zoom;

  return {
    x: viewportW / 2 - fitW / 2 + ox + z * (lx - ox) + camera.panX,
    y: viewportH / 2 - fitH / 2 + oy + z * (ly - oy) + camera.panY,
  };
}

export function computeRegionScreenRect(
  region: MapRegion,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  camera: DrillCameraState,
): { left: number; top: number; width: number; height: number } {
  const box = regionBounds(region);
  const { fitW, fitH } = computePanBounds(
    viewportW,
    viewportH,
    imageW,
    imageH,
    camera.zoom,
  );

  const corners = [
    mapPointToScreen(box.x, box.y, viewportW, viewportH, fitW, fitH, camera),
    mapPointToScreen(
      box.x + box.width,
      box.y,
      viewportW,
      viewportH,
      fitW,
      fitH,
      camera,
    ),
    mapPointToScreen(
      box.x,
      box.y + box.height,
      viewportW,
      viewportH,
      fitW,
      fitH,
      camera,
    ),
    mapPointToScreen(
      box.x + box.width,
      box.y + box.height,
      viewportW,
      viewportH,
      fitW,
      fitH,
      camera,
    ),
  ];

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  return {
    left,
    top,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  };
}

function computeRegionFocusScreenPoint(
  region: MapRegion,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  camera: DrillCameraState,
): MapPoint {
  const focus = regionCameraFocus(region);
  const { fitW, fitH } = computePanBounds(
    viewportW,
    viewportH,
    imageW,
    imageH,
    camera.zoom,
  );
  return mapPointToScreen(
    focus.x,
    focus.y,
    viewportW,
    viewportH,
    fitW,
    fitH,
    camera,
  );
}

function easeInOutCubic(t: number): number {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

/** Floor plan begins at this fraction of full viewport size. */
const FLOOR_SCALE_START = 0.05;
/** Hold small size until this much of the transition has elapsed, then scale up. */
const FLOOR_SCALE_RAMP_START = 0.25;

/** Slide + fade duration — locked to drill transition for enter and exit. */
export const CHROME_DRILL_MS = 1150;

/** @deprecated use CHROME_DRILL_MS */
export const CHROME_TRANSITION_MS = CHROME_DRILL_MS;

/** @deprecated use CHROME_DRILL_MS */
export const CHROME_ENTER_MS = CHROME_DRILL_MS;

/** Campus ↔ floor crossfade — same curve for drill-in and drill-out (expansion drives direction). */
export function getDrillCrossfadeOpacity(expansion: number): number {
  const t = clamp(expansion, 0, 1);
  return easeInOutCubic(t);
}

/** Shared by the drill frame scale and the floor camera lerp so they stay locked. */
export function computeFloorScaleProgress(
  expansion: number,
  direction: "in" | "out",
): number {
  const t = clamp(expansion, 0, 1);
  if (direction === "out") return easeInOutCubic(t);
  if (t <= FLOOR_SCALE_RAMP_START) return 0;
  return easeInOutCubic(
    (t - FLOOR_SCALE_RAMP_START) / (1 - FLOOR_SCALE_RAMP_START),
  );
}

function resolveDrillCamera(
  spec: DrillAnimSpec,
  expansion: number,
  direction: "in" | "out",
  syncCamera?: DrillCameraState | null,
): DrillCameraState {
  if (syncCamera) return syncCamera;
  const eased = easeInOutCubic(clamp(expansion, 0, 1));
  const cameraT = direction === "in" ? eased : 1 - eased;
  return lerpDrillCamera(spec, cameraT);
}

export interface FloorDrillFrameStyle {
  transform: string;
  transformOrigin: string;
  opacity: number;
}

/** Scale + fade floor plan from building footprint to full viewport (and reverse). */
export function computeFloorDrillFrameStyle(
  region: MapRegion,
  expansion: number,
  direction: "in" | "out",
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  mobileMode = false,
  syncCamera?: DrillCameraState | null,
  drillStartCamera?: DrillCameraState | null,
): FloorDrillFrameStyle {
  if (viewportW <= 0 || viewportH <= 0) {
    return {
      transform: "scale(1)",
      transformOrigin: "50% 50%",
      opacity: direction === "in" ? expansion : 1 - expansion,
    };
  }

  const spec = buildDrillAnimSpec(
    region,
    direction,
    viewportW,
    viewportH,
    imageW,
    imageH,
    drillStartCamera ?? undefined,
    mobileMode,
  );

  const camera = resolveDrillCamera(spec, expansion, direction, syncCamera);
  const focusPoint = computeRegionFocusScreenPoint(
    region,
    viewportW,
    viewportH,
    imageW,
    imageH,
    camera,
  );

  const scaleProgress = computeFloorScaleProgress(expansion, direction);
  const scale = FLOOR_SCALE_START + (1 - FLOOR_SCALE_START) * scaleProgress;

  const opacity = getDrillCrossfadeOpacity(expansion);

  return {
    transform: `scale(${scale})`,
    transformOrigin: `${focusPoint.x}px ${focusPoint.y}px`,
    opacity,
  };
}
