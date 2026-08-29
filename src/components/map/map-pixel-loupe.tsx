"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { snapPercentToImagePixel } from "@/lib/map/editor-utils";

const LOUPE_SIZE = 184;
const PIXEL_SIZE = 10;
const CURSOR_GAP = 22;

interface MapPixelLoupeProps {
  visible: boolean;
  clientX: number;
  clientY: number;
  /** Map percent of the corner being edited — loupe shows this pixel, not the pointer. */
  focusPercent: { x: number; y: number } | null;
  mapLayerRef: RefObject<HTMLDivElement | null>;
  imgRef: RefObject<HTMLImageElement | null>;
}

export function MapPixelLoupe({
  visible,
  clientX,
  clientY,
  focusPercent,
  mapLayerRef,
  imgRef,
}: MapPixelLoupeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible || !focusPercent || typeof document === "undefined") {
    return null;
  }

  const mapLayer = mapLayerRef.current;
  const img = imgRef.current;
  if (!mapLayer || !img?.naturalWidth || !img.naturalHeight) return null;

  const mapRect = mapLayer.getBoundingClientRect();
  if (mapRect.width <= 0 || mapRect.height <= 0) return null;

  const snapped = snapPercentToImagePixel(
    focusPercent,
    img.naturalWidth,
    img.naturalHeight,
  );

  const spaceRight = window.innerWidth - clientX;
  const spaceTop = clientY;
  const offsetX =
    spaceRight < LOUPE_SIZE + CURSOR_GAP + 16
      ? -(LOUPE_SIZE + CURSOR_GAP)
      : CURSOR_GAP;
  const offsetY =
    spaceTop < LOUPE_SIZE + CURSOR_GAP + 16
      ? CURSOR_GAP
      : -(LOUPE_SIZE + CURSOR_GAP);

  const imageWidth = img.naturalWidth * PIXEL_SIZE;
  const imageHeight = img.naturalHeight * PIXEL_SIZE;
  const imageLeft = LOUPE_SIZE / 2 - (snapped.pixelX + 0.5) * PIXEL_SIZE;
  const imageTop = LOUPE_SIZE / 2 - (snapped.pixelY + 0.5) * PIXEL_SIZE;
  const gridOffsetX = imageLeft % PIXEL_SIZE;
  const gridOffsetY = imageTop % PIXEL_SIZE;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[80]"
      style={{
        left: clientX + offsetX,
        top: clientY + offsetY,
        width: LOUPE_SIZE,
      }}
      aria-hidden="true"
    >
      <div
        className="relative overflow-hidden rounded-full border-2 border-text-primary bg-surface shadow-xl"
        style={{ width: LOUPE_SIZE, height: LOUPE_SIZE }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt=""
          draggable={false}
          className="absolute max-w-none"
          style={{
            width: imageWidth,
            height: imageHeight,
            left: imageLeft,
            top: imageTop,
            imageRendering: "pixelated",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(26, 35, 50, 0.28) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(26, 35, 50, 0.28) 1px, transparent 1px)
            `,
            backgroundSize: `${PIXEL_SIZE}px ${PIXEL_SIZE}px`,
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          }}
        />
        <div
          className="absolute border-2 border-action-primary bg-action-primary/15"
          style={{
            left: LOUPE_SIZE / 2 - PIXEL_SIZE / 2,
            top: LOUPE_SIZE / 2 - PIXEL_SIZE / 2,
            width: PIXEL_SIZE,
            height: PIXEL_SIZE,
          }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-text-primary/70" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-text-primary/70" />
      </div>
      <p className="mt-1 rounded-md border border-border bg-surface/95 px-2 py-0.5 text-center text-xs font-medium text-text-primary shadow-sm">
        Pixel {snapped.pixelX}, {snapped.pixelY}
      </p>
    </div>,
    document.body,
  );
}
