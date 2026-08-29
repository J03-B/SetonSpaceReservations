/** Map overlay colors — traffic-light scheme for availability on the map. */

const FLOOR_FILL_ALPHA = 0.22;

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  return null;
}

/** Same RGB as the stroke, with a lighter alpha so floor artwork stays visible. */
export function fillMatchingStroke(stroke: string, alpha = FLOOR_FILL_ALPHA): string {
  const rgb = parseRgb(stroke);
  if (!rgb) return stroke;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export const MAP_STATUS_COLORS = {
  Available: { fill: "rgba(34, 197, 94, 0.55)", stroke: "#16a34a", label: "Open" },
  Pending: { fill: "rgba(234, 179, 8, 0.55)", stroke: "#ca8a04", label: "Pending" },
  Reserved: { fill: "rgba(239, 68, 68, 0.55)", stroke: "#dc2626", label: "Reserved" },
  Blocked: { fill: "rgba(107, 114, 128, 0.55)", stroke: "#4b5563", label: "Blocked" },
  Closed: { fill: "rgba(156, 163, 175, 0.45)", stroke: "#9ca3af", label: "Closed" },
} as const;

/** Lighter fills so floor-plan artwork stays visible underneath. */
export const FLOOR_STATUS_COLORS = {
  Available: {
    fill: fillMatchingStroke("#22c55e"),
    stroke: "#22c55e",
    label: "Open",
  },
  Pending: {
    fill: fillMatchingStroke("#eab308"),
    stroke: "#eab308",
    label: "Pending",
  },
  Reserved: {
    fill: fillMatchingStroke("#ef4444"),
    stroke: "#ef4444",
    label: "Reserved",
  },
  Blocked: {
    fill: fillMatchingStroke("#6b7280"),
    stroke: "#6b7280",
    label: "Blocked",
  },
  Closed: {
    fill: fillMatchingStroke("#9ca3af"),
    stroke: "#9ca3af",
    label: "Closed",
  },
} as const;

export type MapDisplayStatus = keyof typeof MAP_STATUS_COLORS;
