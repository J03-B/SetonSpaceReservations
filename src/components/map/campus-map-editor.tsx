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
import {
  getAllMapLevels,
  getMapLevel,
  ROOT_MAP_ID,
  type MapPoint,
  type MapRegion,
} from "@/lib/map/map-config";
import {
  clientToPercent,
  exportIconsArrayTypeScript,
  exportRegionsArrayTypeScript,
  exportRegionsJson,
  exportRegionsTypeScript,
  slugifyId,
} from "@/lib/map/editor-utils";
import {
  boundingBoxFromPoints,
  isNearPoint,
  regionHasPolygon,
} from "@/lib/map/region-geometry";
import {
  CAMPUS_MAP_ICON_SIZE,
  createMapIcon,
  EMPTY_MAP_ICONS,
  MAP_ICON_CATALOG,
  readMapIconDraft,
  writeMapIconDraft,
  type MapIconKind,
  type MapIconMarker,
} from "@/lib/map/map-icons";
import {
  MapRegionRectButton,
  MapRegionSvgLayer,
  PolygonDraftOverlay,
} from "./map-region-overlay";
import { MapIconLayer, MapIconPalette, useMapIcons } from "./map-icon-layer";
import { cn } from "@/lib/utils";

type EditorStep = "idle" | "drawing" | "naming";

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

export function CampusMapEditor() {
  const level = getMapLevel(ROOT_MAP_ID);
  const mapLevels = getAllMapLevels();

  const viewportRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [regions, setRegions] = useState<MapRegion[]>(
    () => level?.regions ?? [],
  );
  const campusConfigIcons = level?.icons ?? EMPTY_MAP_ICONS;
  const icons = useMapIcons(ROOT_MAP_ID, 0, campusConfigIcons);
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
  const [draftChildMapId, setDraftChildMapId] = useState("");

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
  }, [refreshFit]);

  const persistIcons = useCallback(
    (updater: MapIconMarker[] | ((prev: MapIconMarker[]) => MapIconMarker[])) => {
      const current =
        readMapIconDraft(ROOT_MAP_ID, 0) ?? campusConfigIcons;
      const next = typeof updater === "function" ? updater(current) : updater;
      writeMapIconDraft(ROOT_MAP_ID, 0, next);
    },
    [campusConfigIcons],
  );

  const resetDrawing = useCallback(() => {
    setStep("idle");
    setDrawingPoints([]);
    setPendingPoints(null);
    setCursorPoint(null);
  }, []);

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
          setDraftChildMapId("");
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
        persistIcons((prev) => prev.filter((icon) => icon.id !== selectedIconId));
        setSelectedIconId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, resetDrawing, placingKind, selectedIconId, persistIcons]);

  const handleMapClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (step === "naming") return;

      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-map-icon]")) return;

      const mapLayer = mapLayerRef.current;
      if (!mapLayer) return;

      const mapRect = mapLayer.getBoundingClientRect();
      const percent = clientToPercent(e.clientX, e.clientY, mapRect);

      if (placingKind && step === "idle") {
        persistIcons((prev) => [
          ...prev,
          createMapIcon(
            placingKind,
            percent.x,
            percent.y,
            CAMPUS_MAP_ICON_SIZE,
          ),
        ]);
        setSelectedId(null);
        return;
      }

      if (step === "idle") {
        setDrawingPoints([percent]);
        setStep("drawing");
        return;
      }

      if (step === "drawing") {
        if (
          drawingPoints.length >= 3 &&
          isNearPoint(percent, drawingPoints[0], mapRect)
        ) {
          setPendingPoints(drawingPoints);
          setStep("naming");
          setCursorPoint(null);
          setDraftLabel("");
          setDraftId("");
          setDraftChildMapId("");
          return;
        }

        setDrawingPoints((prev) => [...prev, percent]);
      }
    },
    [step, drawingPoints, placingKind, persistIcons, setSelectedId],
  );

  const handleMapMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (step !== "drawing") {
        setCursorPoint(null);
        return;
      }

      const mapLayer = mapLayerRef.current;
      if (!mapLayer) return;

      setCursorPoint(
        clientToPercent(e.clientX, e.clientY, mapLayer.getBoundingClientRect()),
      );
    },
    [step],
  );

  const saveRegion = useCallback(() => {
    if (!pendingPoints || pendingPoints.length < 3 || !draftLabel.trim()) return;
    const id = draftId.trim() || slugifyId(draftLabel);
    const region: MapRegion = {
      id,
      label: draftLabel.trim(),
      ...boundingBoxFromPoints(pendingPoints),
      points: pendingPoints,
      ...(draftChildMapId ? { childMapId: draftChildMapId } : {}),
    };
    setRegions((prev) => [...prev.filter((r) => r.id !== id), region]);
    resetDrawing();
    setDraftLabel("");
    setDraftId("");
    setDraftChildMapId("");
  }, [pendingPoints, draftLabel, draftId, draftChildMapId, resetDrawing]);

  const cancelDraft = useCallback(() => {
    resetDrawing();
    setDraftLabel("");
    setDraftId("");
    setDraftChildMapId("");
  }, [resetDrawing]);

  const deleteRegion = useCallback(
    (id: string) => {
      setRegions((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, setSelectedId, setRegions],
  );

  const handleExport = useCallback(
    async (format: "json" | "typescript" | "regions") => {
      if (!level) return;
      const output =
        format === "json"
          ? exportRegionsJson(ROOT_MAP_ID, regions, icons)
          : format === "regions"
            ? `${exportRegionsArrayTypeScript(regions)}\n\n${exportIconsArrayTypeScript(icons)}`
            : exportRegionsTypeScript(
                ROOT_MAP_ID,
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
        // Clipboard may be blocked; user can still copy from the panel.
      }
    },
    [level, regions, icons, setExportOutput, setShowExport],
  );

  const instructions = useMemo(() => {
    if (placingKind) {
      return `Click the map to place a ${MAP_ICON_CATALOG[placingKind].label.toLowerCase()}. Escape to stop.`;
    }
    if (step === "drawing" && drawingPoints.length >= 3) {
      return "Click the first dot again to close the shape, or keep adding points.";
    }
    if (step === "drawing") {
      return "Click to place dots around the building. Need at least 3 points.";
    }
    if (step === "naming") {
      return "Name the building, then save or cancel.";
    }
    if (selectedIconId) {
      return "Drag the icon to move it, or remove it.";
    }
    return "Click to place the first corner of a building, or pick an icon to stamp.";
  }, [step, drawingPoints.length, placingKind, selectedIconId]);

  const editorColors = useCallback(
    () => ({
      fill: "rgba(56, 189, 248, 0.2)",
      stroke: "#38bdf8",
    }),
    [],
  );

  if (!level) {
    return <p className="p-6 text-text-secondary">Campus map not found.</p>;
  }

  return (
    <div className="absolute inset-0 flex min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-3">
        <div className="pointer-events-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          <span className="font-semibold text-text-primary">Campus editor</span>
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
          ) : null}
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
                persistIcons((prev) =>
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
              Regions ({regions.length})
            </button>
            <button
              type="button"
              onClick={() => handleExport("regions")}
              className="rounded-md bg-action-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-action-primary-hover"
            >
              Copy regions code
            </button>
            <button
              type="button"
              onClick={() => handleExport("typescript")}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-subtle"
            >
              Copy full block
            </button>
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
        className="relative h-full min-h-0 w-full overflow-hidden bg-[#1a1a1a]"
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            ref={mapLayerRef}
            className={cn(
              "relative",
              step !== "naming" && "cursor-crosshair",
            )}
            style={{
              width: fit.fitW > 0 ? fit.fitW : "100%",
              height: fit.fitH > 0 ? fit.fitH : "100%",
            }}
            onClick={handleMapClick}
            onMouseMove={handleMapMove}
            onMouseLeave={() => setCursorPoint(null)}
            role="application"
            aria-label="Campus map editor"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={level.imageSrc}
              alt={`${level.title} campus map`}
              onLoad={refreshFit}
              className="pointer-events-none block h-full w-full object-contain"
              draggable={false}
            />

            <MapRegionSvgLayer
              regions={regions}
              getColors={editorColors}
              selectedRegionId={selectedId}
              editMode
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
                />
              ))}

            {step === "drawing" ? (
              <PolygonDraftOverlay
                points={drawingPoints}
                cursorPoint={cursorPoint}
              />
            ) : null}

            {step === "naming" && pendingPoints ? (
              <PolygonDraftOverlay points={pendingPoints} closed />
            ) : null}

            <MapIconLayer
              icons={icons}
              editMode
              selectedId={selectedIconId}
              defaultSize={CAMPUS_MAP_ICON_SIZE}
              onSelect={(id) => {
                setSelectedIconId(id);
                setSelectedId(null);
                setPlacingKind(null);
              }}
              onMove={(id, x, y) => {
                persistIcons((prev) =>
                  prev.map((icon) =>
                    icon.id === id ? { ...icon, x, y } : icon,
                  ),
                );
              }}
            />
          </div>
        </div>
      </div>

      {step === "naming" && pendingPoints ? (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 shadow-lg sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-md sm:rounded-lg sm:border">
          <h2 className="font-semibold">New building</h2>
          <p className="mt-1 text-xs text-text-secondary">
            {pendingPoints.length} points · bounding box{" "}
            {boundingBoxFromPoints(pendingPoints).width.toFixed(1)}% ×{" "}
            {boundingBoxFromPoints(pendingPoints).height.toFixed(1)}%
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="campus-label" className="mb-1 block text-sm font-medium">
                Building name <span className="text-status-danger">*</span>
              </label>
              <input
                id="campus-label"
                value={draftLabel}
                onChange={(e) => {
                  setDraftLabel(e.target.value);
                  if (!draftId) setDraftId(slugifyId(e.target.value));
                }}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Main Building"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="campus-id" className="mb-1 block text-sm font-medium">
                Region id
              </label>
              <input
                id="campus-id"
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="main-building"
              />
            </div>
            <div>
              <label htmlFor="campus-child" className="mb-1 block text-sm font-medium">
                Opens floor plan
              </label>
              <select
                id="campus-child"
                value={draftChildMapId}
                onChange={(e) => setDraftChildMapId(e.target.value)}
                className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {mapLevels
                  .filter((m) => m.id !== ROOT_MAP_ID)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
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
              Save building
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
            <h2 className="font-semibold">Regions ({regions.length})</h2>
            <button
              type="button"
              onClick={() => setShowRegions(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          {regions.length === 0 ? (
            <p className="text-sm text-text-secondary">No buildings drawn yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {regions.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
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
            Paste this into chat or into{" "}
            <code>src/lib/map/map-config.ts</code> under the campus level.
          </p>
        </div>
      ) : null}
    </div>
  );
}
