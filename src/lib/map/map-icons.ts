export const MAP_ICON_KINDS = [
  "mens-bathroom",
  "womens-bathroom",
  "office",
] as const;

export type MapIconKind = (typeof MAP_ICON_KINDS)[number];

export interface MapIconMarker {
  id: string;
  kind: MapIconKind;
  /** Center of the icon, percent of map width/height (0–100) */
  x: number;
  y: number;
  /** Width as a percent of map width. Height matches (square). */
  size?: number;
}

export const MAP_ICON_CATALOG: Record<
  MapIconKind,
  { src: string; label: string }
> = {
  "mens-bathroom": {
    src: "/map/icons/mens-bathroom.png",
    label: "Men's bathroom",
  },
  "womens-bathroom": {
    src: "/map/icons/womens-bathroom.png",
    label: "Women's bathroom",
  },
  office: {
    src: "/map/icons/office.png",
    label: "Office",
  },
};

export const DEFAULT_MAP_ICON_SIZE = 4.4;
export const MAIN_BUILDING_MAP_ICON_SIZE = 1.32;
export const CAMPUS_MAP_ICON_SIZE = 2.6;
export const EMPTY_MAP_ICONS: MapIconMarker[] = [];

const STORAGE_KEY = "seton-map-icons-v1";

type DraftStore = Record<string, MapIconMarker[]>;

export function mapIconDraftKey(mapId: string, floorIndex: number): string {
  return `${mapId}:${floorIndex}`;
}

function readStore(): DraftStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readMapIconDraft(
  mapId: string,
  floorIndex: number,
): MapIconMarker[] | null {
  const value = readStore()[mapIconDraftKey(mapId, floorIndex)];
  return Array.isArray(value) ? value : null;
}

export function writeMapIconDraft(
  mapId: string,
  floorIndex: number,
  icons: MapIconMarker[],
): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  store[mapIconDraftKey(mapId, floorIndex)] = icons;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("seton-map-icons"));
}

export function subscribeMapIconStore(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener("seton-map-icons", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("seton-map-icons", onChange);
  };
}

export function resolveMapIcons(
  mapId: string,
  floorIndex: number,
  configIcons: MapIconMarker[] = [],
): MapIconMarker[] {
  return readMapIconDraft(mapId, floorIndex) ?? configIcons;
}

export function createMapIcon(
  kind: MapIconKind,
  x: number,
  y: number,
  size: number,
): MapIconMarker {
  const token = Math.random().toString(36).slice(2, 8);
  return {
    id: `${kind}-${token}`,
    kind,
    x,
    y,
    size,
  };
}
