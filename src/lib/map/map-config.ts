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
            x: 5.55,
            y: 42.66,
            width: 18.44,
            height: 45.14,
            points: [
              { x: 5.662, y: 42.85 },
              { x: 23.933, y: 42.664 },
              { x: 23.988, y: 87.71 },
              { x: 5.553, y: 87.804 },
            ],
            spaceSlug: "gym",
          },
          {
            id: "benedict",
            label: "Benedict",
            x: 9.16,
            y: 35.84,
            width: 6.18,
            height: 6.36,
            points: [
              { x: 9.218, y: 35.935 },
              { x: 15.345, y: 35.841 },
              { x: 15.345, y: 42.196 },
              { x: 9.163, y: 42.196 },
            ],
            spaceSlug: "benedict",
          },
          {
            id: "laboure",
            label: "Laboure",
            x: 24.26,
            y: 38.83,
            width: 13.84,
            height: 13.83,
            points: [
              { x: 24.261, y: 38.832 },
              { x: 38.102, y: 38.832 },
              { x: 38.102, y: 52.664 },
              { x: 24.261, y: 52.664 },
            ],
            spaceSlug: "laboure",
          },
          {
            id: "chapel",
            label: "Chapel",
            x: 40.84,
            y: 2.1,
            width: 20.84,
            height: 19.91,
            points: [
              { x: 40.837, y: 2.103 },
              { x: 61.679, y: 2.103 },
              { x: 61.57, y: 22.009 },
              { x: 40.837, y: 22.009 },
            ],
            spaceSlug: "chapel",
          },
          {
            id: "aquinas",
            label: "Aquinas",
            x: 43.85,
            y: 27.62,
            width: 9.35,
            height: 25.05,
            points: [
              { x: 43.846, y: 27.617 },
              { x: 53.2, y: 27.617 },
              { x: 53.2, y: 52.664 },
              { x: 43.846, y: 52.664 },
            ],
            spaceSlug: "aquinas",
          },
          {
            id: "clare",
            label: "Clare",
            x: 53.53,
            y: 27.62,
            width: 9.41,
            height: 13.36,
            points: [
              { x: 53.528, y: 27.617 },
              { x: 62.938, y: 27.617 },
              { x: 62.938, y: 40.981 },
              { x: 53.528, y: 40.981 },
            ],
            spaceSlug: "clare",
          },
          {
            id: "siena",
            label: "Siena",
            x: 70.76,
            y: 61.26,
            width: 7.6,
            height: 18.88,
            points: [
              { x: 70.76, y: 61.262 },
              { x: 78.364, y: 61.262 },
              { x: 78.364, y: 80.14 },
              { x: 70.76, y: 80.14 },
            ],
            spaceSlug: "siena",
          },
          {
            id: "claude",
            label: "Claude",
            x: 78.64,
            y: 61.17,
            width: 9.08,
            height: 18.97,
            points: [
              { x: 78.638, y: 61.168 },
              { x: 87.719, y: 61.168 },
              { x: 87.719, y: 80.14 },
              { x: 78.638, y: 80.14 },
            ],
            spaceSlug: "claude",
          },
          {
            id: "bosco",
            label: "Bosco (Art)",
            x: 65.89,
            y: 41.36,
            width: 10.83,
            height: 13.83,
            points: [
              { x: 65.892, y: 41.355 },
              { x: 76.723, y: 41.355 },
              { x: 76.723, y: 55.187 },
              { x: 65.892, y: 55.187 },
            ],
            spaceSlug: "bosco",
          },
          {
            id: "anthony",
            label: "Anthony",
            x: 76.94,
            y: 41.26,
            width: 10.94,
            height: 13.93,
            points: [
              { x: 76.942, y: 41.262 },
              { x: 87.883, y: 41.262 },
              { x: 87.883, y: 55.187 },
              { x: 76.942, y: 55.187 },
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
            x: 5.66,
            y: 35.65,
            width: 5.8,
            height: 8.13,
            points: [
              { x: 5.717, y: 35.654 },
              { x: 11.461, y: 35.748 },
              { x: 11.461, y: 43.411 },
              { x: 5.662, y: 43.785 },
            ],
            spaceSlug: "vianney",
          },
          {
            id: "imelda",
            label: "Imelda",
            x: 11.62,
            y: 35.65,
            width: 5.8,
            height: 7.76,
            points: [
              { x: 11.679, y: 35.654 },
              { x: 17.369, y: 35.748 },
              { x: 17.423, y: 43.318 },
              { x: 11.625, y: 43.411 },
            ],
            spaceSlug: "imelda",
          },
          {
            id: "joan",
            label: "Joan",
            x: 17.59,
            y: 35.75,
            width: 4.7,
            height: 7.29,
            points: [
              { x: 17.588, y: 35.748 },
              { x: 22.292, y: 35.748 },
              { x: 22.292, y: 43.037 },
              { x: 17.642, y: 43.037 },
            ],
            spaceSlug: "joan",
          },
          {
            id: "jerome-library",
            label: "Jerome (Library)",
            x: 75.25,
            y: 51.36,
            width: 9.03,
            height: 13.27,
            points: [
              { x: 75.246, y: 51.355 },
              { x: 84.272, y: 51.355 },
              { x: 84.272, y: 64.626 },
              { x: 75.246, y: 64.626 },
            ],
            spaceSlug: "jerome",
          },
          {
            id: "stein",
            label: "Stein (Computer Lab)",
            x: 75.25,
            y: 64.91,
            width: 9.03,
            height: 12.71,
            points: [
              { x: 75.246, y: 65.0 },
              { x: 84.218, y: 64.907 },
              { x: 84.272, y: 77.617 },
              { x: 75.246, y: 77.617 },
            ],
            spaceSlug: "stein",
          },
          {
            id: "teresa",
            label: "Teresa",
            x: 84.55,
            y: 51.36,
            width: 9.03,
            height: 13.27,
            points: [
              { x: 84.546, y: 51.355 },
              { x: 93.572, y: 51.355 },
              { x: 93.572, y: 64.626 },
              { x: 84.546, y: 64.626 },
            ],
            spaceSlug: "teresa",
          },
          {
            id: "goretti",
            label: "Goretti",
            x: 84.55,
            y: 64.91,
            width: 8.97,
            height: 12.71,
            points: [
              { x: 84.546, y: 64.907 },
              { x: 93.518, y: 65.0 },
              { x: 93.518, y: 77.617 },
              { x: 84.546, y: 77.617 },
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
        x: 5.55,
        y: 42.66,
        width: 18.44,
        height: 45.14,
        points: [
          { x: 5.662, y: 42.85 },
          { x: 23.933, y: 42.664 },
          { x: 23.988, y: 87.71 },
          { x: 5.553, y: 87.804 },
        ],
        spaceSlug: "gym",
      },
      {
        id: "benedict",
        label: "Benedict",
        x: 9.16,
        y: 35.84,
        width: 6.18,
        height: 6.36,
        points: [
          { x: 9.218, y: 35.935 },
          { x: 15.345, y: 35.841 },
          { x: 15.345, y: 42.196 },
          { x: 9.163, y: 42.196 },
        ],
        spaceSlug: "benedict",
      },
      {
        id: "laboure",
        label: "Laboure",
        x: 24.26,
        y: 38.83,
        width: 13.84,
        height: 13.83,
        points: [
          { x: 24.261, y: 38.832 },
          { x: 38.102, y: 38.832 },
          { x: 38.102, y: 52.664 },
          { x: 24.261, y: 52.664 },
        ],
        spaceSlug: "laboure",
      },
      {
        id: "chapel",
        label: "Chapel",
        x: 40.84,
        y: 2.1,
        width: 20.84,
        height: 19.91,
        points: [
          { x: 40.837, y: 2.103 },
          { x: 61.679, y: 2.103 },
          { x: 61.57, y: 22.009 },
          { x: 40.837, y: 22.009 },
        ],
        spaceSlug: "chapel",
      },
      {
        id: "aquinas",
        label: "Aquinas",
        x: 43.85,
        y: 27.62,
        width: 9.35,
        height: 25.05,
        points: [
          { x: 43.846, y: 27.617 },
          { x: 53.2, y: 27.617 },
          { x: 53.2, y: 52.664 },
          { x: 43.846, y: 52.664 },
        ],
        spaceSlug: "aquinas",
      },
      {
        id: "clare",
        label: "Clare",
        x: 53.53,
        y: 27.62,
        width: 9.41,
        height: 13.36,
        points: [
          { x: 53.528, y: 27.617 },
          { x: 62.938, y: 27.617 },
          { x: 62.938, y: 40.981 },
          { x: 53.528, y: 40.981 },
        ],
        spaceSlug: "clare",
      },
      {
        id: "siena",
        label: "Siena",
        x: 70.76,
        y: 61.26,
        width: 7.6,
        height: 18.88,
        points: [
          { x: 70.76, y: 61.262 },
          { x: 78.364, y: 61.262 },
          { x: 78.364, y: 80.14 },
          { x: 70.76, y: 80.14 },
        ],
        spaceSlug: "siena",
      },
      {
        id: "claude",
        label: "Claude",
        x: 78.64,
        y: 61.17,
        width: 9.08,
        height: 18.97,
        points: [
          { x: 78.638, y: 61.168 },
          { x: 87.719, y: 61.168 },
          { x: 87.719, y: 80.14 },
          { x: 78.638, y: 80.14 },
        ],
        spaceSlug: "claude",
      },
      {
        id: "bosco",
        label: "Bosco (Art)",
        x: 65.89,
        y: 41.36,
        width: 10.83,
        height: 13.83,
        points: [
          { x: 65.892, y: 41.355 },
          { x: 76.723, y: 41.355 },
          { x: 76.723, y: 55.187 },
          { x: 65.892, y: 55.187 },
        ],
        spaceSlug: "bosco",
      },
      {
        id: "anthony",
        label: "Anthony",
        x: 76.94,
        y: 41.26,
        width: 10.94,
        height: 13.93,
        points: [
          { x: 76.942, y: 41.262 },
          { x: 87.883, y: 41.262 },
          { x: 87.883, y: 55.187 },
          { x: 76.942, y: 55.187 },
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
