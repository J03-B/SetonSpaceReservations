"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getAllMapLevels,
  getMapLevel,
  ROOT_MAP_ID,
  type MapRegion,
} from "@/lib/map/map-config";
import {
  exportRegionsJson,
  exportRegionsTypeScript,
  rectFromCorners,
  slugifyId,
} from "@/lib/map/editor-utils";
import { InteractiveMapCanvas, type PendingRect } from "./interactive-map-canvas";

type EditorStep = "idle" | "first-corner" | "naming";

export function MapRegionEditor() {
  const mapLevels = getAllMapLevels();
  const [mapId, setMapId] = useState(ROOT_MAP_ID);
  const [regions, setRegions] = useState<MapRegion[]>(
    () => getMapLevel(ROOT_MAP_ID)?.regions ?? [],
  );
  const [step, setStep] = useState<EditorStep>("idle");
  const [firstCorner, setFirstCorner] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [pendingRect, setPendingRect] = useState<PendingRect | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportOutput, setExportOutput] = useState("");
  const [showExport, setShowExport] = useState(false);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftChildMapId, setDraftChildMapId] = useState("");
  const [draftSpaceSlug, setDraftSpaceSlug] = useState("");

  const level = getMapLevel(mapId);

  const switchMap = useCallback((id: string) => {
    setMapId(id);
    setRegions(getMapLevel(id)?.regions ?? []);
    setStep("idle");
    setFirstCorner(null);
    setPendingRect(null);
    setSelectedId(null);
  }, []);

  const handleMapClick = useCallback(
    (percent: { x: number; y: number }) => {
      if (step === "idle" || step === "naming") {
        setStep("first-corner");
        setFirstCorner(percent);
        setPendingRect(null);
        return;
      }

      if (step === "first-corner" && firstCorner) {
        const rect = rectFromCorners(firstCorner, percent);
        if (rect.width < 1 || rect.height < 1) {
          setStep("idle");
          setFirstCorner(null);
          return;
        }
        setPendingRect(rect);
        setStep("naming");
        setDraftLabel("");
        setDraftId("");
        setDraftChildMapId("");
        setDraftSpaceSlug("");
      }
    },
    [step, firstCorner],
  );

  const saveRegion = useCallback(() => {
    if (!pendingRect || !draftLabel.trim()) return;
    const id = draftId.trim() || slugifyId(draftLabel);
    const region: MapRegion = {
      id,
      label: draftLabel.trim(),
      ...pendingRect,
      ...(draftChildMapId ? { childMapId: draftChildMapId } : {}),
      ...(draftSpaceSlug ? { spaceSlug: draftSpaceSlug } : {}),
    };
    setRegions((prev) => [...prev.filter((r) => r.id !== id), region]);
    setStep("idle");
    setFirstCorner(null);
    setPendingRect(null);
    setDraftLabel("");
    setDraftId("");
    setDraftChildMapId("");
    setDraftSpaceSlug("");
  }, [pendingRect, draftLabel, draftId, draftChildMapId, draftSpaceSlug]);

  const cancelDraft = useCallback(() => {
    setStep("idle");
    setFirstCorner(null);
    setPendingRect(null);
  }, []);

  const deleteRegion = useCallback(
    (id: string) => {
      setRegions((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const handleExport = useCallback(
    (format: "json" | "typescript") => {
      if (!level) return;
      const output =
        format === "json"
          ? exportRegionsJson(mapId, regions)
          : exportRegionsTypeScript(
              mapId,
              level.title,
              level.imageSrc,
              regions,
            );
      setExportOutput(output);
      setShowExport(true);
      void navigator.clipboard.writeText(output);
    },
    [level, mapId, regions],
  );

  const instructions = useMemo(() => {
    if (step === "first-corner") {
      return "Click the opposite corner to complete the room rectangle.";
    }
    if (step === "naming") {
      return "Name the room, then save or cancel.";
    }
    return "Click once for the first corner of a room, then click the opposite corner.";
  }, [step]);

  if (!level) {
    return <p>Map not found.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">Map room configurator</h1>
        <p className="mt-1 text-text-secondary">
          Click two corners on the map to draw a room. Export the output and paste
          it into{" "}
          <code className="rounded bg-surface-strong px-1 text-sm">
            src/lib/map/map-config.ts
          </code>
          .
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="map-select" className="mb-1 block text-sm font-medium">
            Map level
          </label>
          <select
            id="map-select"
            value={mapId}
            onChange={(e) => switchMap(e.target.value)}
            className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            {mapLevels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <p className="flex-1 text-sm text-text-secondary">{instructions}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="min-h-11 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-subtle"
          >
            Copy JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport("typescript")}
            className="min-h-11 rounded-md bg-action-primary px-4 text-sm font-medium text-text-inverse hover:bg-action-primary-hover"
          >
            Copy TypeScript
          </button>
        </div>
      </div>

      <InteractiveMapCanvas
        level={{ ...level, regions }}
        regions={regions}
        editMode
        onMapClick={handleMapClick}
        firstCorner={firstCorner}
        pendingRect={pendingRect}
        selectedRegionId={selectedId}
      />

      {step === "naming" && pendingRect ? (
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="font-semibold">New room</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Position: {pendingRect.x.toFixed(1)}%, {pendingRect.y.toFixed(1)}% ·{" "}
            {pendingRect.width.toFixed(1)}% × {pendingRect.height.toFixed(1)}%
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
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
                className="min-h-11 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Faustina"
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
                className="min-h-11 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="faustina"
              />
            </div>
            <div>
              <label htmlFor="child-map" className="mb-1 block text-sm font-medium">
                Drill-down map id (buildings only)
              </label>
              <select
                id="child-map"
                value={draftChildMapId}
                onChange={(e) => setDraftChildMapId(e.target.value)}
                className="min-h-11 w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {mapLevels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="space-slug" className="mb-1 block text-sm font-medium">
                Reservation space slug
              </label>
              <input
                id="space-slug"
                value={draftSpaceSlug}
                onChange={(e) => setDraftSpaceSlug(e.target.value)}
                className="min-h-11 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="faustina"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={saveRegion}
              disabled={!draftLabel.trim()}
              className="min-h-11 rounded-md bg-action-primary px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
            >
              Save room
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              className="min-h-11 rounded-md border border-border px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Regions ({regions.length})
        </h2>
        {regions.length === 0 ? (
          <p className="text-sm text-text-secondary">No regions yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {regions.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="text-left font-medium hover:text-action-primary"
                >
                  {r.label}
                </button>
                <span className="text-text-secondary">
                  {r.x.toFixed(1)}%, {r.y.toFixed(1)}% · {r.width.toFixed(1)}×
                  {r.height.toFixed(1)}%
                  {r.childMapId ? ` · → ${r.childMapId}` : ""}
                  {r.spaceSlug ? ` · space: ${r.spaceSlug}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => deleteRegion(r.id)}
                  className="text-sm text-status-danger hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showExport ? (
        <section className="rounded-lg border border-border bg-surface-subtle p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Export (copied to clipboard)</h2>
            <button
              type="button"
              onClick={() => setShowExport(false)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          <pre className="max-h-80 overflow-auto rounded bg-surface p-3 text-xs">
            {exportOutput}
          </pre>
          <p className="mt-2 text-xs text-text-secondary">
            Paste into{" "}
            <code>src/lib/map/map-config.ts</code> under MAP_LEVELS, then send
            this to your developer to bake in.
          </p>
        </section>
      ) : null}
    </div>
  );
}
