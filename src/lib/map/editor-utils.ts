import type { MapPoint, MapRegion } from "./map-config";
import { regionHasPolygon } from "./region-geometry";

export interface ObjectContainFit {
  fitW: number;
  fitH: number;
  left: number;
  top: number;
}

/** Fitted size and offset for object-contain inside a container. */
export function computeObjectContainFit(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): ObjectContainFit {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) {
    return { fitW: 0, fitH: 0, left: 0, top: 0 };
  }

  const imageAspect = imageW / imageH;
  const containerAspect = containerW / containerH;

  let fitW: number;
  let fitH: number;
  if (imageAspect > containerAspect) {
    fitW = containerW;
    fitH = containerW / imageAspect;
  } else {
    fitH = containerH;
    fitW = containerH * imageAspect;
  }

  return {
    fitW,
    fitH,
    left: (containerW - fitW) / 2,
    top: (containerH - fitH) / 2,
  };
}

/** Map a click to image % coords when the image uses object-contain. */
export function clientToPercentObjectContain(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  fit: ObjectContainFit,
): { x: number; y: number } | null {
  if (fit.fitW <= 0 || fit.fitH <= 0) return null;

  const localX = clientX - containerRect.left - fit.left;
  const localY = clientY - containerRect.top - fit.top;

  if (localX < 0 || localY < 0 || localX > fit.fitW || localY > fit.fitH) {
    return null;
  }

  return {
    x: Math.max(0, Math.min(100, (localX / fit.fitW) * 100)),
    y: Math.max(0, Math.min(100, (localY / fit.fitH) * 100)),
  };
}

function formatRegionBlock(r: MapRegion, indent: string): string {
  const extras: string[] = [];
  if (r.childMapId) extras.push(`childMapId: "${r.childMapId}"`);
  if (r.focusRegionId) extras.push(`focusRegionId: "${r.focusRegionId}"`);
  if (r.spaceSlug) extras.push(`spaceSlug: "${r.spaceSlug}"`);
  if (r.hoverGroupId) extras.push(`hoverGroupId: "${r.hoverGroupId}"`);
  if (r.hideLabel) extras.push(`hideLabel: true`);
  if (r.mapLabelLines?.length) {
    extras.push(
      `mapLabelLines: [${r.mapLabelLines.map((line) => `"${line.replace(/"/g, '\\"')}"`).join(", ")}]`,
    );
  }
  const extra = extras.length ? `,\n${indent}  ${extras.join(`,\n${indent}  `)}` : "";

  const pointsBlock = regionHasPolygon(r)
    ? `,\n${indent}  points: [\n${r.points
        .map(
          (p) =>
            `${indent}    { x: ${p.x.toFixed(3)}, y: ${p.y.toFixed(3)} }`,
        )
        .join(",\n")}\n${indent}  ]`
    : "";

  return `${indent}{
${indent}  id: "${r.id}",
${indent}  label: "${r.label.replace(/"/g, '\\"')}",
${indent}  x: ${r.x.toFixed(2)},
${indent}  y: ${r.y.toFixed(2)},
${indent}  width: ${r.width.toFixed(2)},
${indent}  height: ${r.height.toFixed(2)}${pointsBlock}${extra},
${indent}}`;
}

/** Convert click position on image to percentage coordinates. */
export function clientToPercent(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

export function snapPercentToImagePixel(
  percent: MapPoint,
  naturalWidth: number,
  naturalHeight: number,
): { point: MapPoint; pixelX: number; pixelY: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { point: percent, pixelX: 0, pixelY: 0 };
  }

  const pixelX = Math.max(
    0,
    Math.min(naturalWidth - 1, Math.floor((percent.x / 100) * naturalWidth)),
  );
  const pixelY = Math.max(
    0,
    Math.min(naturalHeight - 1, Math.floor((percent.y / 100) * naturalHeight)),
  );

  return {
    pixelX,
    pixelY,
    point: {
      x: ((pixelX + 0.5) / naturalWidth) * 100,
      y: ((pixelY + 0.5) / naturalHeight) * 100,
    },
  };
}

export function clientToSnappedImagePercent(
  clientX: number,
  clientY: number,
  mapRect: DOMRect,
  naturalWidth: number,
  naturalHeight: number,
): { point: MapPoint; pixelX: number; pixelY: number } {
  return snapPercentToImagePixel(
    clientToPercent(clientX, clientY, mapRect),
    naturalWidth,
    naturalHeight,
  );
}

/** Build rect from two corner clicks. */
export function rectFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): Pick<MapRegion, "x" | "y" | "width" | "height"> {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  return { x, y, width, height };
}

export function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Export regions as JSON for the configure tool. */
export function exportRegionsJson(mapId: string, regions: MapRegion[]): string {
  return JSON.stringify({ mapId, regions }, null, 2);
}

/** Export stacked floors as JSON — paste back or send for map-config updates. */
export function exportFloorsJson(
  mapId: string,
  floors: { number: number; imageSrc: string; regions: MapRegion[] }[],
): string {
  return JSON.stringify({ mapId, floors }, null, 2);
}

/** Export as TypeScript snippet to paste into map-config.ts */
export function exportRegionsTypeScript(
  mapId: string,
  title: string,
  imageSrc: string,
  regions: MapRegion[],
): string {
  const regionLines = regions
    .map((r) => formatRegionBlock(r, "      "))
    .join(",\n");

  return `"${mapId}": {
    id: "${mapId}",
    title: "${title}",
    imageSrc: "${imageSrc}",
    regions: [
${regionLines}
    ],
  },`;
}

/** Export only the campus regions array — paste into MAP_LEVELS.campus.regions */
export function exportRegionsArrayTypeScript(regions: MapRegion[]): string {
  const regionLines = regions
    .map((r) => formatRegionBlock(r, "      "))
    .join(",\n");

  return `regions: [
${regionLines}
    ],`;
}

/** Export stacked floors + floor-1 regions for map-config.ts */
export function exportStackedFloorsTypeScript(
  floors: { number: number; imageSrc: string; regions: MapRegion[] }[],
): string {
  const floorBlocks = floors.map((floor) => {
    const regionLines = floor.regions
      .map((region) => formatRegionBlock(region, "          "))
      .join(",\n");
    const regionsBody =
      floor.regions.length > 0
        ? `[\n${regionLines}\n        ]`
        : "[]";
    return `    {
      number: ${floor.number},
      imageSrc: "${floor.imageSrc}",
      regions: ${regionsBody},
    }`;
  });

  const floorOneRegions = floors[0]?.regions ?? [];

  return `${exportRegionsArrayTypeScript(floorOneRegions)}

floors: [
${floorBlocks.join(",\n")}
],`;
}
