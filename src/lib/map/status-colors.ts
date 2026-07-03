/** Map overlay colors — traffic-light scheme for availability on the map. */
export const MAP_STATUS_COLORS = {
  Available: { fill: "rgba(34, 197, 94, 0.55)", stroke: "#16a34a", label: "Open" },
  Pending: { fill: "rgba(234, 179, 8, 0.55)", stroke: "#ca8a04", label: "Pending" },
  Reserved: { fill: "rgba(239, 68, 68, 0.55)", stroke: "#dc2626", label: "Taken" },
  Blocked: { fill: "rgba(107, 114, 128, 0.55)", stroke: "#4b5563", label: "Blocked" },
  Closed: { fill: "rgba(156, 163, 175, 0.45)", stroke: "#9ca3af", label: "Closed" },
} as const;

/** Lighter fills so floor-plan artwork stays visible underneath. */
export const FLOOR_STATUS_COLORS = {
  Available: { fill: "rgba(34, 197, 94, 0.2)", stroke: "#22c55e", label: "Open" },
  Pending: { fill: "rgba(234, 179, 8, 0.22)", stroke: "#eab308", label: "Pending" },
  Reserved: { fill: "rgba(239, 68, 68, 0.22)", stroke: "#ef4444", label: "Taken" },
  Blocked: { fill: "rgba(107, 114, 128, 0.2)", stroke: "#6b7280", label: "Blocked" },
  Closed: { fill: "rgba(156, 163, 175, 0.18)", stroke: "#9ca3af", label: "Closed" },
} as const;

export type MapDisplayStatus = keyof typeof MAP_STATUS_COLORS;
