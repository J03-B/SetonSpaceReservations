import type { MapPoint, MapRegion } from "./map-config";

const CLOSE_THRESHOLD_PX = 14;

export function regionHasPolygon(
  region: MapRegion,
): region is MapRegion & { points: MapPoint[] } {
  return Boolean(region.points && region.points.length >= 3);
}

export function boundingBoxFromPoints(
  points: MapPoint[],
): Pick<MapRegion, "x" | "y" | "width" | "height"> {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function polygonCentroid(points: MapPoint[]): MapPoint {
  const total = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

/** Label anchor — bbox center reads better than centroid on irregular footprints. */
export function regionLabelAnchor(region: MapRegion): MapPoint {
  return {
    x: region.x + region.width / 2,
    y: region.y + region.height / 2,
  };
}

export function polygonPointsAttr(points: MapPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function polygonSignedArea(points: MapPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return sum / 2;
}

/**
 * Push every wall outward by the same distance (viewBox units, 0–100).
 * Edge-offset + line intersection — handles irregular footprints better than center scale.
 */
export function offsetPolygonPoints(
  points: MapPoint[],
  distance: number,
): MapPoint[] {
  const n = points.length;
  if (n < 3 || distance === 0) return points;

  const winding = -Math.sign(polygonSignedArea(points)) || -1;
  const lines: Array<{ nx: number; ny: number; c: number }> = [];

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * winding;
    const ny = (dx / len) * winding;
    lines.push({
      nx,
      ny,
      c: nx * p1.x + ny * p1.y + distance,
    });
  }

  const result: MapPoint[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const det = l1.nx * l2.ny - l2.nx * l1.ny;

    if (Math.abs(det) < 1e-10) {
      const curr = points[i];
      const nx = l2.nx;
      const ny = l2.ny;
      result.push({ x: curr.x + nx * distance, y: curr.y + ny * distance });
      continue;
    }

    result.push({
      x: (l1.c * l2.ny - l2.c * l1.ny) / det,
      y: (l2.c * l1.nx - l1.c * l2.nx) / det,
    });
  }

  return result;
}

/** Centroid for polygons, bbox center otherwise — best drill/zoom pivot */
export function regionCameraFocus(region: MapRegion): MapPoint {
  if (region.points && region.points.length >= 3) {
    return polygonCentroid(region.points);
  }
  return regionLabelAnchor(region);
}

/** Footprint size for framing (viewBox units 0–100) */
export function regionCameraFrame(
  region: MapRegion,
): Pick<MapRegion, "width" | "height"> {
  if (region.points && region.points.length >= 3) {
    const box = boundingBoxFromPoints(region.points);
    return { width: box.width, height: box.height };
  }
  return { width: region.width, height: region.height };
}

/** Interpolate between two matching polygons (same vertex count). */
export function lerpPolygonPoints(
  from: MapPoint[],
  to: MapPoint[],
  t: number,
): MapPoint[] {
  const clamped = Math.min(1, Math.max(0, t));
  return from.map((point, index) => ({
    x: point.x + (to[index].x - point.x) * clamped,
    y: point.y + (to[index].y - point.y) * clamped,
  }));
}

/** Nearest building region to a normalized image point (0–1). */
export function nearestRegionToPoint(
  nx: number,
  ny: number,
  regions: MapRegion[],
): MapRegion | null {
  if (regions.length === 0) return null;

  let minDist = Infinity;
  let nearest: MapRegion | null = null;
  for (const region of regions) {
    const d = distToRegion(nx, ny, region);
    if (d < minDist) {
      minDist = d;
      nearest = region;
    }
  }
  return nearest;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function regionHoverGroupId(region: MapRegion): string {
  return region.hoverGroupId ?? region.id;
}

export function regionsInHoverGroup(
  regions: MapRegion[],
  groupId: string,
): MapRegion[] {
  return regions.filter((r) => regionHoverGroupId(r) === groupId);
}

/** Shortest distance to any footprint in a hover group */
export function distToHoverGroup(
  nx: number,
  ny: number,
  groupId: string,
  regions: MapRegion[],
): number {
  const members = regionsInHoverGroup(regions, groupId);
  if (members.length === 0) return Infinity;
  return Math.min(...members.map((r) => distToRegion(nx, ny, r)));
}

/** One proximity target per hover group (linked wings share zoom/focus) */
export function proximityRegionEntries(
  regions: MapRegion[],
): Array<{ groupId: string; labelRegion: MapRegion; members: MapRegion[] }> {
  const byGroup = new Map<string, MapRegion[]>();
  for (const region of regions) {
    const key = regionHoverGroupId(region);
    const list = byGroup.get(key) ?? [];
    list.push(region);
    byGroup.set(key, list);
  }
  return Array.from(byGroup.entries()).map(([groupId, members]) => ({
    groupId,
    members,
    labelRegion: members.find((r) => !r.hideLabel) ?? members[0],
  }));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function zoomFromDistanceParams(
  dist: number,
  zoomMin: number,
  zoomMax: number,
  proximityOuter: number,
  proximityInner: number,
): number {
  if (dist >= proximityOuter) return zoomMin;
  if (dist <= proximityInner) return zoomMax;

  const span = proximityOuter - proximityInner;
  const t = clamp01(1 - (dist - proximityInner) / span);
  return zoomMin + (zoomMax - zoomMin) * easeInOutCubic(t);
}

/** Soft Gaussian weight — nearby buildings contribute more than distant ones. */
function proximityWeight(dist: number, falloff: number): number {
  return Math.exp(-dist / Math.max(falloff, 0.001));
}

export interface BlendedProximityOptions {
  zoomMin: number;
  zoomMax: number;
  proximityOuter: number;
  proximityInner: number;
  /** Normalized distance falloff — wider = smoother handoff between buildings */
  falloff?: number;
}

/**
 * Weighted blend of per-building zoom levels so the camera glides between
 * footprints instead of snapping to whichever building is closest.
 */
export function blendedProximityZoom(
  nx: number,
  ny: number,
  regions: MapRegion[],
  options: BlendedProximityOptions,
): number {
  if (regions.length === 0) return options.zoomMin;

  const falloff = options.falloff ?? 0.05;
  let weightedZoom = 0;
  let totalWeight = 0;

  for (const { groupId, members } of proximityRegionEntries(regions)) {
    const dist =
      members.length > 1
        ? distToHoverGroup(nx, ny, groupId, regions)
        : distToRegion(nx, ny, members[0]);
    const weight = proximityWeight(dist, falloff);
    const z = zoomFromDistanceParams(
      dist,
      options.zoomMin,
      options.zoomMax,
      options.proximityOuter,
      options.proximityInner,
    );
    weightedZoom += z * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedZoom / totalWeight : options.zoomMin;
}

/**
 * Weighted blend of building label anchors — smooth pivot when crossing
 * from one footprint to the next.
 */
export function blendedZoomFocus(
  nx: number,
  ny: number,
  regions: MapRegion[],
  falloff = 0.055,
): MapPoint {
  if (regions.length === 0) return { x: 50, y: 50 };

  let wx = 0;
  let wy = 0;
  let totalWeight = 0;

  for (const { groupId, labelRegion, members } of proximityRegionEntries(
    regions,
  )) {
    const dist =
      members.length > 1
        ? distToHoverGroup(nx, ny, groupId, regions)
        : distToRegion(nx, ny, members[0]);
    const weight = proximityWeight(dist, falloff);
    const anchor = regionLabelAnchor(labelRegion);
    wx += anchor.x * weight;
    wy += anchor.y * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return { x: 50, y: 50 };
  return { x: wx / totalWeight, y: wy / totalWeight };
}

export function isNearPoint(
  a: MapPoint,
  b: MapPoint,
  mapRect: DOMRect,
  thresholdPx = CLOSE_THRESHOLD_PX,
): boolean {
  const dx = ((a.x - b.x) / 100) * mapRect.width;
  const dy = ((a.y - b.y) / 100) * mapRect.height;
  return Math.hypot(dx, dy) <= thresholdPx;
}

/** Distance from normalized image coords (0–1) to region shape. */
export function distToRegion(
  nx: number,
  ny: number,
  region: MapRegion,
): number {
  const px = nx * 100;
  const py = ny * 100;

  if (regionHasPolygon(region)) {
    if (isPointInPolygon(px, py, region.points)) return 0;

    let minEdge = Infinity;
    const pts = region.points;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      minEdge = Math.min(minEdge, distToSegment(px, py, a.x, a.y, b.x, b.y));
    }
    return minEdge / 100;
  }

  const left = region.x / 100;
  const top = region.y / 100;
  const right = (region.x + region.width) / 100;
  const bottom = (region.y + region.height) / 100;
  const dx = Math.max(left - nx, 0, nx - right);
  const dy = Math.max(top - ny, 0, ny - bottom);
  return Math.sqrt(dx * dx + dy * dy);
}

function isPointInPolygon(x: number, y: number, points: MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
