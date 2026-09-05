import type { AccessLabel } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const ACCESS_BADGE_STYLES: Record<AccessLabel, string> = {
  Guest: "bg-role-guest-bg text-role-guest",
  User: "bg-role-user-bg text-role-user",
  "Trusted User": "bg-role-trusted-bg text-role-trusted",
  Manager: "bg-role-manager-bg text-role-manager",
  Admin: "bg-role-admin-bg text-role-admin",
  Developer: "bg-role-developer-bg text-role-developer",
};

export function AccessBadge({
  label,
  className,
}: {
  label: AccessLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium leading-none",
        ACCESS_BADGE_STYLES[label],
        className,
      )}
    >
      {label}
    </span>
  );
}
