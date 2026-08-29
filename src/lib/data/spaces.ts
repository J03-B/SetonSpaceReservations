import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublicSpace } from "@/lib/domain/types";
import { campusToPublicSpaces } from "@/lib/data/campus-data";
import { DEFAULT_TIMEZONE, type RoomCurrentStatus } from "@/lib/domain/statuses";

function mapSpace(row: Record<string, unknown>): PublicSpace {
  return {
    id: row.id as string,
    name: row.name as string,
    shortName: row.short_name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    building: (row.building as string | null) ?? null,
    capacity: null,
    timezone: DEFAULT_TIMEZONE,
    currentStatus: row.current_status as RoomCurrentStatus,
    isActive: row.is_active as boolean,
  };
}

export async function getPublicSpaces(): Promise<PublicSpace[]> {
  if (!isSupabaseConfigured()) {
    return campusToPublicSpaces();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, name, short_name, slug, description, building, current_status, is_active",
    )
    .order("name");

  if (error) {
    throw new Error(`Failed to load rooms: ${error.message}`);
  }

  return (data ?? []).map(mapSpace);
}

export async function getPublicSpaceBySlug(
  slug: string,
): Promise<PublicSpace | null> {
  const spaces = await getPublicSpaces();
  return spaces.find((space) => space.slug === slug && space.isActive) ?? null;
}
