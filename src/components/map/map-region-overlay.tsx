"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type MouseEvent as ReactMouseEvent } from "react";
import type { MapPoint, MapRegion } from "@/lib/map/map-config";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  FLOOR_STATUS_COLORS,
  MAP_STATUS_COLORS,
  fillMatchingStroke,
  type MapDisplayStatus,
} from "@/lib/map/status-colors";
import { clientToPercent, clientToSnappedImagePercent } from "@/lib/map/editor-utils";
import { MapPixelLoupe } from "@/components/map/map-pixel-loupe";
import {
  FLOOR_DIMMED_OPACITY,
  FLOOR_HOVER_MS,
  FLOOR_LABEL_DIMMED_SCALE,
  FLOOR_LABEL_HOVER_SCALE,
  FLOOR_LABEL_SELECTED_SCALE,
} from "@/lib/map/floor-room-camera";
import {
  lerpPolygonPoints,
  offsetPolygonPoints,
  polygonPointsAttr,
  regionHasPolygon,
  regionHoverGroupId,
  regionLabelAnchor,
} from "@/lib/map/region-geometry";
import { cn } from "@/lib/utils";

/** Equal padding pushed outward on hover (viewBox units, 0–100) */
const CAMPUS_HOVER_OUTSET = 0.42;
const CAMPUS_OUTSET_SMOOTH = 0.16;
/** Extra invisible hit slop on touch screens */
const CAMPUS_MOBILE_HIT_OUTSET = 0.75;
const FLOOR_MOBILE_HIT_OUTSET = 0.55;
/** Integer screen-px strokes so scaled maps do not alias to mixed 1px/2px edges. */
const FLOOR_STROKE_REST = 2;
const FLOOR_STROKE_HOVER = 6;
const FLOOR_STROKE_SELECTED = 7;
const INACTIVE_LABEL_SCALE = 0.5;
const LABEL_FIT_PAD_RATIO = 0.08;
const LABEL_FIT_PAD_MIN_PX = 4;
const LABEL_FIT_MIN_SCALE = 0.2;
export const INACTIVE_REGION_COLORS = {
  fill: "transparent",
  stroke: "transparent",
} as const;
const CAMPUS_STROKE_REST = 2;
const CAMPUS_STROKE_ACTIVE = 3;

function PolygonWithSmoothStroke({
  points,
  fill,
  fillOpacity = 1,
  stroke,
  strokeOpacity = 1,
  strokeWidth,
  className,
}: {
  points: string;
  fill: string;
  fillOpacity?: number;
  stroke: string;
  strokeOpacity?: number;
  strokeWidth: number;
  className?: string;
}) {
  return (
    <>
      <polygon
        points={points}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeOpacity={0.28 * strokeOpacity}
        strokeWidth={strokeWidth + 2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        paintOrder="fill stroke"
        shapeRendering="geometricPrecision"
        className={cn(
          "transition-[stroke-width] ease-out motion-reduce:transition-none",
          className,
        )}
        style={{ transitionDuration: `${FLOOR_HOVER_MS}ms` }}
      />
      <polygon
        points={points}
        fill="none"
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        className={cn(
          "transition-[stroke-width] ease-out motion-reduce:transition-none",
          className,
        )}
        style={{ transitionDuration: `${FLOOR_HOVER_MS}ms` }}
      />
    </>
  );
}

function CampusBuildingPolygon({
  basePoints,
  selected,
  hovered,
  mobileMode = false,
  interactive = true,
  onClick,
  onHoverChange,
}: {
  basePoints: MapPoint[];
  selected: boolean;
  hovered: boolean;
  mobileMode?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const outsetPoints = offsetPolygonPoints(basePoints, CAMPUS_HOVER_OUTSET);

  const runProgressLoop = useCallback(() => {
    const step = () => {
      const diff = targetRef.current - progressRef.current;
      if (Math.abs(diff) < 0.001) {
        progressRef.current = targetRef.current;
        setProgress(progressRef.current);
        rafRef.current = null;
        return;
      }
      progressRef.current += diff * CAMPUS_OUTSET_SMOOTH;
      setProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const setTargetProgress = useCallback(
    (next: number) => {
      targetRef.current = next;
      runProgressLoop();
    },
    [runProgressLoop],
  );

  useEffect(() => {
    setTargetProgress(interactive && (hovered || selected) ? 1 : 0);
  }, [hovered, selected, interactive, setTargetProgress]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const active = progress > 0.01 || selected;
  const morphedPoints = polygonPointsAttr(
    lerpPolygonPoints(basePoints, outsetPoints, progress),
  );
  const restPoints = polygonPointsAttr(basePoints);
  const hitPoints = polygonPointsAttr(
    mobileMode ? offsetPolygonPoints(basePoints, CAMPUS_MOBILE_HIT_OUTSET) : basePoints,
  );

  const setHovered = (next: boolean) => {
    onHoverChange?.(next);
  };

  if (!interactive) {
    return <g className="pointer-events-none" />;
  }

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => !mobileMode && setHovered(true)}
      onMouseLeave={() => !mobileMode && setHovered(false)}
      onPointerDown={(e) => {
        if (!mobileMode) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerUp={() => mobileMode && setHovered(false)}
      onPointerCancel={() => mobileMode && setHovered(false)}
      onClick={(e: ReactMouseEvent<SVGGElement>) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <PolygonWithSmoothStroke
        points={morphedPoints}
        fill={
          active
            ? `rgba(255, 255, 255, ${0.12 + progress * 0.1})`
            : "transparent"
        }
        stroke={active ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.95)"}
        strokeWidth={active ? CAMPUS_STROKE_ACTIVE : CAMPUS_STROKE_REST}
        className="pointer-events-none"
      />
      <polygon
        points={mobileMode ? hitPoints : restPoints}
        fill="transparent"
        stroke="none"
        className="pointer-events-auto"
      />
    </g>
  );
}

function FloorRoomPolygon({
  basePoints,
  colors,
  selected,
  hovered,
  dimmed = false,
  mobileMode = false,
  interactive = true,
  onClick,
  onHoverChange,
}: {
  basePoints: MapPoint[];
  colors: RegionColors;
  selected: boolean;
  hovered: boolean;
  dimmed?: boolean;
  mobileMode?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const points = polygonPointsAttr(basePoints);
  const hitPoints = polygonPointsAttr(
    mobileMode
      ? offsetPolygonPoints(basePoints, FLOOR_MOBILE_HIT_OUTSET)
      : basePoints,
  );

  const setHovered = (next: boolean) => {
    onHoverChange?.(next);
  };

  const opacity = dimmed ? FLOOR_DIMMED_OPACITY : 1;
  const stroke = interactive ? colors.stroke : "transparent";
  const fill = interactive ? fillMatchingStroke(stroke) : "transparent";

  if (!interactive) {
    return (
      <g className="pointer-events-none">
        <PolygonWithSmoothStroke
          points={points}
          fill="transparent"
          stroke="transparent"
          strokeWidth={FLOOR_STROKE_REST}
          className="pointer-events-none"
        />
      </g>
    );
  }

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => !mobileMode && setHovered(true)}
      onMouseLeave={() => !mobileMode && setHovered(false)}
      onPointerDown={(e) => {
        if (!mobileMode) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerUp={() => mobileMode && setHovered(false)}
      onPointerCancel={() => mobileMode && setHovered(false)}
      onClick={(e: ReactMouseEvent<SVGGElement>) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <PolygonWithSmoothStroke
        points={points}
        fill={fill}
        fillOpacity={opacity}
        stroke={stroke}
        strokeOpacity={opacity}
        strokeWidth={
          selected
            ? FLOOR_STROKE_SELECTED
            : hovered
              ? FLOOR_STROKE_HOVER
              : FLOOR_STROKE_REST
        }
        className="pointer-events-none"
      />
      <polygon
        points={hitPoints}
        fill="transparent"
        stroke="none"
        className="pointer-events-auto"
      />
    </g>
  );
}

interface RegionColors {
  fill: string;
  stroke: string;
}

export function resolveRegionColors(
  region: MapRegion,
  status?: PublicStatus | null,
  variant: "default" | "floor" = "default",
): RegionColors {
  const palette = variant === "floor" ? FLOOR_STATUS_COLORS : MAP_STATUS_COLORS;

  if (status && status in palette) {
    return palette[status as MapDisplayStatus];
  }
  if (region.childMapId) {
    return variant === "floor"
      ? { fill: fillMatchingStroke("#3b82f6"), stroke: "#3b82f6" }
      : { fill: "rgba(30, 77, 140, 0.18)", stroke: "#1e4d8c" };
  }
  if (region.spaceSlug) {
    return palette.Available;
  }
  return variant === "floor"
    ? {
        fill: fillMatchingStroke("rgba(255, 255, 255, 1)", 0.06),
        stroke: "rgba(255, 255, 255, 0.35)",
      }
    : { fill: "rgba(30, 77, 140, 0.08)", stroke: "rgba(30, 77, 140, 0.45)" };
}

interface MapRegionOverlayProps {
  region: MapRegion;
  colors: RegionColors;
  selected?: boolean;
  editMode?: boolean;
  variant?: "default" | "campus" | "floor";
  onClick?: () => void;
  label?: string;
  sublabel?: string;
  hovered?: boolean;
  mobileMode?: boolean;
  dimmed?: boolean;
  interactive?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}

export function MapRegionOverlay({
  region,
  colors,
  selected = false,
  editMode = false,
  variant = "default",
  mobileMode = false,
  onClick,
  label,
  sublabel,
  hovered = false,
  dimmed = false,
  interactive = true,
  onHoverChange,
}: MapRegionOverlayProps) {
  if (regionHasPolygon(region)) {
    const anchor = regionLabelAnchor(region);
    const displayLabel = label ?? region.label;
    const points = polygonPointsAttr(region.points);
    const isCampus = variant === "campus" && !editMode;
    const isFloor = variant === "floor" && !editMode;

    if (isCampus) {
      return (
        <CampusBuildingPolygon
          basePoints={region.points}
          selected={selected}
          hovered={hovered}
          mobileMode={mobileMode}
          interactive={interactive}
          onClick={onClick}
          onHoverChange={onHoverChange}
        />
      );
    }

    if (isFloor) {
      return (
        <FloorRoomPolygon
          basePoints={region.points}
          colors={interactive ? colors : INACTIVE_REGION_COLORS}
          selected={selected}
          hovered={hovered}
          dimmed={dimmed}
          mobileMode={mobileMode}
          interactive={interactive}
          onClick={onClick}
          onHoverChange={onHoverChange}
        />
      );
    }

    return (
      <g className="group">
        <polygon
          points={points}
          fill={colors.fill}
          stroke={selected ? "#facc15" : colors.stroke}
          strokeWidth={selected ? 0.55 : 0.4}
          vectorEffect="non-scaling-stroke"
          className={cn(
            editMode && (selected || !onClick)
              ? "pointer-events-none"
              : interactive
                ? "cursor-pointer"
                : "pointer-events-none",
            !editMode && interactive && "hover:brightness-110",
          )}
          onClick={
            !onClick
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  onClick();
                }
          }
        />
        {editMode ? (
          <text
            x={anchor.x}
            y={anchor.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none fill-white text-[2px] font-semibold"
          >
            {displayLabel}
          </text>
        ) : null}
      </g>
    );
  }

  return null;
}

export function MapRegionRectButton({
  region,
  colors,
  selected = false,
  editMode = false,
  variant = "default",
  interactive = true,
  onClick,
  label,
  sublabel,
  ariaLabel,
}: MapRegionOverlayProps & { ariaLabel?: string }) {
  const displayLabel = label ?? region.label;
  const isFloor = variant === "floor" && !editMode;

  if (editMode) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          "absolute z-10 border-2 border-dashed border-sky-400 bg-sky-400/20 text-left",
          selected && "border-solid border-yellow-400 bg-yellow-400/25",
        )}
        style={{
          left: `${region.x}%`,
          top: `${region.y}%`,
          width: `${region.width}%`,
          height: `${region.height}%`,
        }}
        aria-label={ariaLabel ?? displayLabel}
      >
        <span className="absolute left-0 top-0 max-w-full truncate bg-sky-600 px-1 text-[10px] text-white">
          {displayLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={(e) => {
        e.stopPropagation();
        if (!interactive) return;
        onClick?.();
      }}
      className={cn(
        "absolute",
        interactive
          ? "transition-all duration-200"
          : "pointer-events-none cursor-default",
        interactive && isFloor
          ? "border-[6px] hover:border-[10px] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-focus"
          : interactive
            ? "flex flex-col items-center justify-center border-2 hover:brightness-110 hover:scale-[1.02] focus-visible:scale-[1.02]"
            : isFloor
              ? "border-[6px]"
              : "flex flex-col items-center justify-center border-2",
        selected &&
          interactive &&
          !isFloor &&
          "ring-4 ring-focus ring-offset-1 ring-offset-surface-subtle",
      )}
      style={{
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
        backgroundColor: colors.fill,
        borderColor: colors.stroke,
      }}
      aria-label={ariaLabel ?? displayLabel}
    >
      {isFloor ? (
        sublabel ? (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-3 py-1 text-lg font-semibold text-white shadow-sm">
            {sublabel}
          </span>
        ) : null
      ) : (
        <>
          <span className="max-w-[95%] truncate rounded bg-surface/95 px-1.5 py-0.5 text-xs font-semibold text-text-primary shadow-sm">
            {displayLabel}
          </span>
          {sublabel ? (
            <span className="mt-0.5 text-[10px] font-medium text-action-primary">
              {sublabel}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

export function MapRegionSvgLayer({
  regions,
  getColors,
  selectedRegionId,
  editMode = false,
  variant = "default",
  mobileMode = false,
  isRegionActive,
  onRegionClick,
  onHoveredRegionChange,
}: {
  regions: MapRegion[];
  getColors: (region: MapRegion) => RegionColors;
  selectedRegionId?: string | null;
  editMode?: boolean;
  variant?: "default" | "campus" | "floor";
  mobileMode?: boolean;
  isRegionActive?: (region: MapRegion) => boolean;
  onRegionClick?: (region: MapRegion) => void;
  onHoveredRegionChange?: (regionId: string | null) => void;
  getSublabel?: (region: MapRegion) => string | undefined;
}) {
  const polygonRegions = regions.filter(regionHasPolygon);
  const [hoveredGroupCounts, setHoveredGroupCounts] = useState(
    () => new Map<string, number>(),
  );
  const hoverDeltaRef = useRef(new Map<string, number>());
  const flushRafRef = useRef<number | null>(null);

  const adjustGroupHover = useCallback((groupId: string, delta: number) => {
    hoverDeltaRef.current.set(
      groupId,
      (hoverDeltaRef.current.get(groupId) ?? 0) + delta,
    );
    if (flushRafRef.current != null) return;
    flushRafRef.current = requestAnimationFrame(() => {
      flushRafRef.current = null;
      setHoveredGroupCounts((prev) => {
        const next = new Map(prev);
        for (const [id, change] of hoverDeltaRef.current) {
          next.set(id, Math.max(0, (next.get(id) ?? 0) + change));
        }
        hoverDeltaRef.current.clear();
        return next;
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (flushRafRef.current != null) cancelAnimationFrame(flushRafRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!onHoveredRegionChange) return;
    let hovered: string | null = null;
    for (const [id, count] of hoveredGroupCounts) {
      if (count > 0) {
        hovered = id;
        break;
      }
    }
    onHoveredRegionChange(hovered);
  }, [hoveredGroupCounts, onHoveredRegionChange]);

  if (polygonRegions.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden={editMode && !onRegionClick}
    >
      <g
        className={
          editMode && !onRegionClick
            ? "pointer-events-none"
            : "pointer-events-auto"
        }
      >
        {polygonRegions.map((region) => {
          const groupId = regionHoverGroupId(region);
          const isHovered = (hoveredGroupCounts.get(groupId) ?? 0) > 0;
          const isSelected = selectedRegionId === region.id;
          const isDimmed = Boolean(
            selectedRegionId && selectedRegionId !== region.id,
          );
          const regionActive = editMode || (isRegionActive?.(region) ?? true);

          return (
            <MapRegionOverlay
              key={region.id}
              region={region}
              colors={getColors(region)}
              selected={isSelected}
              dimmed={isDimmed}
              editMode={editMode}
              variant={variant}
              mobileMode={mobileMode}
              hovered={isHovered}
              interactive={regionActive}
              onHoverChange={
                regionActive
                  ? (active) => adjustGroupHover(groupId, active ? 1 : -1)
                  : undefined
              }
              onClick={
                regionActive && onRegionClick
                  ? () => onRegionClick(region)
                  : undefined
              }
            />
          );
        })}
      </g>
    </svg>
  );
}

function FittedRegionLabel({
  region,
  sublabel,
  mobileMode,
  mapRotated,
  isHovered,
  isSelected,
  isDimmed,
  regionActive,
  floorLabels,
}: {
  region: MapRegion;
  sublabel?: string;
  mobileMode: boolean;
  mapRotated: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  regionActive: boolean;
  floorLabels: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const anchor = regionLabelAnchor(region);
  const interactionScale = !regionActive
    ? INACTIVE_LABEL_SCALE
    : floorLabels
      ? isSelected
        ? FLOOR_LABEL_SELECTED_SCALE
        : isDimmed
          ? FLOOR_LABEL_DIMMED_SCALE
          : isHovered
            ? FLOOR_LABEL_HOVER_SCALE
            : 1
      : 1;
  const labelScale = Math.min(interactionScale, fitScale);
  const baseTransform = mapRotated
    ? "translate(-50%, -50%) rotate(-90deg)"
    : "translate(-50%, -50%)";
  const labelLines =
    region.mapLabelLines && region.mapLabelLines.length > 0
      ? region.mapLabelLines
      : [region.label];

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return;

    let frame = 0;
    let observedParent: Element | null = null;
    const observer = new ResizeObserver(() => measure());

    const measure = () => {
      const parent = wrap.offsetParent as HTMLElement | null;
      if (!parent) {
        frame = window.requestAnimationFrame(measure);
        return;
      }
      if (observedParent !== parent) {
        if (observedParent) observer.unobserve(observedParent);
        observer.observe(parent);
        observedParent = parent;
      }

      const boxW = (region.width / 100) * parent.clientWidth;
      const boxH = (region.height / 100) * parent.clientHeight;
      const padX = Math.max(LABEL_FIT_PAD_MIN_PX, boxW * LABEL_FIT_PAD_RATIO);
      const padY = Math.max(LABEL_FIT_PAD_MIN_PX, boxH * LABEL_FIT_PAD_RATIO);
      const availW = Math.max(8, boxW - padX * 2);
      const availH = Math.max(8, boxH - padY * 2);
      const naturalW = content.offsetWidth;
      const naturalH = content.offsetHeight;
      if (naturalW <= 0 || naturalH <= 0) return;

      const localW = mapRotated ? availH : availW;
      const localH = mapRotated ? availW : availH;
      const next = Math.min(localW / naturalW, localH / naturalH);
      const clamped = Math.min(
        1,
        Math.max(LABEL_FIT_MIN_SCALE, Number.isFinite(next) ? next : 1),
      );
      setFitScale((prev) => (Math.abs(prev - clamped) < 0.001 ? prev : clamped));
    };

    observer.observe(content);
    measure();
    window.addEventListener("resize", measure);
    const fonts = document.fonts;
    void fonts?.ready.then(measure);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    mapRotated,
    mobileMode,
    region.height,
    region.label,
    region.mapLabelLines,
    region.width,
    sublabel,
  ]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-none absolute z-10 origin-center",
        isDimmed && "opacity-30",
      )}
      style={{
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transform: `${baseTransform} scale(${labelScale})`,
        transitionProperty:
          floorLabels && regionActive ? "transform, opacity" : "opacity",
        transitionDuration:
          floorLabels && regionActive ? `${FLOOR_HOVER_MS}ms` : "150ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        ref={contentRef}
        className="flex flex-col items-center gap-0.5 text-center"
      >
        <span
          className={cn(
            "rounded-lg bg-surface/94 font-semibold text-text-primary shadow-sm backdrop-blur-[1px]",
            mobileMode
              ? "px-3 py-1.5 text-lg leading-tight"
              : "px-4 py-2 text-[22px] leading-tight sm:text-2xl",
            labelLines.length === 1 && "whitespace-nowrap",
          )}
        >
          {labelLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
        {sublabel ? (
          <span className="rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-action-primary">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MapRegionLabelLayer({
  regions,
  getSublabel,
  mobileMode = false,
  mapRotated = false,
  hoveredRegionId = null,
  selectedRegionId = null,
  floorLabels = false,
  isRegionActive,
}: {
  regions: MapRegion[];
  getSublabel?: (region: MapRegion) => string | undefined;
  mobileMode?: boolean;
  mapRotated?: boolean;
  hoveredRegionId?: string | null;
  selectedRegionId?: string | null;
  floorLabels?: boolean;
  isRegionActive?: (region: MapRegion) => boolean;
}) {
  const labeledRegions = regions.filter((region) => !region.hideLabel);
  if (labeledRegions.length === 0) return null;

  return (
    <>
      {labeledRegions.map((region) => {
        const isHovered =
          hoveredRegionId === region.id ||
          hoveredRegionId === regionHoverGroupId(region);
        const isSelected = selectedRegionId === region.id;
        const isDimmed = Boolean(
          selectedRegionId && selectedRegionId !== region.id,
        );
        const regionActive = isRegionActive?.(region) ?? true;

        return (
          <FittedRegionLabel
            key={region.id}
            region={region}
            sublabel={getSublabel?.(region)}
            mobileMode={mobileMode}
            mapRotated={mapRotated}
            isHovered={isHovered}
            isSelected={isSelected}
            isDimmed={isDimmed}
            regionActive={regionActive}
            floorLabels={floorLabels}
          />
        );
      })}
    </>
  );
}

export function PolygonVertexEditor({
  points,
  onPointsChange,
  mapLayerRef,
  imgRef,
}: {
  points: MapPoint[];
  onPointsChange: (points: MapPoint[]) => void;
  mapLayerRef: RefObject<HTMLDivElement | null>;
  imgRef: RefObject<HTMLImageElement | null>;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const pointsRef = useRef(points);
  const onPointsChangeRef = useRef(onPointsChange);

  useLayoutEffect(() => {
    pointsRef.current = points;
    onPointsChangeRef.current = onPointsChange;
  }, [points, onPointsChange]);

  const snapClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const mapLayer = mapLayerRef.current;
      if (!mapLayer) return null;
      const mapRect = mapLayer.getBoundingClientRect();
      const img = imgRef.current;
      if (img?.naturalWidth && img.naturalHeight) {
        return clientToSnappedImagePercent(
          clientX,
          clientY,
          mapRect,
          img.naturalWidth,
          img.naturalHeight,
        ).point;
      }
      return clientToPercent(clientX, clientY, mapRect);
    },
    [imgRef, mapLayerRef],
  );

  useEffect(() => {
    if (dragIndex === null) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      setPointer({ x: e.clientX, y: e.clientY });
      const next = snapClientPoint(e.clientX, e.clientY);
      if (!next) return;
      onPointsChangeRef.current(
        pointsRef.current.map((point, index) =>
          index === dragIndex ? next : point,
        ),
      );
    };

    const onUp = () => {
      setDragIndex(null);
    };

    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true });
    window.addEventListener("pointercancel", onUp, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onUp, { capture: true });
    };
  }, [dragIndex, snapClientPoint]);

  if (points.length < 3) return null;

  const activeIndex = dragIndex ?? hoverIndex;
  const focusPercent = activeIndex != null ? points[activeIndex] ?? null : null;
  const loupeActive = focusPercent != null && pointer != null;

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={polygonPointsAttr(points)}
          fill="none"
          stroke="#facc15"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray="6 4"
        />
      </svg>
      {points.map((point, index) => (
        <button
          key={`vertex-${index}`}
          type="button"
          data-map-vertex=""
          aria-label={`Drag corner ${index + 1}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setPointer({ x: e.clientX, y: e.clientY });
            setHoverIndex(index);
            setDragIndex(index);
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={(e) => {
            setHoverIndex(index);
            setPointer({ x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => {
            if (dragIndex !== null) return;
            setPointer({ x: e.clientX, y: e.clientY });
          }}
          onPointerLeave={() => {
            if (dragIndex !== null) return;
            setHoverIndex(null);
          }}
          className={cn(
            "absolute z-50 flex size-8 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center",
            dragIndex === index ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
          }}
        >
          <span
            className={cn(
              "rounded-full border-2 border-white bg-amber-400 shadow-md",
              dragIndex === index || hoverIndex === index ? "size-5" : "size-4",
            )}
          />
        </button>
      ))}
      <MapPixelLoupe
        visible={loupeActive}
        clientX={pointer?.x ?? 0}
        clientY={pointer?.y ?? 0}
        focusPercent={focusPercent}
        mapLayerRef={mapLayerRef}
        imgRef={imgRef}
      />
    </>
  );
}

export function PolygonDraftOverlay({
  points,
  cursorPoint,
  closed = false,
}: {
  points: MapPoint[];
  cursorPoint?: MapPoint | null;
  closed?: boolean;
}) {
  if (points.length === 0) return null;

  const linePoints = cursorPoint ? [...points, cursorPoint] : points;
  const polylineAttr = polygonPointsAttr(linePoints);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {points.length >= 2 ? (
        <polyline
          points={polylineAttr}
          fill="none"
          stroke="#facc15"
          strokeWidth={0.45}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={closed ? undefined : "1.2 0.8"}
        />
      ) : null}
      {closed && points.length >= 3 ? (
        <polygon
          points={polygonPointsAttr(points)}
          fill="rgba(250, 204, 21, 0.2)"
          stroke="#facc15"
          strokeWidth={0.45}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {points.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === 0 ? 1.1 : 0.75}
          fill={index === 0 ? "#facc15" : "#ffffff"}
          stroke={index === 0 ? "#ffffff" : "#facc15"}
          strokeWidth={0.35}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
