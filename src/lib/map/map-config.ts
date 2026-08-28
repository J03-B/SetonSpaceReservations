/**
 * Hierarchical campus map configuration.
 * Edit regions in /configure/map — export and paste updates here.
 *
 * Image files live in public/map/:
 * - MainMap.png          → campus overview
 * - MainMap-LogoLayer.png → campus logo overlay (parallax layer)
 * - MainBuilding.png     → main building floor plan
 * - CourpusChristi.png   → Corpus Christi floor plan
 */

/** Canonical paths to map images in public/map/ */
export const MAP_IMAGES = {
  campus: "/map/MainMap.png",
  campusLogo: "/map/MainMap-LogoLayer.png",
  mainBuilding: "/map/MainBuilding.png",
  corpusChristi: "/map/CourpusChristi.png",
} as const;

export interface MapPoint {
  /** Percent of image width/height (0–100) */
  x: number;
  y: number;
}

export interface MapRegion {
  /** Unique id within this map level */
  id: string;
  label: string;
  /** Bounding box — percent of image width/height (0–100) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional polygon outline (percent coords). When set, used for shape + hit area. */
  points?: MapPoint[];
  /** Link separate footprints — hover/zoom treats them as one building */
  hoverGroupId?: string;
  /** Omit map label (e.g. secondary wing of a grouped building) */
  hideLabel?: boolean;
  /** Campus map label lines. When set, each entry is its own line. */
  mapLabelLines?: string[];
  /** Drill down to another map level */
  childMapId?: string;
  /** Link to reservable space slug (master plan spaces table) */
  spaceSlug?: string;
}

export interface MapLevel {
  id: string;
  title: string;
  imageSrc: string;
  /** Optional foreground overlay aligned to imageSrc (e.g. campus logo parallax) */
  logoSrc?: string;
  /** Parent map for breadcrumbs and drill-up */
  parentMapId?: string;
  regions: MapRegion[];
}

export const MAP_LEVELS: Record<string, MapLevel> = {
  campus: {
    id: "campus",
    title: "Campus",
    imageSrc: MAP_IMAGES.campus,
    logoSrc: MAP_IMAGES.campusLogo,
    regions: [
      {
        id: "catc",
        label: "Carlo Acutis Tech Center",
        mapLabelLines: ["Carlo Acutis", "Tech Center"],
        x: 44.76,
        y: 72.57,
        width: 3.93,
        height: 12.59,
        points: [
          { x: 44.76, y: 84.2 },
          { x: 45.78, y: 72.57 },
          { x: 48.69, y: 73.52 },
          { x: 47.55, y: 85.15 },
        ],
      },
      {
        id: "cc",
        label: "Corpus Christi",
        x: 57.98,
        y: 73.87,
        width: 14.19,
        height: 21.97,
        points: [
          { x: 59.74, y: 73.87 },
          { x: 59.69, y: 78.98 },
          { x: 58.49, y: 78.74 },
          { x: 57.98, y: 93.71 },
          { x: 70.68, y: 95.84 },
          { x: 70.74, y: 86.1 },
          { x: 72.11, y: 85.99 },
          { x: 72.17, y: 79.1 },
          { x: 62.42, y: 78.98 },
          { x: 62.42, y: 73.99 },
        ],
        childMapId: "corpus-christi",
      },
      {
        id: "m",
        label: "Main Building",
        x: 53.47,
        y: 19.83,
        width: 21.33,
        height: 14.37,
        points: [
          { x: 53.47, y: 31.83 },
          { x: 53.47, y: 23.75 },
          { x: 54.84, y: 23.75 },
          { x: 55.97, y: 21.14 },
          { x: 57.11, y: 21.02 },
          { x: 57.22, y: 23.4 },
          { x: 59.78, y: 23.4 },
          { x: 59.78, y: 21.85 },
          { x: 64.22, y: 21.85 },
          { x: 64.22, y: 26.13 },
          { x: 67.41, y: 26.13 },
          { x: 67.41, y: 19.83 },
          { x: 70.82, y: 19.83 },
          { x: 70.82, y: 23.87 },
          { x: 74.8, y: 23.75 },
          { x: 74.8, y: 34.2 },
          { x: 60.13, y: 34.2 },
          { x: 60.13, y: 31.71 },
        ],
        childMapId: "main-building",
        hoverGroupId: "main-building",
      },
      {
        id: "m-addition",
        label: "Main Building",
        x: 42.72,
        y: 15.68,
        width: 10.07,
        height: 4.99,
        points: [
          { x: 42.78, y: 15.8 },
          { x: 52.79, y: 15.68 },
          { x: 52.73, y: 20.55 },
          { x: 42.72, y: 20.67 },
        ],
        childMapId: "main-building",
        hoverGroupId: "main-building",
        hideLabel: true,
      },
      {
        id: "jp2-gym",
        label: "JPII Gym",
        x: 42.78,
        y: 20.9,
        width: 10.41,
        height: 26.6,
        points: [
          { x: 42.78, y: 21.02 },
          { x: 52.73, y: 20.9 },
          { x: 52.73, y: 21.85 },
          { x: 53.19, y: 21.73 },
          { x: 53.13, y: 47.51 },
          { x: 42.78, y: 47.39 },
        ],
        spaceSlug: "gym",
      },
      {
        id: "divine-mercy-center",
        label: "Divine Mercy Center",
        x: 22.48,
        y: 28.86,
        width: 10.88,
        height: 19.71,
        points: [
          { x: 22.48, y: 30.88 },
          { x: 22.48, y: 46.67 },
          { x: 26.58, y: 46.44 },
          { x: 26.64, y: 48.46 },
          { x: 30.8, y: 48.57 },
          { x: 30.85, y: 44.54 },
          { x: 32.17, y: 44.54 },
          { x: 32.22, y: 36.7 },
          { x: 33.31, y: 36.58 },
          { x: 33.36, y: 31.0 },
          { x: 30.74, y: 31.12 },
          { x: 30.68, y: 28.86 },
          { x: 28.69, y: 28.86 },
          { x: 28.63, y: 31.0 },
        ],
        spaceSlug: "dmc",
      },
    ],
  },

  "main-building": {
    id: "main-building",
    title: "Main Building",
    imageSrc: MAP_IMAGES.mainBuilding,
    parentMapId: "campus",
    regions: [
      {
        id: "john-paul-ii-gym",
        label: "John Paul II (Gym)",
        x: 4,
        y: 52,
        width: 38,
        height: 42,
        spaceSlug: "gym",
      },
      {
        id: "benedict",
        label: "Benedict",
        x: 6,
        y: 44,
        width: 12,
        height: 8,
      },
      {
        id: "laboure",
        label: "Laboure",
        x: 42,
        y: 44,
        width: 10,
        height: 10,
        spaceSlug: "dmc",
      },
      {
        id: "vianney",
        label: "Vianney",
        x: 6,
        y: 28,
        width: 10,
        height: 12,
      },
      {
        id: "imelda",
        label: "Imelda",
        x: 18,
        y: 28,
        width: 10,
        height: 12,
      },
      {
        id: "joan",
        label: "Joan",
        x: 30,
        y: 28,
        width: 10,
        height: 12,
      },
      {
        id: "chapel",
        label: "Our Lady Queen of the Angels Chapel",
        x: 44,
        y: 4,
        width: 22,
        height: 14,
      },
      {
        id: "aquinas",
        label: "Aquinas",
        x: 44,
        y: 20,
        width: 10,
        height: 8,
      },
      {
        id: "clare",
        label: "Clare",
        x: 56,
        y: 20,
        width: 10,
        height: 8,
      },
      {
        id: "siena",
        label: "Siena",
        x: 72,
        y: 68,
        width: 12,
        height: 10,
      },
      {
        id: "claude",
        label: "Claude",
        x: 86,
        y: 68,
        width: 10,
        height: 10,
      },
      {
        id: "jerome-library",
        label: "Jerome (Library)",
        x: 72,
        y: 48,
        width: 14,
        height: 10,
      },
      {
        id: "stein",
        label: "Stein (Computer Lab)",
        x: 72,
        y: 58,
        width: 14,
        height: 8,
      },
      {
        id: "bosco",
        label: "Bosco (Art)",
        x: 58,
        y: 48,
        width: 12,
        height: 18,
      },
    ],
  },

  "corpus-christi": {
    id: "corpus-christi",
    title: "Corpus Christi",
    imageSrc: MAP_IMAGES.corpusChristi,
    parentMapId: "campus",
    regions: [
      {
        id: "innocents",
        label: "Innocents",
        x: 4.07,
        y: 4.22,
        width: 16.78,
        height: 23.56,
        spaceSlug: "innocents",
        points: [
          { x: 4.41, y: 27.51 },
          { x: 4.07, y: 4.22 },
          { x: 20.85, y: 4.49 },
          { x: 20.85, y: 27.78 },
        ],
      },
      {
        id: "patrick",
        label: "Patrick",
        x: 80.05,
        y: 37.99,
        width: 15.42,
        height: 24.78,
        spaceSlug: "patrick",
        points: [
          { x: 80.05, y: 38.13 },
          { x: 95.48, y: 37.99 },
          { x: 95.14, y: 62.36 },
          { x: 80.05, y: 62.77 },
        ],
      },
      {
        id: "bertoni",
        label: "Bertoni",
        x: 77.9,
        y: 75.85,
        width: 17.01,
        height: 22.6,
        spaceSlug: "bertoni",
        points: [
          { x: 77.9, y: 98.45 },
          { x: 77.9, y: 76.12 },
          { x: 94.91, y: 75.85 },
          { x: 94.91, y: 98.31 },
        ],
      },
      {
        id: "neri",
        label: "Neri",
        x: 58.73,
        y: 75.98,
        width: 18.6,
        height: 22.74,
        spaceSlug: "neri",
        points: [
          { x: 59.41, y: 76.12 },
          { x: 77.22, y: 75.98 },
          { x: 77.33, y: 98.72 },
          { x: 58.73, y: 98.59 },
        ],
      },
      {
        id: "savio",
        label: "Savio",
        x: 40.7,
        y: 75.98,
        width: 17.92,
        height: 22.74,
        spaceSlug: "savio",
        points: [
          { x: 40.7, y: 75.98 },
          { x: 58.62, y: 76.12 },
          { x: 58.51, y: 98.59 },
          { x: 40.7, y: 98.72 },
        ],
      },
      {
        id: "joseph",
        label: "Joseph",
        x: 21.42,
        y: 76.12,
        width: 18.37,
        height: 22.47,
        spaceSlug: "joseph",
        points: [
          { x: 21.42, y: 98.59 },
          { x: 21.65, y: 76.12 },
          { x: 39.57, y: 76.12 },
          { x: 39.79, y: 98.59 },
        ],
      },
      {
        id: "faustina",
        label: "Faustina",
        x: 35.03,
        y: 3.95,
        width: 60.79,
        height: 23.15,
        spaceSlug: "faustina-hall",
        points: [
          { x: 35.03, y: 3.95 },
          { x: 95.14, y: 4.36 },
          { x: 95.82, y: 27.1 },
          { x: 35.26, y: 26.96 },
        ],
      },
      {
        id: "francis",
        label: "Francis",
        x: 4.41,
        y: 28.73,
        width: 16.33,
        height: 25.33,
        spaceSlug: "francis",
        points: [
          { x: 4.64, y: 28.73 },
          { x: 20.74, y: 28.87 },
          { x: 20.74, y: 54.06 },
          { x: 4.41, y: 53.92 },
        ],
      },
      {
        id: "fatima",
        label: "Fatima",
        x: 4.37,
        y: 75.71,
        width: 16.6,
        height: 22.88,
        spaceSlug: "fatima",
        points: [
          { x: 4.37, y: 75.93 },
          { x: 20.97, y: 75.71 },
          { x: 20.97, y: 98.59 },
          { x: 4.46, y: 98.59 },
        ],
      },
    ],
  },
};

export const ROOT_MAP_ID = "campus";

export function getMapLevel(id: string): MapLevel | undefined {
  return MAP_LEVELS[id];
}

export function getAllMapLevels(): MapLevel[] {
  return Object.values(MAP_LEVELS);
}

export function getMapPathTo(targetId: string): string[] {
  const path: string[] = [];
  let current: string | undefined = targetId;
  while (current) {
    path.unshift(current);
    current = MAP_LEVELS[current]?.parentMapId;
  }
  return path.length > 0 ? path : [ROOT_MAP_ID];
}
export function findRegionBySpaceSlug(
  spaceSlug: string,
): { mapId: string; region: MapRegion } | undefined {
  for (const level of Object.values(MAP_LEVELS)) {
    const region = level.regions.find((r) => r.spaceSlug === spaceSlug);
    if (region) {
      return { mapId: level.id, region };
    }
  }
  return undefined;
}

/** Campus building region that drills into a child floor map */
export function findCampusRegionForChildMap(
  childMapId: string,
): MapRegion | undefined {
  const matches = MAP_LEVELS.campus?.regions.filter(
    (r) => r.childMapId === childMapId,
  );
  if (!matches?.length) return undefined;
  return matches.find((r) => !r.hideLabel) ?? matches[0];
}
