"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { MapLevel, MapRegion } from "@/lib/map/map-config";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  blendedProximityZoom,
  blendedZoomFocus,
  regionCameraFocus,
  regionHasPolygon,
} from "@/lib/map/region-geometry";
import {
  buildDrillAnimSpec,
  computeCampusRestCamera,
  computeDrillCameraTarget,
  computePanBounds,
  lerpDrillCamera,
  type DrillAnimSpec,
  type DrillCameraState,
  type PanBounds,
} from "@/lib/map/drill-frame";
import {
  MapRegionLabelLayer,
  MapRegionRectButton,
  MapRegionSvgLayer,
  resolveRegionColors,
} from "./map-region-overlay";
import { cn } from "@/lib/utils";
import { useMobileMapMode } from "@/hooks/use-mobile-map-mode";

const ZOOM_REST = 1.2;
/** Baseline zoom when hovering open campus — proximity ramps up from here */
const ZOOM_MIN = 1.2;
const ZOOM_MAX = 1.6;
/** Tighter — zoom starts only when fairly close to a building */
const PROXIMITY_OUTER = 0.08;
const PROXIMITY_INNER = 0.028;

/** Intermediate zoom intent smoothing (before velocity damp) */
const ZOOM_GOAL_SMOOTH_IN = 3.6;
const ZOOM_GOAL_SMOOTH_OUT = 4.8;
/** AE-style smooth damp duration (seconds) — higher = more glide */
const ZOOM_SMOOTH_TIME_IN = 0.42;
const ZOOM_SMOOTH_TIME_OUT = 0.62;
const ZOOM_MAX_SPEED = 1.15;
/** Zoom pivot glide between buildings (seconds) */
const FOCUS_SMOOTH_TIME = 0.52;
/** Soft falloff for weighted building blend — wider = smoother cross-building travel */
const BLEND_FALLOFF = 0.055;
/** Drill-out returns to a building-hover pose before live parallax resumes. */
const EXIT_HOVER_ZOOM_FLOOR = 0.68;
/** Cursor influence exists for the whole exit, but starts feather-light. */
const EXIT_LIVE_SMOOTH_TIME_START = 0.56;
const EXIT_LIVE_SMOOTH_TIME_END = 0.26;
const EXIT_LIVE_PAN_MAX_SPEED = 720;
const EXIT_LIVE_ZOOM_MAX_SPEED = 1.05;
const EXIT_LIVE_FOCUS_MAX_SPEED = 86;
const EXIT_HANDOFF_PAN_MAX_SPEED = 520;
const EXIT_HANDOFF_ZOOM_MAX_SPEED = 0.75;
const EXIT_HANDOFF_FOCUS_MAX_SPEED = 58;
const PAN_SPRING = { stiffness: 52, damping: 13.8 };
/** Foreground logo moves slightly more than the base map for depth */
const LOGO_PARALLAX_PAN = 0.42;
const LOGO_PARALLAX_ZOOM = 0.58;
const LOGO_PIVOT_SHIFT = 0.95;

interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
}

interface MapLayoutInfo {
  screenW: number;
  screenH: number;
  layoutW: number;
  layoutH: number;
  imageW: number;
  imageH: number;
  mapRotated: boolean;
}

interface SpringChannel {
  value: number;
  velocity: number;
}

interface SmoothVelocity {
  value: number;
}

interface DrillCameraVelocity {
  panX: SmoothVelocity;
  panY: SmoothVelocity;
  zoom: SmoothVelocity;
  focusX: SmoothVelocity;
  focusY: SmoothVelocity;
}

interface CampusMapViewportProps {
  level: MapLevel;
  regions: MapRegion[];
  getRegionStatus?: (region: MapRegion) => PublicStatus | null;
  isRegionActive?: (region: MapRegion) => boolean;
  onRegionClick?: (region: MapRegion) => void;
  /** Building to zoom toward (drill-in) */
  drillRegion?: MapRegion | null;
  /** Building to zoom away from (drill-out) */
  drillOutRegion?: MapRegion | null;
  /** Shared 0→1 transition progress (eased), drives camera with crossfade */
  drillProgress?: number | null;
  /** Keep camera framed on this building while floor map is shown above */
  campusHoldRegion?: MapRegion | null;
  /** Fired each drill frame so floor overlay can match campus camera */
  onDrillCameraChange?: (camera: DrillCameraState) => void;
  className?: string;
}

export const DRILL_TRANSITION_MS = 1150;
/** Map rotation on portrait mobile (degrees) */
const MAP_ROTATE_DEG = 90;
const MAP_COUNTER_ROTATE_DEG = -90;
/** School logo scale when map is rotated on mobile */
const MOBILE_ROTATED_LOGO_SCALE = 0.58;

function applyCameraState(
  state: { panX: number; panY: number; zoom: number; focusX: number; focusY: number },
  springs: { panX: SpringChannel; panY: SpringChannel; zoom: SpringChannel },
  focusRef: { current: { x: number; y: number } },
  currentRef: { current: CameraState },
  zoomGoalRef: { current: number },
  prevZoomRef: { current: number },
): void {
  springs.panX.value = state.panX;
  springs.panY.value = state.panY;
  springs.panX.velocity = 0;
  springs.panY.velocity = 0;
  springs.zoom.value = state.zoom;
  springs.zoom.velocity = 0;
  zoomGoalRef.current = state.zoom;
  prevZoomRef.current = state.zoom;
  focusRef.current = { x: state.focusX, y: state.focusY };
  currentRef.current = { panX: state.panX, panY: state.panY, zoom: state.zoom };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function expSmoothing(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Near a building → pivot under cursor; between buildings → blended building focus */
function resolveZoomPivot(
  nx: number,
  ny: number,
  zoomProgress: number,
  closeWeight: number,
  regions: MapRegion[],
): { x: number; y: number } {
  if (zoomProgress <= 0.01 || regions.length === 0) {
    return { x: 50, y: 50 };
  }

  const mouseX = nx * 100;
  const mouseY = ny * 100;
  const blended = blendedZoomFocus(nx, ny, regions, BLEND_FALLOFF);
  /** Only drift pivot toward cursor at full zoom — keeps building glide while traveling */
  const mouseBlend = easeInOutCubic(clamp(closeWeight * closeWeight, 0, 1));
  const pivotX = blended.x + (mouseX - blended.x) * mouseBlend;
  const pivotY = blended.y + (mouseY - blended.y) * mouseBlend;

  return {
    x: 50 + (pivotX - 50) * zoomProgress,
    y: 50 + (pivotY - 50) * zoomProgress,
  };
}

function getLayoutViewport(
  viewportW: number,
  viewportH: number,
  mapRotated: boolean,
): { w: number; h: number } {
  return mapRotated
    ? { w: viewportH, h: viewportW }
    : { w: viewportW, h: viewportH };
}

/** Portrait phone + landscape map — always rotate for a vertical fit */
function shouldRotateCampusMap(
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
): boolean {
  if (viewportW <= 0 || viewportH <= 0 || imageW <= 0 || imageH <= 0) return false;
  if (viewportW >= viewportH) return false;
  return imageW >= imageH;
}

function clientOffsetInGlideSpace(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  mapRotated: boolean,
): { dx: number; dy: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  if (mapRotated) {
    const t = dx;
    dx = dy;
    dy = -t;
  }
  return { dx, dy };
}

function viewportToImageNorm(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  fitW: number,
  fitH: number,
  pan: { x: number; y: number },
  zoom: number,
  mapRotated = false,
): { nx: number; ny: number } {
  const { dx, dy } = clientOffsetInGlideSpace(clientX, clientY, rect, mapRotated);
  const lx = (dx - pan.x) / zoom + fitW / 2;
  const ly = (dy - pan.y) / zoom + fitH / 2;
  return { nx: lx / fitW, ny: ly / fitH };
}

/** After Effects–style smooth damp with velocity carry-over */
function smoothDamp(
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  dt: number,
  maxSpeed = Infinity,
): number {
  const time = Math.max(0.0001, smoothTime);
  const omega = 2 / time;
  const x = omega * dt;
  const expDecay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let delta = current - target;
  const maxDelta = maxSpeed * time;
  delta = clamp(delta, -maxDelta, maxDelta);
  target = current - delta;

  const temp = (velocity.value + omega * delta) * dt;
  velocity.value = (velocity.value - omega * temp) * expDecay;
  return target + (delta + temp) * expDecay;
}

function integrateSpring(
  channel: SpringChannel,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): void {
  const acceleration =
    -stiffness * (channel.value - target) - damping * channel.velocity;
  channel.velocity += acceleration * dt;
  channel.value += channel.velocity * dt;
}

function computeIdealCamera(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  imageW: number,
  imageH: number,
  targetZoom: number,
  mapRotated = false,
): CameraState {
  const layout = getLayoutViewport(rect.width, rect.height, mapRotated);
  const panBounds = computePanBounds(
    layout.w,
    layout.h,
    imageW,
    imageH,
    ZOOM_MIN,
  );

  const { dx, dy } = clientOffsetInGlideSpace(clientX, clientY, rect, mapRotated);
  const nx = clamp(0.5 + dx / layout.w, 0, 1);
  const ny = clamp(0.5 + dy / layout.h, 0, 1);

  return {
    zoom: targetZoom,
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
  };
}

function computeHoverCameraFromNorm(
  nx: number,
  ny: number,
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  regions: MapRegion[],
  minZoom = ZOOM_MIN,
): DrillCameraState {
  const targetZoom = Math.max(
    minZoom,
    blendedProximityZoom(nx, ny, regions, {
      zoomMin: ZOOM_MIN,
      zoomMax: ZOOM_MAX,
      proximityOuter: PROXIMITY_OUTER,
      proximityInner: PROXIMITY_INNER,
      falloff: BLEND_FALLOFF,
    }),
  );
  const panBounds = computePanBounds(
    viewportW,
    viewportH,
    imageW,
    imageH,
    ZOOM_MIN,
  );
  const zoomProgress = clamp(
    (targetZoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN),
    0,
    1,
  );
  const pivot = resolveZoomPivot(nx, ny, zoomProgress, zoomProgress, regions);

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
    focusX: pivot.x,
    focusY: pivot.y,
  };
}

function lerpDrillCameraState(
  from: DrillCameraState,
  to: DrillCameraState,
  t: number,
): DrillCameraState {
  const clamped = clamp(t, 0, 1);
  return {
    panX: from.panX + (to.panX - from.panX) * clamped,
    panY: from.panY + (to.panY - from.panY) * clamped,
    zoom: from.zoom + (to.zoom - from.zoom) * clamped,
    focusX: from.focusX + (to.focusX - from.focusX) * clamped,
    focusY: from.focusY + (to.focusY - from.focusY) * clamped,
  };
}

function createDrillCameraVelocity(): DrillCameraVelocity {
  return {
    panX: { value: 0 },
    panY: { value: 0 },
    zoom: { value: 0 },
    focusX: { value: 0 },
    focusY: { value: 0 },
  };
}

function createZeroDrillCameraState(): DrillCameraState {
  return {
    panX: 0,
    panY: 0,
    zoom: 0,
    focusX: 0,
    focusY: 0,
  };
}

function smoothDampDrillCameraState(
  current: DrillCameraState,
  target: DrillCameraState,
  velocity: DrillCameraVelocity,
  smoothTime: number,
  dt: number,
): DrillCameraState {
  if (dt <= 0) return current;

  return {
    panX: smoothDamp(
      current.panX,
      target.panX,
      velocity.panX,
      smoothTime,
      dt,
      EXIT_LIVE_PAN_MAX_SPEED,
    ),
    panY: smoothDamp(
      current.panY,
      target.panY,
      velocity.panY,
      smoothTime,
      dt,
      EXIT_LIVE_PAN_MAX_SPEED,
    ),
    zoom: smoothDamp(
      current.zoom,
      target.zoom,
      velocity.zoom,
      smoothTime,
      dt,
      EXIT_LIVE_ZOOM_MAX_SPEED,
    ),
    focusX: smoothDamp(
      current.focusX,
      target.focusX,
      velocity.focusX,
      smoothTime,
      dt,
      EXIT_LIVE_FOCUS_MAX_SPEED,
    ),
    focusY: smoothDamp(
      current.focusY,
      target.focusY,
      velocity.focusY,
      smoothTime,
      dt,
      EXIT_LIVE_FOCUS_MAX_SPEED,
    ),
  };
}

function isSettled(
  mouseActive: boolean,
  springs: { panX: SpringChannel; panY: SpringChannel; zoom: SpringChannel },
  zoomVelocity: number,
  rest: CameraState,
): boolean {
  if (mouseActive) return false;

  const nearRest =
    Math.abs(springs.zoom.value - rest.zoom) < 0.001 &&
    Math.abs(springs.panX.value - rest.panX) < 0.5 &&
    Math.abs(springs.panY.value - rest.panY) < 0.5;

  const still =
    Math.abs(zoomVelocity) < 0.001 &&
    Math.abs(springs.panX.velocity) < 0.2 &&
    Math.abs(springs.panY.velocity) < 0.2;

  return still && nearRest;
}

function isPointerInsideRect(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function CampusMapViewport({
  level,
  regions,
  getRegionStatus,
  isRegionActive,
  onRegionClick,
  drillRegion = null,
  drillOutRegion = null,
  drillProgress = null,
  campusHoldRegion = null,
  onDrillCameraChange,
  className,
}: CampusMapViewportProps) {
  const isMobileMapMode = useMobileMapMode();
  const interactionLocked =
    drillProgress != null ||
    Boolean(drillRegion) ||
    Boolean(drillOutRegion) ||
    Boolean(campusHoldRegion);
  const mobileModeRef = useRef(isMobileMapMode);
  const mapRotatedRef = useRef(false);
  const [mapRotated, setMapRotated] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const regionsRef = useRef(regions);
  const proximityRegions = useMemo(
    () => regions.filter((region) => isRegionActive?.(region) !== false),
    [regions, isRegionActive],
  );

  const mouseRawRef = useRef({ clientX: 0, clientY: 0, active: false });
  const lastPointerRef = useRef({ clientX: 0, clientY: 0 });
  const hoverEnabledRef = useRef(false);
  const zoomGoalRef = useRef(ZOOM_REST);
  const zoomVelocityRef = useRef({ value: 0 });
  const focusRef = useRef({ x: 50, y: 50 });
  const focusVelXRef = useRef({ value: 0 });
  const focusVelYRef = useRef({ value: 0 });
  const prevZoomRef = useRef(ZOOM_REST);
  const lastImageNormRef = useRef({ nx: 0.5, ny: 0.5 });
  const restCameraRef = useRef<CameraState>({
    panX: 0,
    panY: 0,
    zoom: ZOOM_REST,
  });
  const currentRef = useRef<CameraState>({
    panX: 0,
    panY: 0,
    zoom: ZOOM_REST,
  });
  const springRef = useRef({
    panX: { value: 0, velocity: 0 },
    panY: { value: 0, velocity: 0 },
    zoom: { value: ZOOM_REST, velocity: 0 },
  });

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const fitRef = useRef({ fitW: 0, fitH: 0 });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_REST);
  const [focusOrigin, setFocusOrigin] = useState({ x: 50, y: 50 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [bounds, setBounds] = useState<PanBounds>({
    fitW: 0,
    fitH: 0,
    maxPanX: 0,
    maxPanY: 0,
  });

  const drillTargetRef = useRef<ReturnType<typeof computeDrillCameraTarget> | null>(
    null,
  );
  const drillAnimRef = useRef<DrillAnimSpec | null>(null);
  const drillSessionRef = useRef<string | null>(null);
  const pendingHoverResumeRef = useRef(false);
  const exitEndCameraRef = useRef<DrillCameraState | null>(null);
  const exitLiveEndCameraRef = useRef<DrillCameraState | null>(null);
  const exitLiveEndVelocityRef = useRef(createDrillCameraVelocity());
  const exitLiveProgressRef = useRef(0);
  const exitVisibleVelocityRef = useRef(createZeroDrillCameraState());
  const interactionLockedRef = useRef(interactionLocked);
  const tickRef = useRef<(now: number) => void>(() => {});

  useLayoutEffect(() => {
    mobileModeRef.current = isMobileMapMode;
  }, [isMobileMapMode]);

  useLayoutEffect(() => {
    interactionLockedRef.current = interactionLocked;
  }, [interactionLocked]);

  useLayoutEffect(() => {
    regionsRef.current = proximityRegions;
  }, [proximityRegions]);

  const effectiveZoom = reduceMotion ? 1 : zoom;
  const logoParallaxScale =
    isMobileMapMode || reduceMotion
      ? 1
      : 1 + (effectiveZoom - 1) * LOGO_PARALLAX_ZOOM;
  const logoParallaxPanX =
    isMobileMapMode || reduceMotion ? 0 : pan.x * LOGO_PARALLAX_PAN;
  const logoParallaxPanY =
    isMobileMapMode || reduceMotion ? 0 : pan.y * LOGO_PARALLAX_PAN;
  const logoPivotShiftX =
    isMobileMapMode || reduceMotion ? 0 : (focusOrigin.x - 50) * LOGO_PIVOT_SHIFT;
  const logoPivotShiftY =
    isMobileMapMode || reduceMotion ? 0 : (focusOrigin.y - 50) * LOGO_PIVOT_SHIFT;
  const logoVisualScale =
    mapRotated && isMobileMapMode
      ? logoParallaxScale * MOBILE_ROTATED_LOGO_SCALE
      : logoParallaxScale;
  const logoUprightRotate =
    mapRotated && isMobileMapMode ? ` rotate(${MAP_COUNTER_ROTATE_DEG}deg)` : "";

  const updateMapLayout = useCallback((): MapLayoutInfo | null => {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img?.naturalWidth) return null;

    const screenW = viewport.clientWidth;
    const screenH = viewport.clientHeight;
    const rotated =
      mobileModeRef.current &&
      shouldRotateCampusMap(screenW, screenH, img.naturalWidth, img.naturalHeight);
    if (rotated !== mapRotatedRef.current) {
      mapRotatedRef.current = rotated;
      setMapRotated(rotated);
    }
    const layout = getLayoutViewport(screenW, screenH, rotated);
    return {
      screenW,
      screenH,
      layoutW: layout.w,
      layoutH: layout.h,
      imageW: img.naturalWidth,
      imageH: img.naturalHeight,
      mapRotated: rotated,
    };
  }, []);

  const refreshFit = useCallback(() => {
    const layout = updateMapLayout();
    if (!layout) return;

    const next = computePanBounds(
      layout.layoutW,
      layout.layoutH,
      layout.imageW,
      layout.imageH,
      currentRef.current.zoom,
    );
    fitRef.current = { fitW: next.fitW, fitH: next.fitH };
    setBounds(next);
  }, [updateMapLayout]);

  const measureRestCamera = useCallback((): CameraState | null => {
    const layout = updateMapLayout();
    if (!layout) return null;

    const rest = computeCampusRestCamera(
      layout.layoutW,
      layout.layoutH,
      layout.imageW,
      layout.imageH,
      mobileModeRef.current,
    );
    restCameraRef.current = {
      panX: rest.panX,
      panY: rest.panY,
      zoom: rest.zoom,
    };
    return restCameraRef.current;
  }, [updateMapLayout]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const applyPointerFromLastSample = useCallback((rect: DOMRect) => {
    const { clientX, clientY } = lastPointerRef.current;
    const inside = isPointerInsideRect(clientX, clientY, rect);
    mouseRawRef.current.active = inside;
    if (inside) {
      mouseRawRef.current.clientX = clientX;
      mouseRawRef.current.clientY = clientY;
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const viewport = viewportRef.current;
      const img = imgRef.current;
      if (!viewport || !img?.naturalWidth || reduceMotion) {
        stopLoop();
        return;
      }

      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.032);
      lastFrameRef.current = now;

      if (interactionLockedRef.current) {
        stopLoop();
        return;
      }

      const rect = viewport.getBoundingClientRect();
      applyPointerFromLastSample(rect);
      const { fitW, fitH } = fitRef.current;
      const mouseRaw = mouseRawRef.current;
      const current = currentRef.current;
      const springs = springRef.current;

      const rest = restCameraRef.current;
      let ideal: CameraState = {
        panX: rest.panX,
        panY: rest.panY,
        zoom: rest.zoom,
      };

      if (
        !mobileModeRef.current &&
        hoverEnabledRef.current &&
        mouseRaw.active &&
        fitW > 0 &&
        fitH > 0 &&
        !interactionLockedRef.current
      ) {
        const { nx, ny } = viewportToImageNorm(
          mouseRaw.clientX,
          mouseRaw.clientY,
          rect,
          fitW,
          fitH,
          { x: springs.panX.value, y: springs.panY.value },
          springs.zoom.value,
          mapRotatedRef.current,
        );
        lastImageNormRef.current = { nx, ny };

        const targetZoom = blendedProximityZoom(nx, ny, regionsRef.current, {
          zoomMin: ZOOM_MIN,
          zoomMax: ZOOM_MAX,
          proximityOuter: PROXIMITY_OUTER,
          proximityInner: PROXIMITY_INNER,
          falloff: BLEND_FALLOFF,
        });

        ideal = computeIdealCamera(
          mouseRaw.clientX,
          mouseRaw.clientY,
          rect,
          img.naturalWidth,
          img.naturalHeight,
          targetZoom,
          mapRotatedRef.current,
        );
      }

      integrateSpring(
        springs.panX,
        ideal.panX,
        PAN_SPRING.stiffness,
        PAN_SPRING.damping,
        dt,
      );
      integrateSpring(
        springs.panY,
        ideal.panY,
        PAN_SPRING.stiffness,
        PAN_SPRING.damping,
        dt,
      );

      const zoomingIn = ideal.zoom > zoomGoalRef.current;
      const goalRate = zoomingIn ? ZOOM_GOAL_SMOOTH_IN : ZOOM_GOAL_SMOOTH_OUT;
      zoomGoalRef.current +=
        (ideal.zoom - zoomGoalRef.current) * expSmoothing(goalRate, dt);

      const zoomSmoothTime =
        zoomGoalRef.current > springs.zoom.value
          ? ZOOM_SMOOTH_TIME_IN
          : ZOOM_SMOOTH_TIME_OUT;
      springs.zoom.value = smoothDamp(
        springs.zoom.value,
        zoomGoalRef.current,
        zoomVelocityRef.current,
        zoomSmoothTime,
        dt,
        ZOOM_MAX_SPEED,
      );

      const zoomProgress = clamp(
        (springs.zoom.value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN),
        0,
        1,
      );
      const closeWeight = clamp(
        (zoomGoalRef.current - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN),
        0,
        1,
      );
      const pivot = resolveZoomPivot(
        lastImageNormRef.current.nx,
        lastImageNormRef.current.ny,
        zoomProgress,
        closeWeight,
        regionsRef.current,
      );
      const targetFocusX = pivot.x;
      const targetFocusY = pivot.y;
      focusRef.current.x = smoothDamp(
        focusRef.current.x,
        targetFocusX,
        focusVelXRef.current,
        FOCUS_SMOOTH_TIME,
        dt,
      );
      focusRef.current.y = smoothDamp(
        focusRef.current.y,
        targetFocusY,
        focusVelYRef.current,
        FOCUS_SMOOTH_TIME,
        dt,
      );

      const prevZoom = prevZoomRef.current;
      const newZoom = springs.zoom.value;
      if (Math.abs(newZoom - prevZoom) > 0.0001 && fitRef.current.fitW > 0) {
        const { fitW: fw, fitH: fh } = fitRef.current;
        const fx = ((focusRef.current.x / 100) - 0.5) * fw;
        const fy = ((focusRef.current.y / 100) - 0.5) * fh;
        const ratio = newZoom / prevZoom;
        springs.panX.value = ratio * springs.panX.value + (1 - ratio) * fx;
        springs.panY.value = ratio * springs.panY.value + (1 - ratio) * fy;
      }
      prevZoomRef.current = newZoom;

      const layout = getLayoutViewport(
        rect.width,
        rect.height,
        mapRotatedRef.current,
      );
      const nextBounds = computePanBounds(
        layout.w,
        layout.h,
        img.naturalWidth,
        img.naturalHeight,
        springs.zoom.value,
      );
      fitRef.current = { fitW: nextBounds.fitW, fitH: nextBounds.fitH };

      springs.panX.value = clamp(
        springs.panX.value,
        -nextBounds.maxPanX,
        nextBounds.maxPanX,
      );
      springs.panY.value = clamp(
        springs.panY.value,
        -nextBounds.maxPanY,
        nextBounds.maxPanY,
      );

      current.zoom = springs.zoom.value;
      current.panX = springs.panX.value;
      current.panY = springs.panY.value;

      setZoom(current.zoom);
      setPan({ x: current.panX, y: current.panY });
      setFocusOrigin({ x: focusRef.current.x, y: focusRef.current.y });
      setBounds(nextBounds);

      if (isSettled(mouseRaw.active, springs, zoomVelocityRef.current.value, rest)) {
        if (!mouseRaw.active) {
          springs.zoom = { value: rest.zoom, velocity: 0 };
          springs.panX = { value: rest.panX, velocity: 0 };
          springs.panY = { value: rest.panY, velocity: 0 };
          zoomGoalRef.current = rest.zoom;
          zoomVelocityRef.current.value = 0;
          focusRef.current = { x: 50, y: 50 };
          focusVelXRef.current.value = 0;
          focusVelYRef.current.value = 0;
          prevZoomRef.current = rest.zoom;
          current.zoom = rest.zoom;
          current.panX = rest.panX;
          current.panY = rest.panY;
          setZoom(rest.zoom);
          setPan({ x: rest.panX, y: rest.panY });
          setFocusOrigin({ x: 50, y: 50 });
          rafRef.current = null;
        } else {
          rafRef.current = requestAnimationFrame(tickRef.current);
        }
      } else {
        rafRef.current = requestAnimationFrame(tickRef.current);
      }
    },
    [applyPointerFromLastSample, reduceMotion, stopLoop],
  );

  useLayoutEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startLoop = useCallback(() => {
    if (reduceMotion) return;
    if (rafRef.current == null) {
      lastFrameRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
  }, [reduceMotion]);

  const syncPointerState = useCallback(
    (clientX: number, clientY: number, engageHover = false) => {
      lastPointerRef.current = { clientX, clientY };

      if (mobileModeRef.current) return;

      if (engageHover) {
        hoverEnabledRef.current = true;
      }

      if (reduceMotion || interactionLockedRef.current || !hoverEnabledRef.current) {
        return;
      }

      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const inside = isPointerInsideRect(clientX, clientY, rect);

      mouseRawRef.current.clientX = clientX;
      mouseRawRef.current.clientY = clientY;
      mouseRawRef.current.active = inside;
      startLoop();
    },
    [reduceMotion, startLoop],
  );

  const deactivatePointer = useCallback(() => {
    mouseRawRef.current.active = false;
    if (!interactionLockedRef.current && !reduceMotion && hoverEnabledRef.current) {
      startLoop();
    }
  }, [reduceMotion, startLoop]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frameId = requestAnimationFrame(() => {
      setReduceMotion(mq.matches);
    });
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => {
      cancelAnimationFrame(frameId);
      mq.removeEventListener("change", handler);
    };
  }, []);

  useEffect(() => () => {
    stopLoop();
  }, [stopLoop]);

  const pushCameraState = useCallback(
    (state: {
      panX: number;
      panY: number;
      zoom: number;
      focusX: number;
      focusY: number;
    }) => {
      applyCameraState(
        state,
        springRef.current,
        focusRef,
        currentRef,
        zoomGoalRef,
        prevZoomRef,
      );
      const viewport = viewportRef.current;
      const img = imgRef.current;
      const layout = updateMapLayout();
      if (viewport && img?.naturalWidth && layout) {
        const nextBounds = computePanBounds(
          layout.layoutW,
          layout.layoutH,
          layout.imageW,
          layout.imageH,
          state.zoom,
        );
        fitRef.current = { fitW: nextBounds.fitW, fitH: nextBounds.fitH };
        setBounds(nextBounds);
      }
      setPan({ x: state.panX, y: state.panY });
      setZoom(state.zoom);
      setFocusOrigin({ x: state.focusX, y: state.focusY });
    },
    [updateMapLayout],
  );

  const applyRestCamera = useCallback(() => {
    const rest = measureRestCamera();
    if (!rest) return;

    pushCameraState({
      panX: rest.panX,
      panY: rest.panY,
      zoom: rest.zoom,
      focusX: 50,
      focusY: 50,
    });
  }, [measureRestCamera, pushCameraState]);

  useEffect(() => {
    refreshFit();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const relayout = () => {
      window.requestAnimationFrame(() => {
        refreshFit();
        if (
          !hoverEnabledRef.current &&
          !mouseRawRef.current.active &&
          !interactionLockedRef.current
        ) {
          applyRestCamera();
        }
      });
    };

    const observer = new ResizeObserver(relayout);
    observer.observe(viewport);
    window.addEventListener("orientationchange", relayout);
    window.visualViewport?.addEventListener("resize", relayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", relayout);
      window.visualViewport?.removeEventListener("resize", relayout);
    };
  }, [applyRestCamera, refreshFit]);

  const measureHoverDrillEndCamera = useCallback(
    (region: MapRegion, zoomFloor = EXIT_HOVER_ZOOM_FLOOR): DrillCameraState => {
      const viewport = viewportRef.current;
      const img = imgRef.current;
      if (!viewport || !img?.naturalWidth) {
        return {
          panX: 0,
          panY: 0,
          zoom: ZOOM_MIN,
          focusX: 50,
          focusY: 50,
        };
      }

      const layout = updateMapLayout();
      if (!layout) {
        return {
          panX: 0,
          panY: 0,
          zoom: ZOOM_MIN,
          focusX: 50,
          focusY: 50,
        };
      }

      const minZoom =
        ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * zoomFloor;
      const rect = viewport.getBoundingClientRect();
      const pointer = lastPointerRef.current;
      const inside = isPointerInsideRect(pointer.clientX, pointer.clientY, rect);
      const focus = regionCameraFocus(region);
      let nx = focus.x / 100;
      let ny = focus.y / 100;

      if (inside) {
        const { dx, dy } = clientOffsetInGlideSpace(
          pointer.clientX,
          pointer.clientY,
          rect,
          mapRotatedRef.current,
        );
        nx = clamp(0.5 + dx / layout.layoutW, 0, 1);
        ny = clamp(0.5 + dy / layout.layoutH, 0, 1);
      } else if (hoverEnabledRef.current) {
        const lastNorm = lastImageNormRef.current;
        nx = clamp(lastNorm.nx, 0, 1);
        ny = clamp(lastNorm.ny, 0, 1);
      }

      return computeHoverCameraFromNorm(
        nx,
        ny,
        layout.layoutW,
        layout.layoutH,
        img.naturalWidth,
        img.naturalHeight,
        regionsRef.current,
        minZoom,
      );
    },
    [updateMapLayout],
  );

  const syncDrillCamera = useCallback(
    (progress: number) => {
      const spec = drillAnimRef.current;
      if (!spec) return;

      const t = reduceMotion ? 1 : progress;
      let state = lerpDrillCamera(spec, t);
      let exitFrameDt = 0;

      if (spec.direction === "out" && drillOutRegion && !mobileModeRef.current) {
        const easedT = easeInOutCubic(t);
        const liveBlend = clamp(easedT * t * t, 0, 1);
        const progressDelta = Math.max(0, t - exitLiveProgressRef.current);
        exitFrameDt =
          progressDelta > 0
            ? clamp((progressDelta * DRILL_TRANSITION_MS) / 1000, 1 / 120, 1 / 30)
            : 0;
        const smoothTime =
          EXIT_LIVE_SMOOTH_TIME_START +
          (EXIT_LIVE_SMOOTH_TIME_END - EXIT_LIVE_SMOOTH_TIME_START) * easedT;
        exitLiveProgressRef.current = t;
        const desiredLiveEnd = measureHoverDrillEndCamera(
          drillOutRegion,
          EXIT_HOVER_ZOOM_FLOOR * (1 - liveBlend),
        );
        const smoothedLiveEnd = exitLiveEndCameraRef.current
          ? smoothDampDrillCameraState(
              exitLiveEndCameraRef.current,
              desiredLiveEnd,
              exitLiveEndVelocityRef.current,
              smoothTime,
              exitFrameDt,
            )
          : desiredLiveEnd;
        exitLiveEndCameraRef.current = smoothedLiveEnd;

        state = lerpDrillCameraState(state, smoothedLiveEnd, liveBlend);
      }

      pushCameraState(state);
      onDrillCameraChange?.(state);
      if (spec.direction === "out") {
        const previous = exitEndCameraRef.current;
        if (previous && exitFrameDt > 0) {
          exitVisibleVelocityRef.current = {
            panX: clamp(
              (state.panX - previous.panX) / exitFrameDt,
              -EXIT_HANDOFF_PAN_MAX_SPEED,
              EXIT_HANDOFF_PAN_MAX_SPEED,
            ),
            panY: clamp(
              (state.panY - previous.panY) / exitFrameDt,
              -EXIT_HANDOFF_PAN_MAX_SPEED,
              EXIT_HANDOFF_PAN_MAX_SPEED,
            ),
            zoom: clamp(
              (state.zoom - previous.zoom) / exitFrameDt,
              -EXIT_HANDOFF_ZOOM_MAX_SPEED,
              EXIT_HANDOFF_ZOOM_MAX_SPEED,
            ),
            focusX: clamp(
              (state.focusX - previous.focusX) / exitFrameDt,
              -EXIT_HANDOFF_FOCUS_MAX_SPEED,
              EXIT_HANDOFF_FOCUS_MAX_SPEED,
            ),
            focusY: clamp(
              (state.focusY - previous.focusY) / exitFrameDt,
              -EXIT_HANDOFF_FOCUS_MAX_SPEED,
              EXIT_HANDOFF_FOCUS_MAX_SPEED,
            ),
          };
        }
        exitEndCameraRef.current = state;
      }
      if (spec.direction === "in") {
        drillTargetRef.current = {
          panX: spec.end.panX,
          panY: spec.end.panY,
          zoom: spec.end.zoom,
          focusX: spec.end.focusX,
          focusY: spec.end.focusY,
        };
      }
    },
    [
      drillOutRegion,
      measureHoverDrillEndCamera,
      onDrillCameraChange,
      pushCameraState,
      reduceMotion,
    ],
  );

  const initDrillAnim = useCallback(() => {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img?.naturalWidth || drillProgress == null) return false;

    const region = drillRegion ?? drillOutRegion;
    if (!region) return false;

    const direction = drillRegion ? "in" : "out";
    const exitHoverCamera =
      direction === "out" ? measureHoverDrillEndCamera(region) : null;

    exitLiveProgressRef.current = 0;
    exitLiveEndVelocityRef.current = createDrillCameraVelocity();
    exitVisibleVelocityRef.current = createZeroDrillCameraState();

    if (exitHoverCamera) {
      exitEndCameraRef.current = exitHoverCamera;
      exitLiveEndCameraRef.current = exitHoverCamera;
    }

    stopLoop();
    if (direction === "in") {
      mouseRawRef.current.active = false;
    } else {
      pendingHoverResumeRef.current = true;
    }

    const layout = updateMapLayout();
    if (!layout) return false;

    const spec = buildDrillAnimSpec(
      region,
      direction,
      layout.layoutW,
      layout.layoutH,
      layout.imageW,
      layout.imageH,
      {
        panX: currentRef.current.panX,
        panY: currentRef.current.panY,
        zoom: currentRef.current.zoom,
        focusX: focusRef.current.x,
        focusY: focusRef.current.y,
      },
      mobileModeRef.current,
      exitHoverCamera ?? undefined,
    );
    drillAnimRef.current = spec;
    if (direction === "out") {
      exitEndCameraRef.current = spec.end;
      exitLiveEndCameraRef.current = spec.end;
    }
    drillTargetRef.current = computeDrillCameraTarget(
      region,
      layout.layoutW,
      layout.layoutH,
      layout.imageW,
      layout.imageH,
    );
    return true;
  }, [
    drillOutRegion,
    drillProgress,
    drillRegion,
    measureHoverDrillEndCamera,
    stopLoop,
    updateMapLayout,
  ]);

  const applyHoldCamera = useCallback(
    (region: MapRegion) => {
      const viewport = viewportRef.current;
      const img = imgRef.current;
      if (!viewport || !img?.naturalWidth) return false;

      stopLoop();
      mouseRawRef.current.active = false;

      const layout = updateMapLayout();
      if (!layout) return false;

      const target = computeDrillCameraTarget(
        region,
        layout.layoutW,
        layout.layoutH,
        layout.imageW,
        layout.imageH,
      );
      drillTargetRef.current = target;
      pushCameraState(target);
      onDrillCameraChange?.(target);
      return true;
    },
    [onDrillCameraChange, pushCameraState, stopLoop, updateMapLayout],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      syncPointerState(event.clientX, event.clientY, true);
    };
    const onPointerDown = (event: PointerEvent) => {
      syncPointerState(event.clientX, event.clientY, true);
    };
    const onPointerEnd = () => {
      deactivatePointer();
    };
    const onLeaveWindow = () => {
      deactivatePointer();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    if (!mobileModeRef.current) {
      document.documentElement.addEventListener("mouseleave", onLeaveWindow);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, [deactivatePointer, syncPointerState, isMobileMapMode]);

  useEffect(() => {
    if (!campusHoldRegion) return;
    const frameId = requestAnimationFrame(() => {
      applyHoldCamera(campusHoldRegion);
    });
    return () => cancelAnimationFrame(frameId);
  }, [campusHoldRegion, applyHoldCamera, isMobileMapMode]);

  useEffect(() => {
    if (interactionLockedRef.current || hoverEnabledRef.current || pendingHoverResumeRef.current) {
      return;
    }
    applyRestCamera();
  }, [applyRestCamera, isMobileMapMode, mapRotated]);

  useEffect(() => {
    if (drillProgress != null || drillOutRegion) return;
    if (!pendingHoverResumeRef.current) return;
    pendingHoverResumeRef.current = false;

    if (mobileModeRef.current || reduceMotion) return;

    const endCamera = exitEndCameraRef.current;
    if (endCamera) {
      const carryVelocity = exitVisibleVelocityRef.current;
      zoomGoalRef.current = endCamera.zoom;
      zoomVelocityRef.current.value = carryVelocity.zoom;
      springRef.current.panX.velocity = carryVelocity.panX;
      springRef.current.panY.velocity = carryVelocity.panY;
      springRef.current.zoom.velocity = carryVelocity.zoom;
      focusVelXRef.current.value = carryVelocity.focusX;
      focusVelYRef.current.value = carryVelocity.focusY;
      lastImageNormRef.current = {
        nx: endCamera.focusX / 100,
        ny: endCamera.focusY / 100,
      };
      exitEndCameraRef.current = null;
      exitLiveEndCameraRef.current = null;
      exitLiveEndVelocityRef.current = createDrillCameraVelocity();
      exitLiveProgressRef.current = 0;
      exitVisibleVelocityRef.current = createZeroDrillCameraState();
    }

    hoverEnabledRef.current = true;
    const pointer = lastPointerRef.current;
    const rect = viewportRef.current?.getBoundingClientRect() ?? new DOMRect();
    mouseRawRef.current.clientX = pointer.clientX;
    mouseRawRef.current.clientY = pointer.clientY;
    mouseRawRef.current.active = isPointerInsideRect(
      pointer.clientX,
      pointer.clientY,
      rect,
    );
    startLoop();
  }, [drillProgress, drillOutRegion, reduceMotion, startLoop]);

  useLayoutEffect(() => {
    if (!drillRegion && !drillOutRegion) {
      drillAnimRef.current = null;
      drillTargetRef.current = null;
      drillSessionRef.current = null;
      exitLiveEndCameraRef.current = null;
      exitLiveEndVelocityRef.current = createDrillCameraVelocity();
      exitLiveProgressRef.current = 0;
      exitVisibleVelocityRef.current = createZeroDrillCameraState();
      return;
    }

    const region = drillRegion ?? drillOutRegion;
    if (!region) return;

    const sessionKey = `${region.id}:${drillRegion ? "in" : "out"}`;
    if (sessionKey === drillSessionRef.current) return;

    drillSessionRef.current = sessionKey;
    initDrillAnim();
    if (drillProgress != null) {
      syncDrillCamera(drillProgress);
    }
  }, [
    drillRegion,
    drillOutRegion,
    drillProgress,
    initDrillAnim,
    syncDrillCamera,
  ]);

  useEffect(() => {
    if (drillProgress == null) {
      drillAnimRef.current = null;
      drillTargetRef.current = null;
      drillSessionRef.current = null;
      exitLiveEndCameraRef.current = null;
      exitLiveEndVelocityRef.current = createDrillCameraVelocity();
      exitLiveProgressRef.current = 0;
      exitVisibleVelocityRef.current = createZeroDrillCameraState();
      return;
    }
    if (!drillAnimRef.current && !initDrillAnim()) return;
    syncDrillCamera(drillProgress);
  }, [drillProgress, initDrillAnim, syncDrillCamera]);

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (reduceMotion || interactionLockedRef.current) return;
      syncPointerState(e.clientX, e.clientY, true);
    },
    [reduceMotion, syncPointerState],
  );

  const handleMouseEnter = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (reduceMotion || interactionLockedRef.current || !hoverEnabledRef.current) {
        return;
      }
      syncPointerState(e.clientX, e.clientY);
    },
    [reduceMotion, syncPointerState],
  );

  const handleImageLoad = useCallback(() => {
    refreshFit();
    if (drillProgress != null && initDrillAnim()) {
      syncDrillCamera(drillProgress);
      return;
    }
    if (campusHoldRegion) {
      applyHoldCamera(campusHoldRegion);
      return;
    }
    if (!hoverEnabledRef.current && !pendingHoverResumeRef.current) {
      applyRestCamera();
    }
  }, [
    campusHoldRegion,
    drillProgress,
    applyHoldCamera,
    applyRestCamera,
    initDrillAnim,
    refreshFit,
    syncDrillCamera,
  ]);

  return (
    <div
      ref={viewportRef}
      aria-label={
        isMobileMapMode
          ? "Campus map. Tap a building to open its floor plan."
          : "Campus map. Move the pointer over a building to explore."
      }
      className={cn(
        "relative h-full w-full overflow-hidden bg-surface-subtle",
        isMobileMapMode && "touch-none select-none",
        className,
      )}
      onMouseMove={interactionLocked || isMobileMapMode ? undefined : handleMouseMove}
      onMouseEnter={interactionLocked || isMobileMapMode ? undefined : handleMouseEnter}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div
          className={cn(mapRotated && "origin-center")}
          style={
            mapRotated ? { transform: `rotate(${MAP_ROTATE_DEG}deg)` } : undefined
          }
        >
          <div
            className="campus-map-glide relative will-change-transform"
            style={{
              width: bounds.fitW > 0 ? bounds.fitW : "100%",
              height: bounds.fitH > 0 ? bounds.fitH : "100%",
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${effectiveZoom})`,
              transformOrigin: `${focusOrigin.x}% ${focusOrigin.y}%`,
            }}
          >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={level.imageSrc}
            alt={`${level.title} campus map`}
            onLoad={handleImageLoad}
            className="pointer-events-none block h-full w-full object-contain mix-blend-screen"
            draggable={false}
          />

          <MapRegionSvgLayer
            regions={regions}
            variant="campus"
            mobileMode={isMobileMapMode}
            isRegionActive={isRegionActive}
            getColors={(region) =>
              resolveRegionColors(region, getRegionStatus?.(region) ?? null)
            }
            onRegionClick={interactionLocked ? undefined : onRegionClick}
          />

          <MapRegionLabelLayer
            regions={regions.filter(regionHasPolygon)}
            mobileMode={isMobileMapMode}
            mapRotated={mapRotated}
            isRegionActive={isRegionActive}
          />

          {regions
            .filter((region) => !regionHasPolygon(region))
            .map((region) => {
              const status = getRegionStatus?.(region);
              const colors = resolveRegionColors(region, status ?? null);
              const regionActive = isRegionActive?.(region) ?? true;

              return (
                <MapRegionRectButton
                  key={region.id}
                  region={region}
                  colors={regionActive ? colors : { fill: "transparent", stroke: "transparent" }}
                  interactive={regionActive}
                  onClick={
                    regionActive ? () => onRegionClick?.(region) : undefined
                  }
                  ariaLabel={region.label}
                />
              );
            })}

          {level.logoSrc ? (
            <div
              className="pointer-events-none absolute inset-0 z-30 will-change-transform"
              style={{
                transform: `translate3d(${logoParallaxPanX + logoPivotShiftX}px, ${logoParallaxPanY + logoPivotShiftY}px, 0) scale(${logoVisualScale})${logoUprightRotate}`,
                transformOrigin: `${focusOrigin.x}% ${focusOrigin.y}%`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={level.logoSrc}
                alt=""
                aria-hidden
                className="block h-full w-full object-contain"
                draggable={false}
              />
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
