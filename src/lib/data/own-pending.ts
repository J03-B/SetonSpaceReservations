import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type OwnOccupancyRange = {
  spaceId: string;
  startAt: string;
  endAt: string;
  kind: "pending" | "reserved";
};

export async function getOwnOccupancyRanges(
  userId: string,
): Promise<OwnOccupancyRange[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [pendingResult, reservedResult] = await Promise.all([
    supabase
      .from("reservation_requests")
      .select("room_id, start_at, end_at")
      .eq("requester_id", userId)
      .eq("status", "pending"),
    supabase
      .from("reservations_confirmed")
      .select("room_id, start_at, end_at")
      .eq("requester_id", userId)
      .eq("status", "active"),
  ]);

  if (pendingResult.error) {
    console.error("own pending ranges failed:", pendingResult.error.message);
  }
  if (reservedResult.error) {
    console.error("own reserved ranges failed:", reservedResult.error.message);
  }

  return [
    ...(pendingResult.data ?? []).map((row) => ({
      spaceId: row.room_id,
      startAt: row.start_at,
      endAt: row.end_at,
      kind: "pending" as const,
    })),
    ...(reservedResult.data ?? []).map((row) => ({
      spaceId: row.room_id,
      startAt: row.start_at,
      endAt: row.end_at,
      kind: "reserved" as const,
    })),
  ];
}
