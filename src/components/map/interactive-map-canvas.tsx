"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapLevel, MapRegion } from "@/lib/map/map-config";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  MAP_STATUS_COLORS,
  type MapDisplayStatus,
} from "@/lib/map/status-colors";
import { clientToPercent, computeObjectContainFit } from "@/lib/map/editor-utils";
import {
  computeFloorRoomCamera,
  easeInOutCubic,
  easeOutCubic,
  FLOOR_ROOM_FOCUS_MS,
  FLOOR_ROOM_REST_CAMERA,
  FLOOR_ROOM_SWITCH_MS,
  floorRoomCameraToStyle,
  lerpFloorRoomCamera,
  type FloorRoomCamera,
} from "@/lib/map/floor-room-camera";
import { MAP_FLOOR_INSET } from "@/components/map/map-chrome-motion";
import { CampusMapViewport } from "./campus-map-viewport";
import {
  MapRegionLabelLayer,
  MapRegionRectButton,
  MapRegionSvgLayer,
  resolveRegionColors,
} from "./map-region-overlay";
import { regionHasPolygon } from "@/lib/map/region-geometry";
import { cn } from "@/lib/utils";
import { useMobileMapMode } from "@/hooks/use-mobile-map-mode";
import type { DrillCameraState } from "@/lib/map/drill-frame";

export interface PendingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InteractiveMapCanvasProps {
  level: MapLevel;
  regions: MapRegion[];
  getRegionStatus?: (region: MapRegion) => PublicStatus | null;
  onRegionClick?: (region: MapRegion) => void;
  onMapClick?: (percent: { x: number; y: number }) => void;
  editMode?: boolean;
  pendingRect?: PendingRect | null;
  firstCorner?: { x: number; y: number } | null;
  selectedRegionId?: string | null;
  variant?: "campus" | "floor";
  fullBleed?: boolean;
  drillRegion?: MapRegion | null;
  drillOutRegion?: MapRegion | null;
  drillProgress?: number | null;
  campusHoldRegion?: MapRegion | null;
  onDrillCameraChange?: (camera: DrillCameraState) => void;
  className?: string;
}

export function InteractiveMapCanvas({
  level,
  regions,
  getRegionStatus,
  onRegionClick,
  onMapClick,
  editMode = false,
  pendingRect,
  firstCorner,
  selectedRegionId,
  variant = "floor",
  fullBleed = false,
  drillRegion = null,
  drillOutRegion = null,
  drillProgress = null,
  campusHoldRegion = null,
  onDrillCameraChange,
  className,
}: InteractiveMapCanvasProps) {
  const isMobileMapMode = useMobileMapMode();
  const isCampus = variant === "campus";
  const isFloor = variant === "floor";
  const reserveFloorInset = isFloor && fullBleed;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [fit, setFit] = useState({ fitW: 0, fitH: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const cameraRef = useRef<FloorRoomCamera>(FLOOR_ROOM_REST_CAMERA);
  const [camera, setCamera] = useState<FloorRoomCamera>(FLOOR_ROOM_REST_CAMERA);
  const animRafRef = useRef<number | null>(null);

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );

  const dimsKey = `${fit.fitW}x${fit.fitH}x${containerSize.w}x${containerSize.h}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setContainerSize({
        w: container.clientWidth,
        h: container.clientHeight,
      });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFloor || fit.fitW <= 0 || containerSize.w <= 0) return;

    const toCamera = selectedRegion
      ? computeFloorRoomCamera(
          selectedRegion,
          fit.fitW,
          fit.fitH,
          containerSize.w,
          containerSize.h,
        )
      : FLOOR_ROOM_REST_CAMERA;

    const fromCamera = cameraRef.current;
    const fromZoomed = fromCamera.scale > 1.04;
    const toZoomed = toCamera.scale > 1.04;
    const isRoomSwitch = fromZoomed && toZoomed && Boolean(selectedRegionId);
    const duration = isRoomSwitch
      ? FLOOR_ROOM_SWITCH_MS
      : FLOOR_ROOM_FOCUS_MS;
    const ease = isRoomSwitch ? easeInOutCubic : easeOutCubic;

    if (animRafRef.current != null) {
      cancelAnimationFrame(animRafRef.current);
    }

    const startTime = performance.now();

    const frame = (now: number) => {
      const raw = Math.min(1, (now - startTime) / duration);
      const eased = ease(raw);
      const next = lerpFloorRoomCamera(fromCamera, toCamera, eased);
      cameraRef.current = next;
      setCamera(next);

      if (raw < 1) {
        animRafRef.current = requestAnimationFrame(frame);
        return;
      }

      cameraRef.current = toCamera;
      setCamera(toCamera);
      animRafRef.current = null;
    };

    animRafRef.current = requestAnimationFrame(frame);

    return () => {
      if (animRafRef.current != null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
    };
  }, [
    isFloor,
    selectedRegionId,
    selectedRegion,
    dimsKey,
    fit.fitW,
    fit.fitH,
    containerSize.w,
    containerSize.h,
  ]);

  const floorFocusStyle = useMemo(() => {
    if (!isFloor) return undefined;
    return floorRoomCameraToStyle(camera);
  }, [isFloor, camera]);

  const refreshFit = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img?.naturalWidth) return;

    const next = computeObjectContainFit(
      container.clientWidth,
      container.clientHeight,
      img.naturalWidth,
      img.naturalHeight,
    );
    setFit({ fitW: next.fitW, fitH: next.fitH });
  }, []);

  useEffect(() => {
    refreshFit();
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      refreshFit();
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => refreshFit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [refreshFit, level.imageSrc]);

  const handleMapPointer = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onMapClick || !mapLayerRef.current) return;
      const mapRect = mapLayerRef.current.getBoundingClientRect();
      onMapClick(clientToPercent(e.clientX, e.clientY, mapRect));
    },
    [onMapClick],
  );

  if (isCampus && !editMode) {
    return (
      <CampusMapViewport
        level={level}
        regions={regions}
        getRegionStatus={getRegionStatus}
        onRegionClick={onRegionClick}
        drillRegion={drillRegion}
        drillOutRegion={drillOutRegion}
        drillProgress={drillProgress}
        campusHoldRegion={campusHoldRegion}
        onDrillCameraChange={onDrillCameraChange}
        className={className}
      />
    );
  }

  const regionOverlays = (
    <>
      {!editMode && (
        <>
          <MapRegionSvgLayer
            regions={regions}
            mobileMode={isMobileMapMode}
            getColors={(region) =>
              resolveRegionColors(
                region,
                getRegionStatus?.(region) ?? null,
                isFloor ? "floor" : "default",
              )
            }
            variant={isFloor ? "floor" : "default"}
            selectedRegionId={selectedRegionId}
            onRegionClick={onRegionClick}
            onHoveredRegionChange={isFloor ? setHoveredRegionId : undefined}
          />
          <MapRegionLabelLayer
            regions={regions.filter(regionHasPolygon)}
            hoveredRegionId={isFloor ? hoveredRegionId : null}
            selectedRegionId={isFloor ? selectedRegionId : null}
            floorLabels={isFloor}
            getSublabel={
              isFloor
                ? undefined
                : (region) => {
                    const status = getRegionStatus?.(region);
                    if (status) {
                      return (
                        MAP_STATUS_COLORS[status as MapDisplayStatus]?.label ??
                        status
                      );
                    }
                    return region.childMapId ? "Enter →" : undefined;
                  }
            }
          />
          {regions
            .filter((region) => !regionHasPolygon(region))
            .map((region) => {
              const status = getRegionStatus?.(region);
              const colors = resolveRegionColors(
                region,
                status ?? null,
                isFloor ? "floor" : "default",
              );
              const isSelected = selectedRegionId === region.id;

              return (
                <MapRegionRectButton
                  key={region.id}
                  region={region}
                  colors={colors}
                  variant={isFloor ? "floor" : "default"}
                  selected={isSelected}
                  onClick={() => onRegionClick?.(region)}
                  sublabel={
                    isFloor
                      ? undefined
                      : status
                        ? (MAP_STATUS_COLORS[status as MapDisplayStatus]
                            ?.label ?? status)
                        : region.childMapId
                          ? "Enter →"
                          : undefined
                  }
                  ariaLabel={`${region.label}${!isFloor && status ? `: ${MAP_STATUS_COLORS[status as MapDisplayStatus]?.label ?? status}` : region.childMapId ? ". Click to enter building." : ". Click for details."}`}
                />
              );
            })}
        </>
      )}

      {editMode && (
        <>
          {regions.map((region) => (
            <div
              key={region.id}
              className={cn(
                "pointer-events-none absolute border-2 border-dashed border-sky-400 bg-sky-400/20",
                selectedRegionId === region.id &&
                  "border-solid border-yellow-400 bg-yellow-400/25",
              )}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-sky-600 px-1 text-[10px] text-white">
                {region.label}
              </span>
            </div>
          ))}

          {firstCorner ? (
            <div
              className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 ring-2 ring-white"
              style={{ left: `${firstCorner.x}%`, top: `${firstCorner.y}%` }}
            />
          ) : null}

          {pendingRect && pendingRect.width > 0 && pendingRect.height > 0 ? (
            <div
              className="pointer-events-none absolute z-10 border-2 border-yellow-400 bg-yellow-400/20"
              style={{
                left: `${pendingRect.x}%`,
                top: `${pendingRect.y}%`,
                width: `${pendingRect.width}%`,
                height: `${pendingRect.height}%`,
              }}
            />
          ) : null}
        </>
      )}
    </>
  );

  return (
    <div
      className={cn(
        fullBleed ? "flex h-full w-full flex-col" : "mx-auto w-full max-w-5xl bg-transparent",
        className,
      )}
      style={
        reserveFloorInset
          ? {
              paddingTop: MAP_FLOOR_INSET,
              paddingBottom: MAP_FLOOR_INSET,
            }
          : undefined
      }
      role={editMode ? "application" : undefined}
      aria-label={editMode ? `Editing map: ${level.title}` : `Map: ${level.title}`}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden bg-transparent",
          fullBleed ? "min-h-0 flex-1" : "rounded-xl border border-border bg-surface-subtle shadow-sm",
          isMobileMapMode && "touch-manipulation",
        )}
        style={fullBleed ? undefined : { aspectRatio: "16 / 10" }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            ref={mapLayerRef}
            className={cn(
              "relative",
              editMode && onMapClick && "cursor-crosshair",
            )}
            style={{
              width: fit.fitW > 0 ? fit.fitW : "100%",
              height: fit.fitH > 0 ? fit.fitH : "100%",
            }}
            onClick={editMode ? handleMapPointer : undefined}
          >
            <div
              className="relative h-full w-full will-change-transform"
              style={floorFocusStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={level.imageSrc}
                alt={`${level.title} floor plan`}
                onLoad={refreshFit}
                className={cn(
                  "pointer-events-none block h-full w-full object-contain",
                  !editMode && (isCampus || isFloor) && "mix-blend-screen",
                )}
                draggable={false}
              />
              {regionOverlays}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
