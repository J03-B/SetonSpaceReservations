"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { PublicSpace } from "@/lib/domain/types";
import {
  getMapFloor,
  getMapFloorCount,
  getMapLevel,
  type MapPoint,
  type MapRegion,
} from "@/lib/map/map-config";
import {
  clientToPercent,
  clientToSnappedImagePercent,
  exportFloorsJson,
  exportIconsArrayTypeScript,
  exportRegionsArrayTypeScript,
  exportRegionsJson,
  exportRegionsTypeScript,
  exportStackedFloorsTypeScript,
  slugifyId,
} from "@/lib/map/editor-utils";
import {
  createMapIcon,
  DEFAULT_MAP_ICON_SIZE,
  EMPTY_MAP_ICONS,
  MAP_ICON_CATALOG,
  readMapIconDraft,
  resolveMapIcons,
  writeMapIconDraft,
  type MapIconKind,
  type MapIconMarker,
} from "@/lib/map/map-icons";
import { MapPixelLoupe } from "@/components/map/map-pixel-loupe";
import {
  boundingBoxFromPoints,
  ensureRegionPoints,
  isNearPoint,
  regionHasPolygon,
} from "@/lib/map/region-geometry";
import {
  MapRegionRectButton,
  MapRegionSvgLayer,
  PolygonDraftOverlay,
  PolygonVertexEditor,
} from "./map-region-overlay";
import { MapIconLayer, MapIconPalette, useMapIcons } from "./map-icon-layer";
import { MAP_FLOOR_INSET } from "@/components/map/map-chrome-motion";
import { cn } from "@/lib/utils";

type EditorStep = "idle" | "drawing" | "naming";

const EMPTY_ROOMS: MapRegion[] = [];

function computeFitSize(
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
): { fitW: number; fitH: number } {
  if (viewportW <= 0 || viewportH <= 0 || imageW <= 0 || imageH <= 0) {
    return { fitW: 0, fitH: 0 };
  }

  const imageAspect = imageW / imageH;
  const viewportAspect = viewportW / viewportH;

  if (imageAspect > viewportAspect) {
    return { fitW: viewportW, fitH: viewportW / imageAspect };
  }
  return { fitH: viewportH, fitW: viewportH * imageAspect };
}

interface BuildingMapEditorProps {
  buildingId: string;
  spaces?: PublicSpace[];
}

export function BuildingMapEditor({
  buildingId,
  spaces = [],
}: BuildingMapEditorProps) {
  const level = getMapLevel(buildingId);
  const floorCount = getMapFloorCount(level);

  const viewportRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [floorIndex, setFloorIndex] = useState(0);
  const [floorsRegions, setFloorsRegions] = useState<MapRegion[][]>(() =>
    Array.from({ length: floorCount }, (_, index) =>
      level
        ? getMapFloor(level, index).regions.map(ensureRegionPoints)
        : [],
    ),
  );
  const floorConfigIcons = level
    ? getMapFloor(level, floorIndex).icons
    : EMPTY_MAP_ICONS;
  const icons = useMapIcons(buildingId, floorIndex, floorConfigIcons);
  const iconSize = level?.iconSize ?? DEFAULT_MAP_ICON_SIZE;
  const regions = floorsRegions[floorIndex] ?? EMPTY_ROOMS;
  const activeFloor = level
    ? getMapFloor(level, floorIndex)
    : { number: 1, imageSrc: "", regions: [] };
  const [fit, setFit] = useState({ fitW: 0, fitH: 0 });
  const [step, setStep] = useState<EditorStep>("idle");
  const [drawingPoints, setDrawingPoints] = useState<MapPoint[]>([]);
  const [pendingPoints, setPendingPoints] = useState<MapPoint[] | null>(null);
  const [cursorPoint, setCursorPoint] = useState<MapPoint | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [placingKind, setPlacingKind] = useState<MapIconKind | null>(null);
  const [exportOutput, setExportOutput] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftSpaceSlug, setDraftSpaceSlug] = useState("");
  const [loupePointer, setLoupePointer] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const refreshFit = useCallback(() => {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img?.naturalWidth) return;

    setFit(
      computeFitSize(
        viewport.clientWidth,
        viewport.clientHeight,
        img.naturalWidth,
        img.naturalHeight,
      ),
    );
  }, []);

  useEffect(() => {
    refreshFit();
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      refreshFit();
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => refreshFit());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [refreshFit, activeFloor.imageSrc]);

  const setRegions = useCallback(
    (updater: MapRegion[] | ((prev: MapRegion[]) => MapRegion[])) => {
      setFloorsRegions((prev) =>
        prev.map((list, index) => {
          if (index !== floorIndex) return list;
          return typeof updater === "function" ? updater(list) : updater;
        }),
      );
    },
    [floorIndex],
  );

  const setIcons = useCallback(
    (
      updater: MapIconMarker[] | ((prev: MapIconMarker[]) => MapIconMarker[]),
    ) => {
      const current =
        readMapIconDraft(buildingId, floorIndex) ?? floorConfigIcons;
      const next = typeof updater === "function" ? updater(current) : updater;
      writeMapIconDraft(buildingId, floorIndex, next);
    },
    [buildingId, floorIndex, floorConfigIcons],
  );

  const resetDrawing = useCallback(() => {
    setStep("idle");
    setDrawingPoints([]);
    setPendingPoints(null);
    setCursorPoint(null);
  }, []);

  const switchFloor = useCallback(
    (index: number) => {
      if (index === floorIndex) return;
      resetDrawing();
      setSelectedId(null);
      setSelectedIconId(null);
      setPlacingKind(null);
      setDraftLabel("");
      setDraftId("");
      setDraftSpaceSlug("");
      setLoupePointer(null);
      setFloorIndex(index);
    },
    [floorIndex, resetDrawing],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typingTarget = (e.target as HTMLElement | null)?.closest(
        "input, textarea, select",
      );
      if (e.key === "Escape") {
        if (placingKind) {
          setPlacingKind(null);
          return;
        }
        if (step === "drawing" || step === "naming") {
          resetDrawing();
          setDraftLabel("");
          setDraftId("");
          setDraftSpaceSlug("");
        }
        setSelectedIconId(null);
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIconId &&
        step === "idle" &&
        !typingTarget
      ) {
        e.preventDefault();
        setIcons((prev) => prev.filter((icon) => icon.id !== selectedIconId));
        setSelectedIconId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, resetDrawing, placingKind, selectedIconId, setIcons]);

  const pointFromClient = useCallback((clientX: number, clientY: number) => {
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
  }, []);

  const startDrawing = useCallback(() => {
    setSelectedId(null);
    setSelectedIconId(null);
    setPlacingKind(null);
    setDrawingPoints([]);
    setPendingPoints(null);
    setCursorPoint(null);
    setStep("drawing");
  }, []);

  const handleMapClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (step === "naming") return;

      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-map-icon]")) return;

      const percent = pointFromClient(e.clientX, e.clientY);
      if (!percent) return;

      if (placingKind && step === "idle") {
        setIcons((prev) => [
          ...prev,
          createMapIcon(
            placingKind,
            percent.x,
            percent.y,
            iconSize,
          ),
        ]);
        setSelectedId(null);
        return;
      }

      if (step === "idle") {
        if (target?.closest("button, [data-map-vertex]")) return;
        setSelectedId(null);
        setSelectedIconId(null);
        return;
      }

      if (step === "drawing") {
        const mapLayer = mapLayerRef.current;
        if (
          mapLayer &&
          drawingPoints.length >= 3 &&
          isNearPoint(percent, drawingPoints[0], mapLayer.getBoundingClientRect())
        ) {
          setPendingPoints(drawingPoints);
          setStep("naming");
          setCursorPoint(null);
          setLoupePointer(null);
          setDraftLabel("");
          setDraftId("");
          setDraftSpaceSlug("");
          return;
        }

        setDrawingPoints((prev) => [...prev, percent]);
      }
    },
    [step, drawingPoints, pointFromClient, placingKind, setIcons, setSelectedId, setSelectedIconId, iconSize],
  );

  const handleMapMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      setLoupePointer({ x: e.clientX, y: e.clientY });
      if (step !== "drawing") {
        setCursorPoint(null);
        return;
      }

      const percent = pointFromClient(e.clientX, e.clientY);
      if (!percent) return;
      setCursorPoint(percent);
    },
    [step, pointFromClient],
  );

  const saveRegion = useCallback(() => {
    if (!pendingPoints || pendingPoints.length < 3 || !draftLabel.trim()) return;
    const id = draftId.trim() || slugifyId(draftLabel);
    const region: MapRegion = {
      id,
      label: draftLabel.trim(),
      ...boundingBoxFromPoints(pendingPoints),
      points: pendingPoints,
      ...(draftSpaceSlug ? { spaceSlug: draftSpaceSlug } : {}),
    };
    setRegions((prev) => [...prev.filter((r) => r.id !== id), region]);
    resetDrawing();
    setDraftLabel("");
    setDraftId("");
    setDraftSpaceSlug("");
  }, [
    pendingPoints,
    draftLabel,
    draftId,
    draftSpaceSlug,
    resetDrawing,
    setRegions,
  ]);

  const cancelDraft = useCallback(() => {
    resetDrawing();
    setDraftLabel("");
    setDraftId("");
    setDraftSpaceSlug("");
  }, [resetDrawing]);

  const deleteRegion = useCallback(
    (id: string) => {
      setRegions((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, setSelectedId, setRegions],
  );

  const updateRegionPoints = useCallback(
    (regionId: string, points: MapPoint[]) => {
      setRegions((prev) =>
        prev.map((region) => {
          if (region.id !== regionId) return region;
          return {
            ...region,
            ...boundingBoxFromPoints(points),
            points,
          };
        }),
      );
    },
    [setRegions],
  );

  const stackedFloors = useMemo(() => {
    if (!level) return [];
    return Array.from({ length: floorCount }, (_, index) => {
      const floor = getMapFloor(level, index);
      return {
        number: floor.number,
        imageSrc: floor.imageSrc,
        regions: floorsRegions[index] ?? [],
        icons: resolveMapIcons(buildingId, index, floor.icons),
      };
    });
  }, [level, floorCount, floorsRegions, buildingId]);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === selectedId) ?? null,
    [regions, selectedId],
  );

  const selectRoom = useCallback(
    (regionId: string) => {
      if (placingKind) return;
      setRegions((prev) =>
        prev.map((region) =>
          region.id === regionId ? ensureRegionPoints(region) : region,
        ),
      );
      setSelectedId(regionId);
      setSelectedIconId(null);
    },
    [setRegions, placingKind],
  );

  const handleVertexPointsChange = useCallback(
    (points: MapPoint[]) => {
      if (!selectedId) return;
      updateRegionPoints(selectedId, points);
    },
    [selectedId, updateRegionPoints],
  );

  const handleExport = useCallback(
    async (format: "json" | "typescript" | "regions" | "floors") => {
      if (!level) return;
      const output =
        format === "json"
          ? floorCount > 1
            ? exportFloorsJson(buildingId, stackedFloors)
            : exportRegionsJson(buildingId, regions, icons)
          : format === "regions"
            ? `${exportRegionsArrayTypeScript(regions)}\n\n${exportIconsArrayTypeScript(icons)}`
            : format === "floors"
              ? exportStackedFloorsTypeScript(stackedFloors)
              : exportRegionsTypeScript(
                  buildingId,
                  level.title,
                  level.imageSrc,
                  regions,
                  icons,
                );
      setExportOutput(output);
      setShowExport(true);
      try {
        await navigator.clipboard.writeText(output);
      } catch {
        // Clipboard may be blocked.
      }
    },
    [buildingId, level, regions, icons, floorCount, stackedFloors, setExportOutput, setShowExport],
  );

  const instructions = useMemo(() => {
    if (placingKind) {
      return `Click the map to place a ${MAP_ICON_CATALOG[placingKind].label.toLowerCase()}. Escape to stop.`;
    }
    if (step === "drawing" && drawingPoints.length >= 3) {
      return "Click the first dot again to close the room shape.";
    }
    if (step === "drawing") {
      return "Click to trace the room outline (3+ points).";
    }
    if (step === "naming") {
      return "Name the room and link a reservable space if needed.";
    }
    if (selectedIconId) {
      return "Drag the icon to move it, or remove it.";
    }
    if (selectedRegion && regionHasPolygon(selectedRegion)) {
      return "Drag a yellow corner. The magnifier shows the exact image pixel.";
    }
    if (selectedId) {
      return "Selected room has no polygon — draw a new shape or pick another room.";
    }
    return floorCount > 1
      ? "Pick a floor, click a room to edit its corners, or place an icon."
      : "Click a room to edit its corners, or place an icon.";
  }, [
    placingKind,
    step,
    drawingPoints.length,
    selectedIconId,
    selectedRegion,
    selectedId,
    floorCount,
  ]);

  const editorColors = useCallback(
    () => ({
      fill: "rgba(56, 189, 248, 0.2)",
      stroke: "#38bdf8",
    }),
    [],
  );

  if (!level) {
    return (
      <p className="p-6 text-text-secondary">
        Building map &quot;{buildingId}&quot; not found.
      </p>
    );
  }

  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col"
      style={{
        paddingTop: MAP_FLOOR_INSET,
        paddingBottom: MAP_FLOOR_INSET,
      }}
    >
      <div className="relative z-30 flex shrink-0 justify-center px-3 pb-2">
        <div className="flex max-w-5xl flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          <span className="font-semibold text-text-primary">
            {level.title} editor
            {floorCount > 1 ? ` · Floor ${activeFloor.number}` : ""}
          </span>
          {floorCount > 1 ? (
            <span className="flex gap-1">
              {Array.from({ length: floorCount }, (_, index) => {
                const floorNumber = getMapFloor(level, index).number;
                return (
                  <button
                    key={floorNumber}
                    type="button"
                    onClick={() => switchFloor(index)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      index === floorIndex
                        ? "bg-action-primary text-text-inverse"
                        : "border border-border hover:bg-surface-subtle",
                    )}
                  >
                    Floor {floorNumber}
                  </button>
                );
              })}
            </span>
          ) : null}
          <span className="hidden text-text-secondary sm:inline">·</span>
          <span className="text-text-secondary">{instructions}</span>
          {step === "drawing" ? (
            <button
              type="button"
              onClick={resetDrawing}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-subtle"
            >
              Cancel shape
            </button>
          ) : (
            <button
              type="button"
              onClick={startDrawing}
              className="rounded-md bg-action-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-action-primary-hover"
            >
              Draw room
            </button>
          )}
          <span className="text-xs text-text-secondary">Icons</span>
          <MapIconPalette
            selectedKind={placingKind}
            onSelect={(kind) => {
              setPlacingKind(kind);
              if (kind) {
                resetDrawing();
                setSelectedId(null);
                setSelectedIconId(null);
              }
            }}
          />
          {selectedIconId ? (
            <button
              type="button"
              onClick={() => {
                setIcons((prev) =>
                  prev.filter((icon) => icon.id !== selectedIconId),
                );
                setSelectedIconId(null);
              }}
              className="rounded-md border border-status-danger px-2.5 py-1 text-xs font-medium text-status-danger hover:bg-surface-subtle"
            >
              Remove icon
            </button>
          ) : null}
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRegions((v) => !v)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-subtle"
            >
              Rooms ({regions.length})
            </button>
            <button
              type="button"
              onClick={() => handleExport("regions")}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-subtle"
            >
              Copy this floor
            </button>
            {floorCount > 1 ? (
              <button
                type="button"
                onClick={() => handleExport("floors")}
                className="rounded-md bg-action-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-action-primary-hover"
              >
                Copy all floors
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleExport("typescript")}
                className="rounded-md bg-action-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-action-primary-hover"
              >
                Copy regions code
              </button>
            )}
            <Link
              href="/"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-subtle"
            >
              Exit editor
            </Link>
          </span>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden bg-transparent"
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            ref={mapLayerRef}
            className={cn(
              "relative",
              (step === "drawing" || placingKind) && "cursor-crosshair",
            )}
            style={{
              width: fit.fitW > 0 ? fit.fitW : "100%",
              height: fit.fitH > 0 ? fit.fitH : "100%",
            }}
            onClick={handleMapClick}
            onMouseMove={handleMapMove}
            onMouseLeave={() => {
              setCursorPoint(null);
              setLoupePointer(null);
            }}
            role="application"
            aria-label={`${level.title} room editor`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={activeFloor.imageSrc}
              alt={`${level.title} floor ${activeFloor.number}`}
              onLoad={refreshFit}
              className="pointer-events-none block h-full w-full object-contain mix-blend-screen"
              draggable={false}
            />

            <MapRegionSvgLayer
              regions={regions}
              getColors={editorColors}
              selectedRegionId={selectedId}
              editMode
              onRegionClick={
                step === "idle" && !placingKind
                  ? (region) => selectRoom(region.id)
                  : undefined
              }
            />

            {regions
              .filter((r) => !regionHasPolygon(r))
              .map((region) => (
                <MapRegionRectButton
                  key={region.id}
                  region={region}
                  colors={editorColors()}
                  selected={selectedId === region.id}
                  editMode
                  onClick={
                    placingKind ? undefined : () => selectRoom(region.id)
                  }
                />
              ))}

            <MapIconLayer
              icons={icons}
              editMode
              selectedId={selectedIconId}
              defaultSize={iconSize}
              onSelect={(id) => {
                setSelectedIconId(id);
                setSelectedId(null);
                setPlacingKind(null);
              }}
              onMove={(id, x, y) => {
                setIcons((prev) =>
                  prev.map((icon) =>
                    icon.id === id ? { ...icon, x, y } : icon,
                  ),
                );
              }}
            />

            {step === "drawing" ? (
              <PolygonDraftOverlay
                points={drawingPoints}
                cursorPoint={cursorPoint}
              />
            ) : null}

            {step === "naming" && pendingPoints ? (
              <PolygonDraftOverlay points={pendingPoints} closed />
            ) : null}

            {step === "idle" &&
            selectedRegion &&
            regionHasPolygon(selectedRegion) ? (
              <PolygonVertexEditor
                points={selectedRegion.points}
                onPointsChange={handleVertexPointsChange}
                mapLayerRef={mapLayerRef}
                imgRef={imgRef}
              />
            ) : null}

            <MapPixelLoupe
              visible={step === "drawing" && loupePointer !== null}
              clientX={loupePointer?.x ?? 0}
              clientY={loupePointer?.y ?? 0}
              focusPercent={cursorPoint}
              mapLayerRef={mapLayerRef}
              imgRef={imgRef}
            />
          </div>
        </div>
      </div>

      {step === "naming" && pendingPoints ? (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 shadow-lg sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-md sm:rounded-lg sm:border">
          <h2 className="font-semibold">New room</h2>
          <p className="mt-1 text-xs text-text-secondary">
            {pendingPoints.length} points · bounding box{" "}
            {boundingBoxFromPoints(pendingPoints).width.toFixed(1)}% ×{" "}
            {boundingBoxFromPoints(pendingPoints).height.toFixed(1)}%
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="room-label" className="mb-1 block text-sm font-medium">
                Room name <span className="text-status-danger">*</span>
              </label>
              <input
                id="room-label"
                value={draftLabel}
                onChange={(e) => {
                  setDraftLabel(e.target.value);
                  if (!draftId) {
                    const slug = slugifyId(e.target.value);
                    setDraftId(
                      activeFloor.number > 1
                        ? `f${activeFloor.number}-${slug}`
                        : slug,
                    );
                  }
                }}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Faustina"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="room-id" className="mb-1 block text-sm font-medium">
                Region id
              </label>
              <input
                id="room-id"
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="faustina"
              />
            </div>
            <div>
              <label htmlFor="room-space" className="mb-1 block text-sm font-medium">
                Reservable space
              </label>
              <select
                id="room-space"
                value={draftSpaceSlug}
                onChange={(e) => setDraftSpaceSlug(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">None (display only)</option>
                {spaces.map((space) => (
                  <option key={space.slug} value={space.slug}>
                    {space.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={saveRegion}
              disabled={!draftLabel.trim()}
              className="min-h-10 rounded-md bg-action-primary px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
            >
              Save room
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              className="min-h-10 rounded-md border border-border px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showRegions ? (
        <div className="absolute inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto border-l border-border bg-surface p-4 shadow-lg sm:top-14">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {floorCount > 1
                ? `Floor ${activeFloor.number} rooms (${regions.length})`
                : `Rooms (${regions.length})`}
            </h2>
            <button
              type="button"
              onClick={() => setShowRegions(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          {regions.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {floorCount > 1
                ? "No rooms drawn on this floor yet."
                : "No rooms drawn yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {regions.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => selectRoom(r.id)}
                    className="text-left font-medium hover:text-action-primary"
                  >
                    {r.label}
                    {r.points ? (
                      <span className="ml-1 text-xs text-text-secondary">
                        ({r.points.length} pts)
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRegion(r.id)}
                    className="text-xs text-status-danger hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-subtle"
          >
            Copy JSON
          </button>
        </div>
      ) : null}

      {showExport ? (
        <div className="absolute inset-x-4 bottom-4 z-50 max-h-[40vh] overflow-hidden rounded-lg border border-border bg-surface shadow-xl sm:inset-x-auto sm:right-4 sm:left-4 sm:mx-auto sm:max-w-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 className="text-sm font-semibold">Copied to clipboard</h2>
            <button
              type="button"
              onClick={() => setShowExport(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          <pre className="max-h-48 overflow-auto p-4 text-xs">{exportOutput}</pre>
          <p className="border-t border-border px-4 py-2 text-xs text-text-secondary">
            Paste into <code>src/lib/map/map-config.ts</code> under &quot;
            {buildingId}&quot;
            {floorCount > 1
              ? ", or send the copied floors block so the rooms can be added."
              : "."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
