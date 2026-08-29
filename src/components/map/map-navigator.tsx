"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { PublicAvailabilitySlot, PublicSpace } from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";
import {
  findCampusRegionForChildMap,
  findCampusShortcutForFocus,
  findRegionBySpaceSlug,
  findRegionInMap,
  getMapFloor,
  getMapFloorCount,
  getMapLevel,
  getMapPathTo,
  ROOT_MAP_ID,
  type MapLevel,
  type MapRegion,
} from "@/lib/map/map-config";
import { getStatusForRange } from "@/lib/availability/status-at-time";
import { InteractiveMapCanvas } from "./interactive-map-canvas";
import { CampusMapEditor } from "./campus-map-editor";
import { BuildingMapEditor } from "./building-map-editor";
import { BuildingDrillFrame } from "./building-drill-frame";
import { BuildingFloorStack } from "./building-floor-stack";
import {
  computeFloorScaleProgress,
  getDrillCrossfadeOpacity,
  type DrillCameraState,
} from "@/lib/map/drill-frame";
import type { ChromeMotionMode } from "@/components/map/map-chrome-motion";
import { DRILL_TRANSITION_MS } from "./campus-map-viewport";
import { cn } from "@/lib/utils";
import type {
  MapNavigationActions,
  MapNavigationMeta,
} from "./map-navigation-bar";

interface DrillTransition {
  region: MapRegion;
  childMapId: string;
}

interface ExitTransition {
  region: MapRegion;
  floorMapId: string;
}

function resolveSpaceForRegion(
  region: MapRegion,
  spaces: PublicSpace[],
): PublicSpace | undefined {
  const slug = region.spaceSlug ?? region.id;
  return spaces.find((entry) => entry.slug === slug);
}

interface MapNavigatorProps {
  spaces: PublicSpace[];
  slots: PublicAvailabilitySlot[];
  rangeStart: Date;
  rangeEnd: Date;
  onRoomSelect: (space: PublicSpace, region: MapRegion) => void;
  onBuildingSelect?: (region: MapRegion) => void;
  initialMapId?: string;
  onMapLevelChange?: (mapId: string) => void;
  campusEditMode?: boolean;
  buildingEditMode?: string | null;
  onNavigationMetaChange?: (meta: MapNavigationMeta | null) => void;
  navigationActionsRef?: RefObject<MapNavigationActions | null>;
  selectedSpaceSlug?: string | null;
  onRoomDeselect?: () => void;
}

export function MapNavigator({
  spaces,
  slots,
  rangeStart,
  rangeEnd,
  onRoomSelect,
  initialMapId,
  onMapLevelChange,
  campusEditMode = false,
  buildingEditMode = null,
  onNavigationMetaChange,
  navigationActionsRef,
  selectedSpaceSlug = null,
  onRoomDeselect,
}: MapNavigatorProps) {
  const [stack, setStack] = useState<string[]>(() => {
    if (campusEditMode) return [ROOT_MAP_ID];
    if (buildingEditMode) return getMapPathTo(buildingEditMode);
    if (initialMapId) return getMapPathTo(initialMapId);
    return [ROOT_MAP_ID];
  });
  const [animClass, setAnimClass] = useState("map-enter-active");
  const [drill, setDrill] = useState<DrillTransition | null>(null);
  const [exitDrill, setExitDrill] = useState<ExitTransition | null>(null);
  const [transitionT, setTransitionT] = useState(0);
  const [drillSyncCamera, setDrillSyncCamera] = useState<DrillCameraState | null>(
    null,
  );
  const [drillStartCamera, setDrillStartCamera] =
    useState<DrillCameraState | null>(null);
  const [floorIndex, setFloorIndex] = useState(0);
  const floorIndexRef = useRef(0);
  const drillStartCameraRef = useRef<DrillCameraState | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const navMetaRef = useRef<MapNavigationMeta | null>(null);
  const chromeShownRef = useRef(false);
  const stackRef = useRef(stack);
  const drillRef = useRef<DrillTransition | null>(null);
  const exitDrillRef = useRef<ExitTransition | null>(null);
  const selectedSpaceSlugRef = useRef(selectedSpaceSlug);

  const currentMapId = stack[stack.length - 1] ?? ROOT_MAP_ID;
  const currentLevel = getMapLevel(currentMapId);
  const selectedRegionMatch = selectedSpaceSlug
    ? findRegionBySpaceSlug(selectedSpaceSlug, currentMapId)
    : undefined;
  const selectedRegionId = useMemo(() => {
    if (!selectedRegionMatch) return null;
    if (selectedRegionMatch.mapId !== currentMapId) return null;
    return selectedRegionMatch.region.id;
  }, [selectedRegionMatch, currentMapId]);
  const isCampusView = currentMapId === ROOT_MAP_ID;
  const isBuildingEditActive =
    Boolean(buildingEditMode) && currentMapId === buildingEditMode;
  const drillChildLevel = drill ? getMapLevel(drill.childMapId) : undefined;
  const exitFloorLevel = exitDrill ? getMapLevel(exitDrill.floorMapId) : undefined;

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    drillRef.current = drill;
  }, [drill]);

  useEffect(() => {
    exitDrillRef.current = exitDrill;
  }, [exitDrill]);

  const publishNavMeta = useCallback(
    (t: number, force = false) => {
      if (!onNavigationMetaChange) return;

      const stackNow = stackRef.current;
      const drillNow = drillRef.current;
      const exitDrillNow = exitDrillRef.current;
      const currentId = stackNow[stackNow.length - 1] ?? ROOT_MAP_ID;
      const isCampusNow = currentId === ROOT_MAP_ID;
      const isAnimating = Boolean(drillNow || exitDrillNow);

      const showNav =
        (!isCampusNow || drillNow || exitDrillNow) &&
        !campusEditMode &&
        !buildingEditMode;

      if (!showNav) {
        if (navMetaRef.current !== null) {
          navMetaRef.current = null;
          onNavigationMetaChange(null);
        }
        return;
      }

      const isDrillIn = Boolean(drillNow);
      const isDrillOut = Boolean(exitDrillNow);
      const breadcrumbIds = drillNow
        ? [...stackNow, drillNow.childMapId]
        : stackNow;

      const mapBreadcrumbs = breadcrumbIds
        .map((id) => getMapLevel(id))
        .filter((l): l is MapLevel => Boolean(l))
        .map((level) => ({ id: level.id, title: level.title }));

      const selectedSlug = selectedSpaceSlugRef.current;
      const roomMatch = selectedSlug
        ? findRegionBySpaceSlug(selectedSlug, currentId)
        : undefined;
      const roomOnFloor =
        roomMatch && roomMatch.mapId === currentId ? roomMatch : undefined;

      const breadcrumbs = roomOnFloor
        ? [
            ...mapBreadcrumbs,
            {
              id: `room:${selectedSlug}`,
              title: roomOnFloor.region.label,
            },
          ]
        : mapBreadcrumbs;

      let chromeMotionMode: ChromeMotionMode = "idle";
      let chromeShown = true;

      if (isDrillIn) {
        chromeMotionMode = "css-enter";
        chromeShown = chromeShownRef.current;
      } else if (isDrillOut) {
        chromeMotionMode = "css-exit";
        chromeShown = chromeShownRef.current;
      }

      const floorMapId = drillNow?.childMapId ?? currentId;
      const floorLevelNow = getMapLevel(floorMapId);
      const floorCount = getMapFloorCount(floorLevelNow);
      const stackedFloors = floorCount > 1 && floorMapId !== ROOT_MAP_ID;
      const floorNow = stackedFloors && floorLevelNow
        ? getMapFloor(floorLevelNow, floorIndexRef.current)
        : null;
      const floorControl =
        stackedFloors && floorNow && floorLevelNow
          ? {
              current: floorNow.number,
              min: getMapFloor(floorLevelNow, 0).number,
              max: getMapFloor(floorLevelNow, floorCount - 1).number,
              canUp: !isAnimating && floorIndexRef.current < floorCount - 1,
              canDown: !isAnimating && floorIndexRef.current > 0,
            }
          : null;

      const prev = navMetaRef.current;
      if (
        !force &&
        !isAnimating &&
        prev &&
        prev.chromeMotionMode === chromeMotionMode &&
        prev.chromeShown === chromeShown &&
        prev.isTransitioning === isAnimating &&
        prev.canGoBack ===
          ((stackNow.length > 1 || Boolean(roomOnFloor)) && !isAnimating) &&
        prev.breadcrumbs.length === breadcrumbs.length &&
        prev.breadcrumbs.every(
          (crumb, i) =>
            crumb.id === breadcrumbs[i]?.id &&
            crumb.title === breadcrumbs[i]?.title,
        ) &&
        prev.floorControl?.current === floorControl?.current &&
        prev.floorControl?.canUp === floorControl?.canUp &&
        prev.floorControl?.canDown === floorControl?.canDown
      ) {
        return;
      }

      const next: MapNavigationMeta = {
        breadcrumbs,
        canGoBack:
          (stackNow.length > 1 || Boolean(roomOnFloor)) && !isAnimating,
        isTransitioning: isAnimating,
        chromeShown,
        chromeMotionMode,
        floorControl,
      };

      navMetaRef.current = next;
      onNavigationMetaChange(next);
    },
    [
      onNavigationMetaChange,
      campusEditMode,
      buildingEditMode,
    ],
  );

  useEffect(() => {
    selectedSpaceSlugRef.current = selectedSpaceSlug;
    publishNavMeta(1, true);
  }, [selectedSpaceSlug, publishNavMeta]);

  useEffect(() => {
    if (!selectedSpaceSlug) return;
    const match = findRegionBySpaceSlug(selectedSpaceSlug, currentMapId);
    if (match?.mapId !== currentMapId) return;
    if (match.floorIndex === floorIndexRef.current) return;
    floorIndexRef.current = match.floorIndex;
    setFloorIndex(match.floorIndex);
  }, [selectedSpaceSlug, currentMapId]);

  const runTransition = useCallback(
    (from: number, to: number, onDone: () => void) => {
      if (transitionRafRef.current != null) {
        cancelAnimationFrame(transitionRafRef.current);
      }
      const startTime = performance.now();

      const frame = (now: number) => {
        const raw = clampProgress((now - startTime) / DRILL_TRANSITION_MS);
        const value = from + (to - from) * raw;
        setTransitionT(value);
        publishNavMeta(value);
        if (raw >= 1) {
          transitionRafRef.current = null;
          onDone();
          return;
        }
        transitionRafRef.current = requestAnimationFrame(frame);
      };

      setTransitionT(from);
      publishNavMeta(from, true);
      transitionRafRef.current = requestAnimationFrame(frame);
    },
    [publishNavMeta],
  );

  useEffect(() => {
    onMapLevelChange?.(currentMapId);
  }, [currentMapId, onMapLevelChange]);

  useEffect(
    () => () => {
      if (transitionRafRef.current != null) {
        cancelAnimationFrame(transitionRafRef.current);
      }
    },
    [],
  );

  const getRegionStatus = useCallback(
    (region: MapRegion): PublicStatus | null => {
      const space = resolveSpaceForRegion(region, spaces);
      if (!space?.isActive) return null;
      return getStatusForRange(slots, space.id, rangeStart, rangeEnd);
    },
    [spaces, slots, rangeStart, rangeEnd],
  );

  const isRegionActive = useCallback(
    (region: MapRegion) => {
      if (region.childMapId) return true;
      // Floor-plan rooms stay hoverable even if the space is not in the live catalog yet.
      if (region.spaceSlug) {
        const space = resolveSpaceForRegion(region, spaces);
        return space ? space.isActive : true;
      }
      return resolveSpaceForRegion(region, spaces)?.isActive === true;
    },
    [spaces],
  );

  const finishDrill = useCallback(
    (childMapId: string) => {
      const nextStack = [...stackRef.current, childMapId];
      stackRef.current = nextStack;
      drillRef.current = null;
      setStack(nextStack);
      setDrill(null);
      setTransitionT(0);
      setAnimClass("map-enter-active");
      chromeShownRef.current = true;
      publishNavMeta(1, true);
    },
    [publishNavMeta],
  );

  const startDrillIn = useCallback(
    (region: MapRegion, childMapId: string) => {
      const nextDrill = { region, childMapId };
      const focus = region.focusRegionId
        ? findRegionInMap(childMapId, region.focusRegionId)
        : undefined;
      if (focus) {
        floorIndexRef.current = focus.floorIndex;
        setFloorIndex(focus.floorIndex);
        const space = resolveSpaceForRegion(focus.region, spaces);
        if (space?.isActive) onRoomSelect(space, focus.region);
      }
      exitDrillRef.current = null;
      drillRef.current = nextDrill;
      setExitDrill(null);
      drillStartCameraRef.current = null;
      setDrillStartCamera(null);
      setDrillSyncCamera(null);
      setTransitionT(0);
      chromeShownRef.current = false;
      if (!focus) {
        floorIndexRef.current = 0;
        setFloorIndex(0);
      }
      setDrill(nextDrill);
      publishNavMeta(0, true);
      requestAnimationFrame(() => {
        chromeShownRef.current = true;
        publishNavMeta(0, true);
      });
      runTransition(0, 1, () => finishDrill(childMapId));
    },
    [finishDrill, runTransition, publishNavMeta, spaces, onRoomSelect],
  );

  const finishExitDrill = useCallback(
    (floorMapId: string) => {
      const nextStack =
        stackRef.current[stackRef.current.length - 1] === floorMapId
          ? stackRef.current.slice(0, -1)
          : stackRef.current;
      stackRef.current = nextStack;
      exitDrillRef.current = null;
      setExitDrill(null);
      setDrillSyncCamera(null);
      drillStartCameraRef.current = null;
      setDrillStartCamera(null);
      setStack(nextStack);
      setTransitionT(0);
      setAnimClass("map-enter-active");
      navMetaRef.current = null;
      floorIndexRef.current = 0;
      setFloorIndex(0);
      onNavigationMetaChange?.(null);
    },
    [onNavigationMetaChange],
  );

  const startExitDrill = useCallback(
    (region: MapRegion, floorMapId: string) => {
      const nextExitDrill = { region, floorMapId };
      chromeShownRef.current = false;
      drillRef.current = null;
      exitDrillRef.current = nextExitDrill;
      setDrill(null);
      drillStartCameraRef.current = null;
      setDrillStartCamera(null);
      setTransitionT(1);
      setExitDrill(nextExitDrill);
      publishNavMeta(1, true);
      runTransition(1, 0, () => finishExitDrill(floorMapId));
    },
    [finishExitDrill, runTransition, publishNavMeta],
  );

  const handleDrillCameraChange = useCallback((camera: DrillCameraState) => {
    if (!drillStartCameraRef.current) {
      drillStartCameraRef.current = camera;
      setDrillStartCamera(camera);
    }
    setDrillSyncCamera(camera);
  }, []);

  const navigateTo = useCallback((mapId: string, direction: "forward" | "back") => {
    setAnimClass(
      direction === "forward" ? "map-exit-forward" : "map-exit-back",
    );
    window.setTimeout(() => {
      setStack((prev) => {
        const next =
          direction === "forward" ? [...prev, mapId] : prev.slice(0, -1);
        stackRef.current = next;
        return next;
      });
      setAnimClass(
        direction === "forward" ? "map-enter-forward" : "map-enter-back",
      );
      window.setTimeout(() => setAnimClass("map-enter-active"), 320);
    }, 280);
  }, []);

  const handleRegionClick = useCallback(
    (region: MapRegion) => {
      if (campusEditMode || buildingEditMode || drill || exitDrill) return;

      if (region.childMapId && isCampusView) {
        startDrillIn(region, region.childMapId);
        return;
      }

      if (region.childMapId) {
        navigateTo(region.childMapId, "forward");
        return;
      }

      const space = resolveSpaceForRegion(region, spaces);
      if (space?.isActive) {
        onRoomSelect(space, region);
      }
    },
    [
      navigateTo,
      onRoomSelect,
      spaces,
      campusEditMode,
      buildingEditMode,
      drill,
      exitDrill,
      isCampusView,
      startDrillIn,
    ],
  );

  const handleFloorUp = useCallback(() => {
    if (drill || exitDrill) return;
    const mapId = stackRef.current[stackRef.current.length - 1] ?? ROOT_MAP_ID;
    const level = getMapLevel(mapId);
    const max = getMapFloorCount(level) - 1;
    if (floorIndexRef.current >= max) return;
    onRoomDeselect?.();
    const next = floorIndexRef.current + 1;
    floorIndexRef.current = next;
    setFloorIndex(next);
  }, [drill, exitDrill, onRoomDeselect]);

  const handleFloorDown = useCallback(() => {
    if (drill || exitDrill) return;
    if (floorIndexRef.current <= 0) return;
    onRoomDeselect?.();
    const next = floorIndexRef.current - 1;
    floorIndexRef.current = next;
    setFloorIndex(next);
  }, [drill, exitDrill, onRoomDeselect]);

  const handleBack = useCallback(() => {
    if (drill || exitDrill || buildingEditMode) return;

    const currentId = stack[stack.length - 1];
    const selectedSlug = selectedSpaceSlugRef.current;
    const roomMatch = selectedSlug
      ? findRegionBySpaceSlug(selectedSlug, currentId)
      : undefined;

    if (roomMatch?.mapId === currentId) {
      const shortcut = findCampusShortcutForFocus(
        currentId,
        roomMatch.region.id,
      );
      if (shortcut) {
        startExitDrill(shortcut, currentId);
        return;
      }
      onRoomDeselect?.();
      return;
    }

    if (stack.length <= 1) return;

    const level = getMapLevel(currentId);
    const campusRegion =
      level?.parentMapId === ROOT_MAP_ID
        ? findCampusRegionForChildMap(currentId)
        : undefined;

    if (campusRegion) {
      startExitDrill(campusRegion, currentId);
      return;
    }

    navigateTo("", "back");
  }, [
    stack,
    drill,
    exitDrill,
    buildingEditMode,
    startExitDrill,
    navigateTo,
    onRoomDeselect,
  ]);

  const handleNavigateToIndex = useCallback(
    (index: number) => {
      if (drill || exitDrill) return;

      const currentId = stack[stack.length - 1];
      const selectedSlug = selectedSpaceSlugRef.current;
      const roomMatch = selectedSlug
        ? findRegionBySpaceSlug(selectedSlug, currentId)
        : undefined;
      const roomOnFloor =
        roomMatch?.mapId === currentId ? roomMatch : undefined;
      const mapCrumbCount = stack.length;
      const totalCrumbs = mapCrumbCount + (roomOnFloor ? 1 : 0);

      if (index >= totalCrumbs - 1) return;

      if (roomOnFloor && index === mapCrumbCount - 1) {
        onRoomDeselect?.();
        return;
      }

      if (roomOnFloor && index === 0) {
        const shortcut = findCampusShortcutForFocus(
          currentId,
          roomOnFloor.region.id,
        );
        if (shortcut) {
          startExitDrill(shortcut, currentId);
          return;
        }
      }

      if (roomOnFloor && index < mapCrumbCount - 1) {
        onRoomDeselect?.();
      }

      const targetId = stack[index];
      const leavingId = stack[stack.length - 1];
      const campusRegion =
        index === 0 && stack.length > 1
          ? findCampusRegionForChildMap(leavingId)
          : undefined;

      if (campusRegion && targetId === ROOT_MAP_ID) {
        startExitDrill(campusRegion, leavingId);
        return;
      }

      setAnimClass("map-exit-back");
      window.setTimeout(() => {
        const nextStack = stack.slice(0, index + 1);
        stackRef.current = nextStack;
        setStack(nextStack);
        setAnimClass("map-enter-back");
        window.setTimeout(() => setAnimClass("map-enter-active"), 320);
      }, 280);
    },
    [stack, drill, exitDrill, startExitDrill, onRoomDeselect],
  );

  useEffect(() => {
    if (!navigationActionsRef) return;

    const actions = {
      onBack: handleBack,
      onNavigateToIndex: handleNavigateToIndex,
      onFloorUp: handleFloorUp,
      onFloorDown: handleFloorDown,
    };
    navigationActionsRef.current = actions;

    return () => {
      if (navigationActionsRef.current === actions) {
        navigationActionsRef.current = null;
      }
    };
  }, [
    navigationActionsRef,
    handleBack,
    handleNavigateToIndex,
    handleFloorUp,
    handleFloorDown,
  ]);

  useEffect(() => {
    if (!isCampusView && !drill && !exitDrill) {
      chromeShownRef.current = true;
    }
    publishNavMeta(transitionT);
  }, [
    publishNavMeta,
    drill,
    exitDrill,
    stack,
    campusEditMode,
    buildingEditMode,
    isCampusView,
    transitionT,
    floorIndex,
  ]);

  if (!currentLevel) {
    return (
      <p className="text-text-secondary" role="alert">
        Map not found.
      </p>
    );
  }

  const campusLevel = getMapLevel(ROOT_MAP_ID);
  const isOnCampusChildFloor =
    !isCampusView && currentLevel?.parentMapId === ROOT_MAP_ID;
  const campusRegionForFloor = isOnCampusChildFloor
    ? findCampusRegionForChildMap(currentMapId)
    : null;
  const showCampusLayer = Boolean(
    campusLevel && (isCampusView || drill || exitDrill || isOnCampusChildFloor),
  );
  const campusHoldRegion =
    isOnCampusChildFloor && !drill && !exitDrill ? campusRegionForFloor : null;

  const floorLevel =
    drillChildLevel ??
    exitFloorLevel ??
    (isOnCampusChildFloor ? currentLevel : undefined);
  const floorDrillRegion =
    drill?.region ?? exitDrill?.region ?? campusRegionForFloor ?? null;

  const floorCrossfadeOpacity =
    drill || exitDrill
      ? getDrillCrossfadeOpacity(transitionT)
      : isOnCampusChildFloor
        ? 1
        : 0;

  const campusCrossfadeOpacity =
    drill || exitDrill
      ? 1 - floorCrossfadeOpacity
      : isOnCampusChildFloor
        ? 0
        : 1;

  const drillCameraProgress = drill
    ? transitionT
    : exitDrill
      ? 1 - transitionT
      : null;

  const isMapTransitioning = Boolean(drill || exitDrill);
  const floorDrillCameraT = isMapTransitioning
    ? computeFloorScaleProgress(transitionT, exitDrill ? "out" : "in")
    : null;

  const mapContent = (
    <>
      {isCampusView && campusEditMode ? (
        <CampusMapEditor />
      ) : isBuildingEditActive && buildingEditMode ? (
        <BuildingMapEditor buildingId={buildingEditMode} spaces={spaces} />
      ) : showCampusLayer && campusLevel ? (
        <div className="relative h-full min-h-0 w-full">
          <div
            className={cn(
              "absolute inset-0",
              !isMapTransitioning &&
                "transition-opacity duration-300 ease-out motion-reduce:transition-none",
            )}
            style={{
              opacity: campusCrossfadeOpacity,
              pointerEvents: campusCrossfadeOpacity < 0.05 ? "none" : "auto",
            }}
            aria-hidden={campusCrossfadeOpacity < 0.05}
          >
            <InteractiveMapCanvas
              level={campusLevel}
              regions={campusLevel.regions}
              getRegionStatus={getRegionStatus}
              isRegionActive={isRegionActive}
              onRegionClick={handleRegionClick}
              variant="campus"
              className="h-full"
              drillRegion={drill ? drill.region : null}
              drillOutRegion={exitDrill ? exitDrill.region : null}
              drillProgress={drillCameraProgress}
              campusHoldRegion={campusHoldRegion}
              onDrillCameraChange={handleDrillCameraChange}
            />
          </div>
          {floorLevel && floorDrillRegion ? (
            <BuildingDrillFrame
              region={floorDrillRegion}
              expansion={isMapTransitioning ? transitionT : 1}
              direction={exitDrill ? "out" : "in"}
              syncCamera={isMapTransitioning ? drillSyncCamera : null}
              drillStartCamera={isMapTransitioning ? drillStartCamera : null}
            >
              <BuildingFloorStack
                level={floorLevel}
                floorIndex={floorIndex}
                getRegionStatus={getRegionStatus}
                isRegionActive={isRegionActive}
                onRegionClick={handleRegionClick}
                drillProgress={floorDrillCameraT}
                className="h-full"
                selectedRegionId={
                  drill?.region.focusRegionId ??
                  (selectedRegionMatch?.mapId === floorLevel.id
                    ? selectedRegionMatch.region.id
                    : null)
                }
              />
            </BuildingDrillFrame>
          ) : null}
        </div>
      ) : (
        <InteractiveMapCanvas
          level={currentLevel}
          regions={currentLevel.regions}
          getRegionStatus={getRegionStatus}
          isRegionActive={isRegionActive}
          onRegionClick={handleRegionClick}
          variant={isCampusView ? "campus" : "floor"}
          fullBleed={!isCampusView}
          className={isCampusView ? "h-full" : "h-full"}
          selectedRegionId={selectedRegionId}
        />
      )}
    </>
  );

  return (
    <div className="relative h-full min-h-0 w-full">
      <div
        className={cn(
          "map-transition-layer h-full min-h-0",
          campusEditMode || buildingEditMode || drill || exitDrill
            ? "map-enter-active"
            : animClass,
        )}
      >
        {mapContent}
      </div>
    </div>
  );
}

function clampProgress(t: number): number {
  return Math.min(1, Math.max(0, t));
}
