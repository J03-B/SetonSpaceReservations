import { PUBLIC_STATUS_LABELS, type PublicStatus } from "@/lib/domain/statuses";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  PublicStatus,
  { badge: string; dot: string }
> = {
  Available: {
    badge: "bg-status-available-bg text-status-available",
    dot: "bg-status-available",
  },
  Pending: {
    badge: "bg-status-pending-bg text-status-pending",
    dot: "bg-status-pending",
  },
  Reserved: {
    badge: "bg-status-reserved-bg text-status-reserved",
    dot: "bg-status-reserved",
  },
  Blocked: {
    badge: "bg-status-blocked-bg text-status-blocked",
    dot: "bg-status-blocked",
  },
  Closed: {
    badge: "bg-status-closed-bg text-status-closed",
    dot: "bg-status-closed",
  },
};

interface StatusBadgeProps {
  status: PublicStatus;
  className?: string;
}

/** Status badge — style guide §10.3: text label + color, not color alone */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
        styles.badge,
        className,
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", styles.dot)}
        aria-hidden="true"
      />
      {PUBLIC_STATUS_LABELS[status]}
    </span>
  );
}

export function StatusLegend() {
  const statuses: PublicStatus[] = [
    "Available",
    "Pending",
    "Reserved",
    "Blocked",
    "Closed",
  ];

  return (
    <div
      className="flex flex-wrap gap-3"
      role="list"
      aria-label="Availability status legend"
    >
      {statuses.map((status) => (
        <div key={status} role="listitem">
          <StatusBadge status={status} />
        </div>
      ))}
    </div>
  );
}
