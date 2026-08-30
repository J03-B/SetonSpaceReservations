"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MapLevel, MapRegion } from "@/lib/map/map-config";
import {
  getMapFloorCount,
  mapLevelForFloor,
} from "@/lib/map/map-config";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  FLOOR_STACK_MS,
  floorStackEndPose,
  floorStackLayerStyle,
  floorStackStartPose,
  type FloorStackDirection,
  type FloorStackPose,
} from "@/lib/map/floor-stack";
import { InteractiveMapCanvas } from "./interactive-map-canvas";
import { cn } from "@/lib/utils";

interface BuildingFloorStackProps {
  level: MapLevel;
  floorIndex: number;
  getRegionStatus?: (region: MapRegion) => PublicStatus | null;
  isRegionActive?: (region: MapRegion) => boolean;
  onRegionClick?: (region: MapRegion) => void;
  selectedRegionId?: string | null;
  showRequestPanel?: boolean;
  drillProgress?: number | null;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function FloorLayer({
  level,
  pose,
  reducedMotion,
  animate,
  interactive,
  onTop,
  getRegionStatus,
  isRegionActive,
  onRegionClick,
  selectedRegionId,
  drillProgress,
  iconFloorIndex,
  showRequestPanel,
}: {
  level: MapLevel;
  pose: FloorStackPose;
  reducedMotion: boolean;
  animate: boolean;
  interactive: boolean;
  onTop?: boolean;
  getRegionStatus?: (region: MapRegion) => PublicStatus | null;
  isRegionActive?: (region: MapRegion) => boolean;
  onRegionClick?: (region: MapRegion) => void;
  selectedRegionId?: string | null;
  drillProgress?: number | null;
  iconFloorIndex: number;
  showRequestPanel?: boolean;
}) {
  const currentRegionId = level.regions.some(
    (region) => region.id === selectedRegionId,
  )
    ? selectedRegionId
    : null;

  return (
    <div
      className={cn(
        "absolute inset-0",
        interactive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{
        ...floorStackLayerStyle(pose, reducedMotion, animate),
        zIndex: onTop || interactive ? 20 : 10,
      }}
      aria-hidden={!interactive}
    >
      <InteractiveMapCanvas
        level={level}
        regions={level.regions}
        getRegionStatus={getRegionStatus}
        isRegionActive={isRegionActive}
        onRegionClick={interactive ? onRegionClick : undefined}
        variant="floor"
        fullBleed
        fitToChrome
        drillProgress={drillProgress}
        iconFloorIndex={iconFloorIndex}
        className="h-full"
        selectedRegionId={interactive ? currentRegionId : null}
        showRequestPanel={showRequestPanel}
      />
    </div>
  );
}

export function BuildingFloorStack({
  level,
  floorIndex,
  getRegionStatus,
  isRegionActive,
  onRegionClick,
  selectedRegionId,
  drillProgress = null,
  className,
  showRequestPanel = false,
}: BuildingFloorStackProps) {
  const floorCount = getMapFloorCount(level);
  const reducedMotion = prefersReducedMotion();
  const [shownIndex, setShownIndex] = useState(floorIndex);
  const [anim, setAnim] = useState<{
    from: number;
    to: number;
    direction: FloorStackDirection;
    phase: "start" | "end";
  } | null>(null);
  const shownRef = useRef(shownIndex);
  const animRef = useRef(anim);

  useEffect(() => {
    for (const floor of level.floors ?? []) {
      const img = new Image();
      img.src = floor.imageSrc;
    }
  }, [level]);

  useLayoutEffect(() => {
    const heading = animRef.current?.to ?? shownRef.current;
    if (floorIndex === heading) return;

    const from = heading;
    const to = floorIndex;

    const direction: FloorStackDirection = to > from ? "up" : "down";
    const nextAnim = {
      from,
      to,
      direction,
      phase: "start" as const,
    };
    animRef.current = nextAnim;
    setAnim(nextAnim);

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setAnim((prev) => {
          if (!prev || prev.to !== to) return prev;
          const ended = { ...prev, phase: "end" as const };
          animRef.current = ended;
          return ended;
        });
      });
    });

    const done = window.setTimeout(() => {
      shownRef.current = to;
      animRef.current = null;
      setShownIndex(to);
      setAnim(null);
    }, FLOOR_STACK_MS);

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(done);
    };
  }, [floorIndex]);

  if (floorCount <= 1 || drillProgress != null) {
    const displayed = mapLevelForFloor(level, floorIndex);
    return (
      <div className={cn("relative h-full w-full", className)}>
        <InteractiveMapCanvas
          level={displayed}
          regions={displayed.regions}
          getRegionStatus={getRegionStatus}
          isRegionActive={isRegionActive}
          onRegionClick={onRegionClick}
          variant="floor"
          fullBleed
          fitToChrome
          drillProgress={drillProgress}
          iconFloorIndex={floorIndex}
          className="h-full"
          selectedRegionId={selectedRegionId}
          showRequestPanel={showRequestPanel}
        />
      </div>
    );
  }

  const currentIndex = anim ? anim.to : shownIndex;
  const belowIndex = currentIndex - 1;
  const fromLevel = anim ? mapLevelForFloor(level, anim.from) : null;
  const toLevel = mapLevelForFloor(level, currentIndex);
  const belowLevel =
    !anim && belowIndex >= 0 ? mapLevelForFloor(level, belowIndex) : null;

  const fromPose: FloorStackPose = anim
    ? anim.phase === "start"
      ? floorStackStartPose("from", anim.direction)
      : floorStackEndPose("from", anim.direction)
    : "ghost";
  const toPose: FloorStackPose = anim
    ? anim.phase === "start"
      ? floorStackStartPose("to", anim.direction)
      : floorStackEndPose("to", anim.direction)
    : "current";

  return (
    <div
      className={cn("relative h-full w-full", className)}
      style={{
        perspective: "1700px",
        perspectiveOrigin: "50% 42%",
      }}
    >
      {anim && fromLevel ? (
        <FloorLayer
          key={anim.from}
          level={fromLevel}
          pose={fromPose}
          reducedMotion={reducedMotion}
          animate
          interactive={false}
          onTop={anim.direction === "down"}
          getRegionStatus={getRegionStatus}
          isRegionActive={isRegionActive}
          drillProgress={null}
          iconFloorIndex={anim.from}
        />
      ) : belowLevel && !selectedRegionId ? (
        <FloorLayer
          key={belowIndex}
          level={belowLevel}
          pose="ghost"
          reducedMotion={reducedMotion}
          animate={false}
          interactive={false}
          getRegionStatus={getRegionStatus}
          isRegionActive={isRegionActive}
          drillProgress={null}
          iconFloorIndex={belowIndex}
        />
      ) : null}

      <FloorLayer
        key={currentIndex}
        level={toLevel}
        pose={anim ? toPose : "current"}
        reducedMotion={reducedMotion}
        animate={Boolean(anim)}
        interactive={!anim}
        onTop={anim?.direction !== "down"}
        getRegionStatus={getRegionStatus}
        isRegionActive={isRegionActive}
        onRegionClick={onRegionClick}
        selectedRegionId={selectedRegionId}
        drillProgress={null}
        iconFloorIndex={currentIndex}
        showRequestPanel={showRequestPanel}
      />
    </div>
  );
}
