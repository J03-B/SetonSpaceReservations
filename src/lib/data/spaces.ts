import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublicSpace } from "@/lib/domain/types";
import { campusToPublicSpaces } from "@/lib/data/campus-data";

function mapSpace(row: Record<string, unknown>): PublicSpace {
  return {
    id: row.id as string,
    name: row.name as string,
    shortName: row.short_name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    building: (row.building as string | null) ?? null,
    capacity: (row.capacity as number | null) ?? null,
    timezone: row.timezone as string,
    publicRules: (row.public_rules as string | null) ?? null,
    status: row.status as "active" | "archived",
    isPublic: row.is_public as boolean,
  };
}

export async function getPublicSpaces(): Promise<PublicSpace[]> {
  if (!isSupabaseConfigured()) {
    return campusToPublicSpaces();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select(
      "id, name, short_name, slug, description, building, capacity, timezone, public_rules, status, is_public",
    )
    .eq("status", "active")
    .eq("is_public", true)
    .order("name");

  if (error || !data?.length) {
    return campusToPublicSpaces();
  }

  return data.map(mapSpace);
}

export async function getPublicSpaceBySlug(
  slug: string,
): Promise<PublicSpace | null> {
  if (!isSupabaseConfigured()) {
    return campusToPublicSpaces().find((s) => s.slug === slug) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select(
      "id, name, short_name, slug, description, building, capacity, timezone, public_rules, status, is_public",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    return campusToPublicSpaces().find((s) => s.slug === slug) ?? null;
  }

  return mapSpace(data);
}
