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
  getMapLevel,
  type MapPoint,
  type MapRegion,
} from "@/lib/map/map-config";
import {
  clientToPercent,
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
  MapRegionRectButton,
  MapRegionSvgLayer,
  PolygonDraftOverlay,
  PolygonVertexEditor,
} from "./map-region-overlay";
import { MAP_FLOOR_INSET } from "@/components/map/map-chrome-motion";
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

interface BuildingMapEditorProps {
  buildingId: string;
  spaces?: PublicSpace[];
}

export function BuildingMapEditor({
  buildingId,
  spaces = [],
}: BuildingMapEditorProps) {
  const level = getMapLevel(buildingId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [regions, setRegions] = useState<MapRegion[]>(
    () => level?.regions ?? [],
  );
  const [fit, setFit] = useState({ fitW: 0, fitH: 0 });
  const [step, setStep] = useState<EditorStep>("idle");
  const [drawingPoints, setDrawingPoints] = useState<MapPoint[]>([]);
  const [pendingPoints, setPendingPoints] = useState<MapPoint[] | null>(null);
  const [cursorPoint, setCursorPoint] = useState<MapPoint | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportOutput, setExportOutput] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftSpaceSlug, setDraftSpaceSlug] = useState("");

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

  const resetDrawing = useCallback(() => {
    setStep("idle");
    setDrawingPoints([]);
    setPendingPoints(null);
    setCursorPoint(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (step === "drawing" || step === "naming")) {
        resetDrawing();
        setDraftLabel("");
        setDraftId("");
        setDraftSpaceSlug("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, resetDrawing]);

  const handleMapClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (step === "naming") return;

      const mapLayer = mapLayerRef.current;
      if (!mapLayer) return;

      const mapRect = mapLayer.getBoundingClientRect();
      const percent = clientToPercent(e.clientX, e.clientY, mapRect);

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
          setDraftSpaceSlug("");
          return;
        }

        setDrawingPoints((prev) => [...prev, percent]);
      }
    },
    [step, drawingPoints],
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
      ...(draftSpaceSlug ? { spaceSlug: draftSpaceSlug } : {}),
    };
    setRegions((prev) => [...prev.filter((r) => r.id !== id), region]);
    resetDrawing();
    setDraftLabel("");
    setDraftId("");
    setDraftSpaceSlug("");
  }, [pendingPoints, draftLabel, draftId, draftSpaceSlug, resetDrawing]);

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
    [selectedId],
  );

  const updateRegionPoints = useCallback((regionId: string, points: MapPoint[]) => {
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
  }, []);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === selectedId) ?? null,
    [regions, selectedId],
  );

  const handleExport = useCallback(
    async (format: "json" | "typescript" | "regions") => {
      if (!level) return;
      const output =
        format === "json"
          ? exportRegionsJson(buildingId, regions)
          : format === "regions"
            ? exportRegionsArrayTypeScript(regions)
            : exportRegionsTypeScript(
                buildingId,
                level.title,
                level.imageSrc,
                regions,
              );
      setExportOutput(output);
      setShowExport(true);
      try {
        await navigator.clipboard.writeText(output);
      } catch {
        // Clipboard may be blocked.
      }
    },
    [buildingId, level, regions],
  );

  const instructions = useMemo(() => {
    if (step === "drawing" && drawingPoints.length >= 3) {
      return "Click the first dot again to close the room shape.";
    }
    if (step === "drawing") {
      return "Click to trace the room outline (3+ points).";
    }
    if (step === "naming") {
      return "Name the room and link a reservable space if needed.";
    }
    if (selectedRegion && regionHasPolygon(selectedRegion)) {
      return "Drag the yellow corner dots to adjust the selected room.";
    }
    if (selectedId) {
      return "Selected room has no polygon — draw a new shape or pick another room.";
    }
    return "Click to draw a room, or select one in the Rooms list to edit its corners.";
  }, [step, drawingPoints.length, selectedRegion, selectedId]);

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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-3">
        <div className="pointer-events-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          <span className="font-semibold text-text-primary">
            {level.title} editor
          </span>
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
        className="relative min-h-0 w-full flex-1 overflow-hidden bg-transparent"
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
            aria-label={`${level.title} room editor`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={level.imageSrc}
              alt={`${level.title} floor plan`}
              onLoad={refreshFit}
              className="pointer-events-none block h-full w-full object-contain mix-blend-screen"
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

            {step === "idle" &&
            selectedRegion &&
            regionHasPolygon(selectedRegion) ? (
              <PolygonVertexEditor
                points={selectedRegion.points}
                onPointsChange={(points) =>
                  updateRegionPoints(selectedRegion.id, points)
                }
                mapLayerRef={mapLayerRef}
              />
            ) : null}
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
                  if (!draftId) setDraftId(slugifyId(e.target.value));
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
            <h2 className="font-semibold">Rooms ({regions.length})</h2>
            <button
              type="button"
              onClick={() => setShowRegions(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          {regions.length === 0 ? (
            <p className="text-sm text-text-secondary">No rooms drawn yet.</p>
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
            Paste into <code>src/lib/map/map-config.ts</code> under &quot;
            {buildingId}&quot;.
          </p>
        </div>
      ) : null}
    </div>
  );
}
