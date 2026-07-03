"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PublicSpace } from "@/lib/domain/types";

interface SpaceFilterProps {
  spaces: PublicSpace[];
  selectedSlug?: string;
}

export function SpaceFilter({ spaces, selectedSlug }: SpaceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const value = event.target.value;
    if (value) {
      params.set("space", value);
    } else {
      params.delete("space");
    }
    router.push(`/availability?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="space-filter" className="text-sm font-medium text-text-primary">
        Space
      </label>
      <select
        id="space-filter"
        value={selectedSlug ?? ""}
        onChange={handleChange}
        className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
      >
        <option value="">All spaces</option>
        {spaces.map((space) => (
          <option key={space.id} value={space.slug}>
            {space.name}
          </option>
        ))}
      </select>
    </div>
  );
}
