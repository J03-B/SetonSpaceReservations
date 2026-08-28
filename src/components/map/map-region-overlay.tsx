"use client";

import { useCallback, useEffect, useRef, useState, type RefObject, type MouseEvent as ReactMouseEvent } from "react";
import type { MapPoint, MapRegion } from "@/lib/map/map-config";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  FLOOR_STATUS_COLORS,
  MAP_STATUS_COLORS,
  type MapDisplayStatus,
} from "@/lib/map/status-colors";
import { clientToPercent } from "@/lib/map/editor-utils";
import {
  FLOOR_DIMMED_OPACITY,
  FLOOR_LABEL_HOVER_SCALE,
  FLOOR_LABEL_SELECTED_SCALE,
  FLOOR_ROOM_FOCUS_MS,
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
const FLOOR_STROKE_HOVER = 3;
const FLOOR_STROKE_SELECTED = 4;
const CAMPUS_STROKE_REST = 2;
const CAMPUS_STROKE_ACTIVE = 3;

function PolygonWithSmoothStroke({
  points,
  fill,
  fillOpacity,
  stroke,
  strokeWidth,
  className,
}: {
  points: string;
  fill: string;
  fillOpacity?: number;
  stroke: string;
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
        strokeOpacity={0.28}
        strokeWidth={strokeWidth + 2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        paintOrder="fill stroke"
        shapeRendering="geometricPrecision"
        className={className}
      />
      <polygon
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        className={className}
      />
    </>
  );
}

function CampusBuildingPolygon({
  basePoints,
  selected,
  hovered,
  mobileMode = false,
  onClick,
  onHoverChange,
}: {
  basePoints: MapPoint[];
  selected: boolean;
  hovered: boolean;
  mobileMode?: boolean;
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
    setTargetProgress(hovered || selected ? 1 : 0);
  }, [hovered, selected, setTargetProgress]);

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
  onClick,
  onHoverChange,
}: {
  basePoints: MapPoint[];
  colors: RegionColors;
  selected: boolean;
  hovered: boolean;
  dimmed?: boolean;
  mobileMode?: boolean;
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
        fill={colors.fill}
        fillOpacity={dimmed ? FLOOR_DIMMED_OPACITY : 1}
        stroke={selected ? "#facc15" : colors.stroke}
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
      ? { fill: "rgba(30, 77, 140, 0.12)", stroke: "#3b82f6" }
      : { fill: "rgba(30, 77, 140, 0.18)", stroke: "#1e4d8c" };
  }
  if (region.spaceSlug) {
    return palette.Available;
  }
  return variant === "floor"
    ? { fill: "rgba(255, 255, 255, 0.06)", stroke: "rgba(255, 255, 255, 0.35)" }
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
          onClick={onClick}
          onHoverChange={onHoverChange}
        />
      );
    }

    if (isFloor) {
      return (
        <FloorRoomPolygon
          basePoints={region.points}
          colors={colors}
          selected={selected}
          hovered={hovered}
          dimmed={dimmed}
          mobileMode={mobileMode}
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
            editMode ? "pointer-events-none" : "cursor-pointer",
            !editMode && "hover:brightness-110",
          )}
          onClick={
            editMode
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  onClick?.();
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
  onClick,
  label,
  sublabel,
  ariaLabel,
}: MapRegionOverlayProps & { ariaLabel?: string }) {
  const displayLabel = label ?? region.label;
  const isFloor = variant === "floor" && !editMode;

  if (editMode) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute border-2 border-dashed border-sky-400 bg-sky-400/20",
          selected && "border-solid border-yellow-400 bg-yellow-400/25",
        )}
        style={{
          left: `${region.x}%`,
          top: `${region.y}%`,
          width: `${region.width}%`,
          height: `${region.height}%`,
        }}
      >
        <span className="absolute left-0 top-0 max-w-full truncate bg-sky-600 px-1 text-[10px] text-white">
          {displayLabel}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "absolute transition-all duration-200",
        isFloor
          ? "border-[6px] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-focus"
          : "flex flex-col items-center justify-center border-2 hover:brightness-110 hover:scale-[1.02] focus-visible:scale-[1.02]",
        selected && "ring-4 ring-focus ring-offset-1 ring-offset-surface-subtle",
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
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
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
  onRegionClick,
  onHoveredRegionChange,
}: {
  regions: MapRegion[];
  getColors: (region: MapRegion) => RegionColors;
  selectedRegionId?: string | null;
  editMode?: boolean;
  variant?: "default" | "campus" | "floor";
  mobileMode?: boolean;
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden={editMode}
    >
      <g className={editMode ? "pointer-events-none" : "pointer-events-auto"}>
        {polygonRegions.map((region) => {
          const groupId = regionHoverGroupId(region);
          const isHovered = (hoveredGroupCounts.get(groupId) ?? 0) > 0;
          const isSelected = selectedRegionId === region.id;
          const isDimmed = Boolean(
            selectedRegionId && selectedRegionId !== region.id,
          );

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
              onHoverChange={(active) =>
                adjustGroupHover(groupId, active ? 1 : -1)
              }
              onClick={() => onRegionClick?.(region)}
            />
          );
        })}
      </g>
    </svg>
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
}: {
  regions: MapRegion[];
  getSublabel?: (region: MapRegion) => string | undefined;
  mobileMode?: boolean;
  mapRotated?: boolean;
  hoveredRegionId?: string | null;
  selectedRegionId?: string | null;
  floorLabels?: boolean;
}) {
  const labeledRegions = regions.filter((region) => !region.hideLabel);
  if (labeledRegions.length === 0) return null;

  return (
    <>
      {labeledRegions.map((region) => {
        const anchor = regionLabelAnchor(region);
        const sublabel = getSublabel?.(region);
        const isHovered = hoveredRegionId === region.id;
        const isSelected = selectedRegionId === region.id;
        const isDimmed = Boolean(
          selectedRegionId && selectedRegionId !== region.id,
        );
        const labelScale = floorLabels
          ? isSelected
            ? FLOOR_LABEL_SELECTED_SCALE
            : isHovered
              ? FLOOR_LABEL_HOVER_SCALE
              : 1
          : 1;
        const baseTransform = mapRotated
          ? "translate(-50%, -50%) rotate(-90deg)"
          : "translate(-50%, -50%)";
        const labelLines =
          region.mapLabelLines && region.mapLabelLines.length > 0
            ? region.mapLabelLines
            : [region.label];
        const campusLabel = !floorLabels;

        return (
          <div
            key={region.id}
            className={cn(
              "pointer-events-none absolute z-10 flex flex-col items-center gap-0.5 text-center",
              isDimmed && "opacity-30",
            )}
            style={{
              left: `${anchor.x}%`,
              top: `${anchor.y}%`,
              transform: `${baseTransform} scale(${labelScale})`,
              transitionProperty: floorLabels
                ? "transform, opacity"
                : "opacity",
              transitionDuration: floorLabels
                ? `${FLOOR_ROOM_FOCUS_MS}ms`
                : "300ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <span
              className={cn(
                "rounded-lg bg-surface/94 font-semibold text-text-primary shadow-sm backdrop-blur-[1px]",
                campusLabel
                  ? mobileMode
                    ? "max-w-[15rem] px-3 py-1.5 text-lg leading-tight"
                    : "max-w-[24rem] px-4 py-2 text-[22px] leading-tight sm:text-2xl"
                  : mobileMode
                    ? "max-w-[7.5rem] px-1.5 py-0.5 text-[9px] leading-tight"
                    : "max-w-[10.5rem] px-2 py-1 text-[11px] leading-snug sm:max-w-[12rem] sm:text-xs",
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
        );
      })}
    </>
  );
}

export function PolygonVertexEditor({
  points,
  onPointsChange,
  mapLayerRef,
}: {
  points: MapPoint[];
  onPointsChange: (points: MapPoint[]) => void;
  mapLayerRef: RefObject<HTMLDivElement | null>;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    if (dragIndex === null) return;

    const onMove = (e: PointerEvent) => {
      const mapLayer = mapLayerRef.current;
      if (!mapLayer) return;
      const mapRect = mapLayer.getBoundingClientRect();
      const percent = clientToPercent(e.clientX, e.clientY, mapRect);
      onPointsChange(
        pointsRef.current.map((point, index) =>
          index === dragIndex ? percent : point,
        ),
      );
    };

    const onUp = () => setDragIndex(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragIndex, mapLayerRef, onPointsChange]);

  if (points.length < 3) return null;

  return (
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
        strokeWidth={0.45}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="1.2 0.8"
      />
      {points.map((point, index) => (
        <circle
          key={`vertex-${index}`}
          cx={point.x}
          cy={point.y}
          r={1.35}
          fill="#facc15"
          stroke="#ffffff"
          strokeWidth={0.35}
          vectorEffect="non-scaling-stroke"
          className={cn(
            "pointer-events-auto touch-none",
            dragIndex === index ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragIndex(index);
          }}
        />
      ))}
    </svg>
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
