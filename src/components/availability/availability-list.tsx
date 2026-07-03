import { formatInTimeZone } from "date-fns-tz";
import type { PublicAvailabilitySlot } from "@/lib/domain/types";
import { StatusBadge } from "@/components/ui/status-badge";

interface AvailabilityListProps {
  slots: PublicAvailabilitySlot[];
  emptyMessage?: string;
}

function formatTimeRange(slot: PublicAvailabilitySlot): string {
  const tz = slot.timezone;
  const start = formatInTimeZone(new Date(slot.startAt), tz, "h:mm a");
  const end = formatInTimeZone(new Date(slot.endAt), tz, "h:mm a");
  const date = formatInTimeZone(
    new Date(slot.startAt),
    tz,
    "MMMM d, yyyy",
  );
  return `${date} · ${start}–${end}`;
}

/**
 * List view for availability — required for accessibility (style guide §11.1, §17).
 * Public view shows status and time only — no private details.
 */
export function AvailabilityList({
  slots,
  emptyMessage = "No scheduled blocks for this period. Times may still be available.",
}: AvailabilityListProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-text-secondary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const sorted = [...slots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {sorted.map((slot) => (
        <li
          key={`${slot.spaceId}-${slot.startAt}-${slot.publicStatus}`}
          className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-text-primary">{slot.spaceName}</p>
            <p className="text-sm text-text-secondary">
              {formatTimeRange(slot)} · Eastern Time
            </p>
          </div>
          <StatusBadge status={slot.publicStatus} />
        </li>
      ))}
    </ul>
  );
}
