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
  const { data, error } = await supabase
    .from("reservations")
    .select("room_id, start_at, end_at, status")
    .eq("requester_id", userId)
    .in("status", ["pending", "accepted"]);

  if (error) {
    console.error("own occupancy ranges failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    spaceId: row.room_id,
    startAt: row.start_at,
    endAt: row.end_at,
    kind: row.status === "accepted" ? ("reserved" as const) : ("pending" as const),
  }));
}
