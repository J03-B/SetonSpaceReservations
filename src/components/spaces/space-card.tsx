import Link from "next/link";
import type { PublicSpace } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface SpaceCardProps {
  space: PublicSpace;
}

/** Space card — style guide §10.2 */
export function SpaceCard({ space }: SpaceCardProps) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text-primary">{space.name}</h2>
      {space.building ? (
        <p className="mt-1 text-sm text-text-secondary">{space.building}</p>
      ) : null}
      {space.description ? (
        <p className="mt-3 text-text-secondary">{space.description}</p>
      ) : null}
      <dl className="mt-4 flex flex-wrap gap-4 text-sm">
        {space.capacity != null ? (
          <div>
            <dt className="text-text-secondary">Capacity</dt>
            <dd className="font-medium text-text-primary">
              {space.capacity} people
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-text-secondary">Time zone</dt>
          <dd className="font-medium text-text-primary">Eastern Time</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/spaces/${space.slug}`}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-medium no-underline",
            "border border-border-strong bg-surface text-text-primary hover:bg-surface-subtle",
          )}
        >
          View space
        </Link>
        <Link
          href={`/availability?space=${space.slug}`}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-medium no-underline",
            "bg-action-primary text-text-inverse hover:bg-action-primary-hover",
          )}
        >
          View availability
        </Link>
      </div>
    </article>
  );
}
