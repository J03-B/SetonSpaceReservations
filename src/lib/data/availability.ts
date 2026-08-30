import { addDays, startOfDay, endOfDay } from "date-fns";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublicAvailabilitySlot } from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";
import { DEFAULT_TIMEZONE } from "@/lib/domain/statuses";
import { campusToAvailabilitySlots } from "@/lib/data/campus-data";
import { getPublicSpaces } from "./spaces";

/** Wide enough that every stored occupancy row is included. */
const ALL_OCCUPANCY_START = new Date("1970-01-01T00:00:00.000Z");
const ALL_OCCUPANCY_END = new Date("2100-01-01T00:00:00.000Z");

interface AvailabilityQuery {
  spaceId?: string;
  start?: Date;
  end?: Date;
}

export async function getPublicAvailability(
  query: AvailabilityQuery = {},
): Promise<PublicAvailabilitySlot[]> {
  const spaces = (await getPublicSpaces()).filter((space) => space.isActive);
  const filteredSpaces = query.spaceId
    ? spaces.filter((s) => s.id === query.spaceId)
    : spaces;
  const start = query.start ?? ALL_OCCUPANCY_START;
  const end = query.end ?? ALL_OCCUPANCY_END;

  if (!isSupabaseConfigured()) {
    return campusToAvailabilitySlots({
      start,
      end,
      spaceId: query.spaceId,
    });
  }

  const supabase = await createClient();
  const spaceIds = filteredSpaces.map((s) => s.id);

  if (spaceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_public_availability", {
    p_room_ids: spaceIds,
    p_start_at: start.toISOString(),
    p_end_at: end.toISOString(),
  });

  if (error || !data) {
    console.error("get_public_availability failed:", error?.message);
    return campusToAvailabilitySlots({
      start,
      end,
      spaceId: query.spaceId,
    });
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    spaceId: row.space_id as string,
    spaceSlug: row.space_slug as string,
    spaceName: row.space_name as string,
    startAt: wallClockString(row.start_at),
    endAt: wallClockString(row.end_at),
    publicStatus: row.public_status as PublicStatus,
    activityCategory: normalizeActivityCategory(row.activity_category),
    requestUpdatedAt: (row.request_updated_at as string | null) ?? null,
    timezone: DEFAULT_TIMEZONE,
  }));
}

function wallClockString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function normalizeActivityCategory(
  value: unknown,
): PublicAvailabilitySlot["activityCategory"] {
  return value === "Academic" || value === "Club" || value === "Other"
    ? value
    : undefined;
}

export function defaultAvailabilityRange(date: Date = new Date()) {
  return {
    start: startOfDay(date),
    end: endOfDay(addDays(date, 6)),
  };
}
