"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MAP_IMAGES } from "@/lib/map/map-config";
import type { MapRegion } from "@/lib/map/map-config";
import type { DrillCameraState } from "@/lib/map/drill-frame";
import { computeFloorDrillFrameStyle } from "@/lib/map/drill-frame";
import { useMobileMapMode } from "@/hooks/use-mobile-map-mode";
import { cn } from "@/lib/utils";

interface BuildingDrillFrameProps {
  region: MapRegion;
  /** 0 = building footprint, 1 = full viewport */
  expansion: number;
  direction: "in" | "out";
  syncCamera?: DrillCameraState | null;
  drillStartCamera?: DrillCameraState | null;
  className?: string;
  children: ReactNode;
}

export function BuildingDrillFrame({
  region,
  expansion,
  direction,
  syncCamera = null,
  drillStartCamera = null,
  className,
  children,
}: BuildingDrillFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobileMapMode = useMobileMapMode();
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [imageSize, setImageSize] = useState({ w: 2400, h: 1350 });

  useEffect(() => {
    const img = new Image();
    img.src = MAP_IMAGES.campus;
    img.onload = () => {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frameStyle = useMemo(
    () =>
      computeFloorDrillFrameStyle(
        region,
        expansion,
        direction,
        viewport.w,
        viewport.h,
        imageSize.w,
        imageSize.h,
        isMobileMapMode,
        syncCamera,
        drillStartCamera,
      ),
    [
      region,
      expansion,
      direction,
      viewport.w,
      viewport.h,
      imageSize.w,
      imageSize.h,
      isMobileMapMode,
      syncCamera,
      drillStartCamera,
    ],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-10 overflow-hidden",
        className,
      )}
      aria-hidden={frameStyle.opacity < 0.05}
    >
      <div
        className="absolute inset-0 will-change-[transform,opacity]"
        style={{
          opacity: frameStyle.opacity,
          transform: frameStyle.transform,
          transformOrigin: frameStyle.transformOrigin,
        }}
      >
        <div className="pointer-events-auto h-full w-full">{children}</div>
      </div>
    </div>
  );
}
