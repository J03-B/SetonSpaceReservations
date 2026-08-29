/**
 * Hierarchical campus map configuration.
 * Edit regions in /configure/map — export and paste updates here.
 *
 * Image files live in public/map/:
 * - MainMap.png          → campus overview
 * - MainMap-LogoLayer.png → campus logo overlay (parallax layer)
 * - MainBuildingFloor1–3.png → Main Building stacked floors
 * - CourpusChristi.png   → Corpus Christi floor plan
 * - DMC.png              → Divine Mercy Center floor plan
 * - CATC.png             → Carlo Acutis Tech Center floor plan
 */

/** Canonical paths to map images in public/map/ */
export const MAP_IMAGES = {
  campus: "/map/MainMap.png",
  campusLogo: "/map/MainMap-LogoLayer.png",
  mainBuilding: "/map/MainBuildingFloor1.png",
  mainBuildingFloor1: "/map/MainBuildingFloor1.png",
  mainBuildingFloor2: "/map/MainBuildingFloor2.png",
  mainBuildingFloor3: "/map/MainBuildingFloor3.png",
  corpusChristi: "/map/CourpusChristi.png",
  divineMercyCenter: "/map/DMC.png",
  carloAcutis: "/map/CATC.png",
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
  /** After entering childMapId, select this room on that map */
  focusRegionId?: string;
  /** Link to reservable room slug (`rooms` table) */
  spaceSlug?: string;
}

export interface MapFloorSpec {
  /** 1-based floor number shown in the floor control */
  number: number;
  imageSrc: string;
  /** When omitted, floor 1 uses the level `regions`; other floors have none. */
  regions?: MapRegion[];
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
  /** Stacked floors for this building. Index 0 is the entry floor. */
  floors?: MapFloorSpec[];
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
        childMapId: "carlo-acutis",
        focusRegionId: "vex-space",
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
        label: "JP II Center",
        mapLabelLines: ["JP II", "Center"],
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
        childMapId: "main-building",
        focusRegionId: "john-paul-ii-gym",
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
        childMapId: "divine-mercy-center",
      },
    ],
  },

  "main-building": {
    id: "main-building",
    title: "Main Building",
    imageSrc: MAP_IMAGES.mainBuildingFloor1,
    parentMapId: "campus",
    floors: [
      {
        number: 1,
        imageSrc: MAP_IMAGES.mainBuildingFloor1,
        regions: [
          {
            id: "john-paul-ii-gym",
            label: "John Paul II (Gym)",
            x: 4.14,
            y: 53.81,
            width: 17.55,
            height: 32.61,
            points: [
              { x: 4.245, y: 53.942 },
              { x: 21.641, y: 53.807 },
              { x: 21.693, y: 86.422 },
              { x: 4.141, y: 86.354 },
            ],
            spaceSlug: "gym",
          },
          {
            id: "benedict",
            label: "Benedict",
            x: 7.63,
            y: 48.89,
            width: 5.83,
            height: 4.58,
            points: [
              { x: 7.63, y: 48.888 },
              { x: 13.464, y: 48.888 },
              { x: 13.464, y: 53.47 },
              { x: 7.63, y: 53.47 },
            ],
            spaceSlug: "benedict",
          },
          {
            id: "laboure",
            label: "Laboure",
            x: 21.9,
            y: 51.04,
            width: 13.23,
            height: 9.97,
            points: [
              { x: 21.901, y: 51.044 },
              { x: 35.13, y: 51.044 },
              { x: 35.13, y: 61.018 },
              { x: 22.005, y: 61.018 },
            ],
            spaceSlug: "laboure",
          },
          {
            id: "chapel",
            label: "Chapel",
            x: 37.58,
            y: 24.56,
            width: 20.16,
            height: 14.29,
            points: [
              { x: 37.578, y: 24.562 },
              { x: 57.734, y: 24.562 },
              { x: 57.526, y: 38.848 },
              { x: 37.734, y: 38.848 },
            ],
            spaceSlug: "chapel",
          },
          {
            id: "aquinas",
            label: "Aquinas",
            x: 40.55,
            y: 42.89,
            width: 8.96,
            height: 18.13,
            points: [
              { x: 40.547, y: 42.891 },
              { x: 49.505, y: 42.891 },
              { x: 49.505, y: 61.018 },
              { x: 40.599, y: 61.018 },
            ],
            spaceSlug: "aquinas",
          },
          {
            id: "clare",
            label: "Clare",
            x: 49.77,
            y: 42.96,
            width: 9.06,
            height: 9.64,
            points: [
              { x: 49.766, y: 42.958 },
              { x: 58.828, y: 42.958 },
              { x: 58.828, y: 52.594 },
              { x: 49.87, y: 52.594 },
            ],
            spaceSlug: "clare",
          },
          {
            id: "siena",
            label: "Siena",
            x: 66.22,
            y: 67.15,
            width: 7.24,
            height: 13.68,
            points: [
              { x: 66.224, y: 67.15 },
              { x: 73.464, y: 67.15 },
              { x: 73.464, y: 80.829 },
              { x: 66.224, y: 80.829 },
            ],
            spaceSlug: "siena",
          },
          {
            id: "claude",
            label: "Claude",
            x: 73.67,
            y: 67.15,
            width: 8.7,
            height: 13.68,
            points: [
              { x: 73.672, y: 67.15 },
              { x: 82.37, y: 67.15 },
              { x: 82.37, y: 80.829 },
              { x: 73.776, y: 80.829 },
            ],
            spaceSlug: "claude",
          },
          {
            id: "bosco",
            label: "Bosco (Art)",
            x: 61.64,
            y: 52.86,
            width: 10.26,
            height: 9.91,
            points: [
              { x: 61.641, y: 52.864 },
              { x: 71.901, y: 52.864 },
              { x: 71.901, y: 62.77 },
              { x: 61.641, y: 62.77 },
            ],
            spaceSlug: "bosco",
          },
          {
            id: "anthony",
            label: "Anthony",
            x: 72.11,
            y: 52.86,
            width: 10.36,
            height: 9.97,
            points: [
              { x: 72.109, y: 52.864 },
              { x: 82.474, y: 52.864 },
              { x: 82.474, y: 62.77 },
              { x: 72.109, y: 62.837 },
            ],
            spaceSlug: "anthony",
          },
        ],
      },
      {
        number: 2,
        imageSrc: MAP_IMAGES.mainBuildingFloor2,
        regions: [
          {
            id: "vianney",
            label: "Vianney",
            x: 4.24,
            y: 48.75,
            width: 5.47,
            height: 5.93,
            points: [
              { x: 4.245, y: 48.753 },
              { x: 9.714, y: 48.753 },
              { x: 9.714, y: 54.346 },
              { x: 4.245, y: 54.683 },
            ],
            spaceSlug: "vianney",
          },
          {
            id: "imelda",
            label: "Imelda",
            x: 9.97,
            y: 48.75,
            width: 5.36,
            height: 5.59,
            points: [
              { x: 9.974, y: 48.753 },
              { x: 15.339, y: 48.753 },
              { x: 15.339, y: 54.346 },
              { x: 9.974, y: 54.346 },
            ],
            spaceSlug: "imelda",
          },
          {
            id: "joan",
            label: "Joan",
            x: 15.7,
            y: 48.96,
            width: 4.32,
            height: 5.32,
            points: [
              { x: 15.703, y: 48.956 },
              { x: 20.026, y: 48.956 },
              { x: 20.026, y: 54.279 },
              { x: 15.703, y: 54.077 },
            ],
            spaceSlug: "joan",
          },
          {
            id: "jerome-library",
            label: "Jerome (Library)",
            x: 69.66,
            y: 59.06,
            width: 8.96,
            height: 9.97,
            points: [
              { x: 69.661, y: 59.063 },
              { x: 78.62, y: 59.131 },
              { x: 78.62, y: 69.036 },
              { x: 69.714, y: 69.036 },
            ],
            spaceSlug: "jerome",
          },
          {
            id: "stein",
            label: "Stein (Computer Lab)",
            x: 69.66,
            y: 69.31,
            width: 8.96,
            height: 9.57,
            points: [
              { x: 69.661, y: 69.306 },
              { x: 78.62, y: 69.306 },
              { x: 78.62, y: 78.875 },
              { x: 69.661, y: 78.875 },
            ],
            spaceSlug: "stein",
          },
          {
            id: "teresa",
            label: "Teresa",
            x: 78.88,
            y: 59.06,
            width: 8.96,
            height: 9.97,
            points: [
              { x: 78.88, y: 59.131 },
              { x: 87.839, y: 59.063 },
              { x: 87.839, y: 69.036 },
              { x: 78.932, y: 69.036 },
            ],
            spaceSlug: "teresa",
          },
          {
            id: "goretti",
            label: "Goretti",
            x: 78.88,
            y: 69.44,
            width: 8.91,
            height: 9.43,
            points: [
              { x: 78.88, y: 69.441 },
              { x: 87.786, y: 69.441 },
              { x: 87.786, y: 78.875 },
              { x: 78.88, y: 78.875 },
            ],
            spaceSlug: "goretti",
          },
        ],
      },
      { number: 3, imageSrc: MAP_IMAGES.mainBuildingFloor3, regions: [] },
    ],
    regions: [
      {
        id: "john-paul-ii-gym",
        label: "John Paul II (Gym)",
        x: 4.14,
        y: 53.81,
        width: 17.55,
        height: 32.61,
        points: [
          { x: 4.245, y: 53.942 },
          { x: 21.641, y: 53.807 },
          { x: 21.693, y: 86.422 },
          { x: 4.141, y: 86.354 },
        ],
        spaceSlug: "gym",
      },
      {
        id: "benedict",
        label: "Benedict",
        x: 7.63,
        y: 48.89,
        width: 5.83,
        height: 4.58,
        points: [
          { x: 7.63, y: 48.888 },
          { x: 13.464, y: 48.888 },
          { x: 13.464, y: 53.47 },
          { x: 7.63, y: 53.47 },
        ],
        spaceSlug: "benedict",
      },
      {
        id: "laboure",
        label: "Laboure",
        x: 21.9,
        y: 51.04,
        width: 13.23,
        height: 9.97,
        points: [
          { x: 21.901, y: 51.044 },
          { x: 35.13, y: 51.044 },
          { x: 35.13, y: 61.018 },
          { x: 22.005, y: 61.018 },
        ],
        spaceSlug: "laboure",
      },
      {
        id: "chapel",
        label: "Chapel",
        x: 37.58,
        y: 24.56,
        width: 20.16,
        height: 14.29,
        points: [
          { x: 37.578, y: 24.562 },
          { x: 57.734, y: 24.562 },
          { x: 57.526, y: 38.848 },
          { x: 37.734, y: 38.848 },
        ],
        spaceSlug: "chapel",
      },
      {
        id: "aquinas",
        label: "Aquinas",
        x: 40.55,
        y: 42.89,
        width: 8.96,
        height: 18.13,
        points: [
          { x: 40.547, y: 42.891 },
          { x: 49.505, y: 42.891 },
          { x: 49.505, y: 61.018 },
          { x: 40.599, y: 61.018 },
        ],
        spaceSlug: "aquinas",
      },
      {
        id: "clare",
        label: "Clare",
        x: 49.77,
        y: 42.96,
        width: 9.06,
        height: 9.64,
        points: [
          { x: 49.766, y: 42.958 },
          { x: 58.828, y: 42.958 },
          { x: 58.828, y: 52.594 },
          { x: 49.87, y: 52.594 },
        ],
        spaceSlug: "clare",
      },
      {
        id: "siena",
        label: "Siena",
        x: 66.22,
        y: 67.15,
        width: 7.24,
        height: 13.68,
        points: [
          { x: 66.224, y: 67.15 },
          { x: 73.464, y: 67.15 },
          { x: 73.464, y: 80.829 },
          { x: 66.224, y: 80.829 },
        ],
        spaceSlug: "siena",
      },
      {
        id: "claude",
        label: "Claude",
        x: 73.67,
        y: 67.15,
        width: 8.7,
        height: 13.68,
        points: [
          { x: 73.672, y: 67.15 },
          { x: 82.37, y: 67.15 },
          { x: 82.37, y: 80.829 },
          { x: 73.776, y: 80.829 },
        ],
        spaceSlug: "claude",
      },
      {
        id: "bosco",
        label: "Bosco (Art)",
        x: 61.64,
        y: 52.86,
        width: 10.26,
        height: 9.91,
        points: [
          { x: 61.641, y: 52.864 },
          { x: 71.901, y: 52.864 },
          { x: 71.901, y: 62.77 },
          { x: 61.641, y: 62.77 },
        ],
        spaceSlug: "bosco",
      },
      {
        id: "anthony",
        label: "Anthony",
        x: 72.11,
        y: 52.86,
        width: 10.36,
        height: 9.97,
        points: [
          { x: 72.109, y: 52.864 },
          { x: 82.474, y: 52.864 },
          { x: 82.474, y: 62.77 },
          { x: 72.109, y: 62.837 },
        ],
        spaceSlug: "anthony",
      },
    ],
  },

  "divine-mercy-center": {
    id: "divine-mercy-center",
    title: "Divine Mercy Center",
    imageSrc: MAP_IMAGES.divineMercyCenter,
    parentMapId: "campus",
    regions: [
      {
        id: "classroom",
        label: "Classroom",
        x: 45.8,
        y: 23.0,
        width: 16.4,
        height: 28.6,
        points: [
          { x: 46.0, y: 25.9 },
          { x: 46.6, y: 23.7 },
          { x: 62.1, y: 23.0 },
          { x: 61.9, y: 33.1 },
          { x: 61.0, y: 51.5 },
          { x: 46.2, y: 48.0 },
        ],
        spaceSlug: "classroom",
      },
      {
        id: "common-space",
        label: "Common Space",
        x: 46.1,
        y: 65.6,
        width: 15.7,
        height: 24.5,
        points: [
          { x: 46.5, y: 66.6 },
          { x: 61.7, y: 65.6 },
          { x: 60.6, y: 90.0 },
          { x: 46.3, y: 87.2 },
        ],
        spaceSlug: "common-space",
      },
    ],
  },

  "carlo-acutis": {
    id: "carlo-acutis",
    title: "Carlo Acutis Tech Center",
    imageSrc: MAP_IMAGES.carloAcutis,
    parentMapId: "campus",
    regions: [
      {
        id: "vex-space",
        label: "VEX Space",
        x: 26.2,
        y: 8.0,
        width: 44.2,
        height: 82.4,
        points: [
          { x: 48.1, y: 8.0 },
          { x: 64.4, y: 12.0 },
          { x: 70.2, y: 16.1 },
          { x: 66.8, y: 24.2 },
          { x: 65.3, y: 36.3 },
          { x: 63.3, y: 48.5 },
          { x: 60.5, y: 56.6 },
          { x: 55.1, y: 72.8 },
          { x: 50.7, y: 89.0 },
          { x: 47.1, y: 89.0 },
          { x: 37.5, y: 80.9 },
          { x: 26.2, y: 72.8 },
          { x: 28.8, y: 64.7 },
          { x: 35.0, y: 48.5 },
          { x: 38.8, y: 32.3 },
          { x: 43.8, y: 16.1 },
        ],
        spaceSlug: "vex-space",
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
        x: 4.22,
        y: 4.07,
        width: 16.81,
        height: 23.97,
        points: [
          { x: 4.225, y: 28.038 },
          { x: 4.225, y: 4.069 },
          { x: 21.031, y: 4.069 },
          { x: 21.031, y: 28.038 },
        ],
        spaceSlug: "innocents",
      },
      {
        id: "patrick",
        label: "Patrick",
        x: 79.9,
        y: 38.07,
        width: 15.51,
        height: 24.86,
        points: [
          { x: 79.898, y: 38.071 },
          { x: 95.311, y: 38.071 },
          { x: 95.404, y: 62.932 },
          { x: 79.898, y: 62.932 },
        ],
        spaceSlug: "patrick",
      },
      {
        id: "bertoni",
        label: "Bertoni",
        x: 77.76,
        y: 75.86,
        width: 17.46,
        height: 22.85,
        points: [
          { x: 77.762, y: 98.718 },
          { x: 77.762, y: 75.864 },
          { x: 95.218, y: 75.864 },
          { x: 95.218, y: 98.718 },
        ],
        spaceSlug: "bertoni",
      },
      {
        id: "neri",
        label: "Neri",
        x: 59.19,
        y: 75.86,
        width: 18.14,
        height: 22.86,
        points: [
          { x: 59.192, y: 75.864 },
          { x: 77.298, y: 75.864 },
          { x: 77.33, y: 98.72 },
          { x: 59.192, y: 98.718 },
        ],
        spaceSlug: "neri",
      },
      {
        id: "savio",
        label: "Savio",
        x: 40.53,
        y: 75.86,
        width: 18.2,
        height: 22.85,
        points: [
          { x: 40.529, y: 75.864 },
          { x: 58.728, y: 75.864 },
          { x: 58.728, y: 98.718 },
          { x: 40.529, y: 98.718 },
        ],
        spaceSlug: "savio",
      },
      {
        id: "joseph",
        label: "Joseph",
        x: 21.49,
        y: 75.86,
        width: 18.38,
        height: 22.85,
        points: [
          { x: 21.495, y: 98.718 },
          { x: 21.495, y: 75.864 },
          { x: 39.879, y: 75.864 },
          { x: 39.879, y: 98.718 },
        ],
        spaceSlug: "joseph",
      },
      {
        id: "faustina",
        label: "Faustina",
        x: 34.96,
        y: 4.07,
        width: 60.63,
        height: 23.3,
        points: [
          { x: 34.958, y: 4.069 },
          { x: 95.59, y: 4.069 },
          { x: 95.497, y: 27.369 },
          { x: 34.958, y: 27.369 },
        ],
        spaceSlug: "faustina",
      },
      {
        id: "francis",
        label: "Francis",
        x: 4.32,
        y: 28.71,
        width: 16.71,
        height: 25.64,
        points: [
          { x: 4.318, y: 28.707 },
          { x: 21.031, y: 28.707 },
          { x: 21.031, y: 54.348 },
          { x: 4.318, y: 54.348 },
        ],
        spaceSlug: "francis",
      },
      {
        id: "fatima",
        label: "Fatima",
        x: 4.22,
        y: 75.86,
        width: 16.9,
        height: 22.85,
        points: [
          { x: 4.225, y: 75.864 },
          { x: 21.123, y: 75.864 },
          { x: 21.031, y: 98.718 },
          { x: 4.318, y: 98.718 },
        ],
        spaceSlug: "fatima",
      },
    ],
  },
};

export const ROOT_MAP_ID = "campus";

export function getMapLevel(id: string): MapLevel | undefined {
  return MAP_LEVELS[id];
}

export function getMapFloorCount(level: MapLevel | undefined): number {
  if (!level) return 1;
  return Math.max(1, level.floors?.length ?? 1);
}

/** Interior rooms are selectable like Corpus Christi even before a spaceSlug is wired. */
function withDefaultRoomSlug(region: MapRegion): MapRegion {
  if (region.spaceSlug || region.childMapId) return region;
  return { ...region, spaceSlug: region.id };
}

export function getMapFloor(
  level: MapLevel,
  index: number,
): { number: number; imageSrc: string; regions: MapRegion[] } {
  const floors = level.floors;
  if (!floors?.length) {
    return {
      number: 1,
      imageSrc: level.imageSrc,
      regions: level.regions.map(withDefaultRoomSlug),
    };
  }
  const clamped = Math.min(floors.length - 1, Math.max(0, index));
  const floor = floors[clamped];
  return {
    number: floor.number,
    imageSrc: floor.imageSrc,
    regions: (floor.regions ?? (clamped === 0 ? level.regions : [])).map(
      withDefaultRoomSlug,
    ),
  };
}

export function mapLevelForFloor(level: MapLevel, index: number): MapLevel {
  const floor = getMapFloor(level, index);
  return {
    ...level,
    imageSrc: floor.imageSrc,
    regions: floor.regions,
  };
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

export function findRegionInMap(
  mapId: string,
  regionId: string,
): { region: MapRegion; floorIndex: number } | undefined {
  const level = getMapLevel(mapId);
  if (!level) return undefined;
  const floorCount = getMapFloorCount(level);
  for (let index = 0; index < floorCount; index += 1) {
    const region = getMapFloor(level, index).regions.find(
      (entry) => entry.id === regionId,
    );
    if (region) return { region, floorIndex: index };
  }
  return undefined;
}

export function findRegionBySpaceSlug(
  spaceSlug: string,
  preferredMapId?: string,
): { mapId: string; region: MapRegion; floorIndex: number } | undefined {
  const matches: { mapId: string; region: MapRegion; floorIndex: number }[] =
    [];

  for (const level of Object.values(MAP_LEVELS)) {
    const seen = new Set<string>();
    const floorCount = getMapFloorCount(level);
    for (let index = 0; index < floorCount; index += 1) {
      for (const region of getMapFloor(level, index).regions) {
        if (
          (region.spaceSlug !== spaceSlug && region.id !== spaceSlug) ||
          seen.has(region.id)
        ) {
          continue;
        }
        seen.add(region.id);
        matches.push({ mapId: level.id, region, floorIndex: index });
      }
    }
  }

  if (preferredMapId) {
    const preferred = matches.find((match) => match.mapId === preferredMapId);
    if (preferred) return preferred;
  }

  return matches.find((match) => match.mapId !== ROOT_MAP_ID) ?? matches[0];
}

/** Campus region that drills into a child map and then a specific room */
export function findCampusShortcutForFocus(
  childMapId: string,
  focusRegionId: string,
): MapRegion | undefined {
  return MAP_LEVELS.campus?.regions.find(
    (region) =>
      region.childMapId === childMapId &&
      region.focusRegionId === focusRegionId,
  );
}

export function findCampusRegionForChildMap(
  childMapId: string,
): MapRegion | undefined {
  const matches = MAP_LEVELS.campus?.regions.filter(
    (r) => r.childMapId === childMapId,
  );
  if (!matches?.length) return undefined;
  return matches.find((r) => !r.hideLabel) ?? matches[0];
}
