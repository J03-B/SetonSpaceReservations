"use client";

import {
  useCallback,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CAMPUS_MAP_ICON_SIZE,
  DEFAULT_MAP_ICON_SIZE,
  EMPTY_MAP_ICONS,
  MAP_ICON_CATALOG,
  MAP_ICON_KINDS,
  readMapIconDraft,
  subscribeMapIconStore,
  type MapIconKind,
  type MapIconMarker,
} from "@/lib/map/map-icons";
import { cn } from "@/lib/utils";

const snapshotCache = new Map<string, string>();

export function useMapIcons(
  mapId: string,
  floorIndex: number,
  configIcons: MapIconMarker[] = EMPTY_MAP_ICONS,
): MapIconMarker[] {
  const configKey = JSON.stringify(configIcons);
  const cacheKey = `${mapId}:${floorIndex}:${configKey}`;

  const json = useSyncExternalStore(
    subscribeMapIconStore,
    () => {
      const next = JSON.stringify(
        readMapIconDraft(mapId, floorIndex) ??
          (JSON.parse(configKey) as MapIconMarker[]),
      );
      const prev = snapshotCache.get(cacheKey);
      if (prev === next) return prev;
      snapshotCache.set(cacheKey, next);
      return next;
    },
    () => configKey,
  );

  return JSON.parse(json) as MapIconMarker[];
}

export function MapIconPalette({
  selectedKind,
  onSelect,
}: {
  selectedKind: MapIconKind | null;
  onSelect: (kind: MapIconKind | null) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      {MAP_ICON_KINDS.map((kind) => {
        const def = MAP_ICON_CATALOG[kind];
        const pressed = selectedKind === kind;
        return (
          <button
            key={kind}
            type="button"
            title={def.label}
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? null : kind)}
            className={cn(
              "rounded-md p-0.5",
              pressed
                ? "ring-2 ring-action-primary ring-offset-1"
                : "hover:bg-surface-subtle",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={def.src} alt="" className="h-7 w-7 rounded-full" draggable={false} />
            <span className="sr-only">Place {def.label}</span>
          </button>
        );
      })}
    </span>
  );
}

export function MapIconLayer({
  icons,
  editMode = false,
  selectedId = null,
  onSelect,
  onMove,
  defaultSize = DEFAULT_MAP_ICON_SIZE,
}: {
  icons: MapIconMarker[];
  editMode?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  defaultSize?: number;
}) {
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, icon: MapIconMarker) => {
      if (!editMode || !onMove) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(icon.id);

      const host = event.currentTarget.offsetParent as HTMLElement | null;
      if (!host) return;
      const pointerId = event.pointerId;
      event.currentTarget.setPointerCapture(pointerId);

      const move = (moveEvent: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        onMove(
          icon.id,
          Math.max(0, Math.min(100, x)),
          Math.max(0, Math.min(100, y)),
        );
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [editMode, onMove, onSelect],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {icons.map((icon) => {
        const def = MAP_ICON_CATALOG[icon.kind];
        const size = defaultSize;
        const selected = editMode && selectedId === icon.id;
        return (
          <button
            key={icon.id}
            type="button"
            data-map-icon=""
            disabled={!editMode}
            aria-label={def.label}
            onPointerDown={(event) => handlePointerDown(event, icon)}
            onClick={(event) => {
              if (!editMode) return;
              event.stopPropagation();
              onSelect?.(icon.id);
            }}
            className={cn(
              "absolute aspect-square min-w-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full p-0",
              editMode
                ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing"
                : "pointer-events-none",
              selected && "z-10 ring-2 ring-yellow-400 ring-offset-1",
            )}
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              width: `${size}%`,
              height: "auto",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={def.src}
              alt=""
              className="block h-auto w-full rounded-full"
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
}

export { CAMPUS_MAP_ICON_SIZE, DEFAULT_MAP_ICON_SIZE };
