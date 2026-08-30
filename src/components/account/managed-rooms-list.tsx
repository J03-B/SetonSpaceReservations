import type { BuildingRoomGroup } from "@/lib/auth/managed-rooms";
import { cn } from "@/lib/utils";

export function ManagedRoomsList({
  groups,
  className,
}: {
  groups: BuildingRoomGroup[];
  className?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {groups.map((group) => (
        <li key={group.building}>
          {group.allAccess ? (
            <p className="text-sm text-text-secondary">
              {group.building} — all access
            </p>
          ) : (
            <div>
              <p className="text-sm font-medium text-text-primary">
                {group.building}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                {group.roomNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
