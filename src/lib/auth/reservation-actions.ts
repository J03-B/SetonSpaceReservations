"use server";

import { revalidatePath } from "next/cache";
import { TEMP_VIEW_BLOCKED } from "@/lib/auth/impersonation";
import { getAuthUser, getSessionUser } from "@/lib/auth/session";
import { toEasternWallClock } from "@/lib/availability/format-when";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type RequestDecisionState = {
  error?: string;
};

export type SubmitReservationResult =
  | { ok: true; startAt: string; endAt: string }
  | { ok: false; error: string };

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA < endB && endA > startB;
}

export async function submitReservationRequestAction(input: {
  roomId: string;
  startAt: string;
  endAt: string;
  description: string;
}): Promise<SubmitReservationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Requests are not available right now." };
  }

  const session = await getSessionUser();
  if (!session) {
    return { ok: false, error: "Sign in to request this space." };
  }
  if (session.isImpersonating) {
    return { ok: false, error: TEMP_VIEW_BLOCKED };
  }
  if (!session.isRequester) {
    return { ok: false, error: "Your account cannot submit requests yet." };
  }
  if (!session.emailVerified) {
    return { ok: false, error: "Verify your email before requesting a space." };
  }

  const description = input.description.trim();
  if (description.length === 0) {
    return { ok: false, error: "Enter a reason for this request." };
  }
  if (description.length > 2000) {
    return { ok: false, error: "Shorten the reason to 2,000 characters or fewer." };
  }

  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, error: "Choose a valid time range." };
  }
  if (end.getTime() < Date.now()) {
    return { ok: false, error: "Choose a time that has not already ended." };
  }
  if (end.getTime() - start.getTime() > 90 * 24 * 60 * 60 * 1000) {
    return { ok: false, error: "Choose a shorter time range." };
  }

  const startAt = toEasternWallClock(start);
  const endAt = toEasternWallClock(end);
  const supabase = await createClient();
  const actor = await getAuthUser();
  if (!actor || actor.id !== session.id) {
    return { ok: false, error: "Sign in to request this space." };
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, is_active")
    .eq("id", input.roomId)
    .maybeSingle();

  if (!room?.is_active) {
    return { ok: false, error: "This space is not open for requests." };
  }

  const { data: existing } = await supabase
    .from("reservation_requests")
    .select("id")
    .eq("room_id", room.id)
    .eq("requester_id", session.id)
    .eq("start_at", startAt)
    .eq("end_at", endAt)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    revalidatePath("/");
    revalidatePath("/manage");
    return { ok: true, startAt, endAt };
  }

  const { error } = await supabase.from("reservation_requests").insert({
    room_id: room.id,
    requester_id: session.id,
    title: room.name,
    description,
    start_at: startAt,
    end_at: endAt,
    status: "pending",
  });

  if (error) {
    console.error("reservation request insert failed:", error.message);
    return { ok: false, error: "The request could not be sent. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/manage");
  return { ok: true, startAt, endAt };
}

export async function decideReservationRequestAction(
  _prev: RequestDecisionState,
  formData: FormData,
): Promise<RequestDecisionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured." };
  }

  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { error: TEMP_VIEW_BLOCKED };
  }
  if (!session?.isManager) {
    return { error: "Only managers can review requests." };
  }

  const requestId = formData.get("request_id");
  const decision = formData.get("decision");
  if (typeof requestId !== "string" || requestId.length === 0) {
    return { error: "Choose a request." };
  }
  if (decision !== "approved" && decision !== "declined") {
    return { error: "Choose approve or decline." };
  }

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("reservation_requests")
    .select(
      "id, room_id, requester_id, title, description, start_at, end_at, status",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return { error: "That request is no longer pending." };
  }

  if (!session.isTechAdmin) {
    const { data: room } = await supabase
      .from("rooms")
      .select("manager_id")
      .eq("id", request.room_id)
      .maybeSingle();
    if (room?.manager_id !== session.id) {
      return { error: "That request is not for a building you manage." };
    }
  }

  if (decision === "declined") {
    const { error } = await supabase
      .from("reservation_requests")
      .update({ status: "declined" })
      .eq("id", request.id);
    if (error) {
      return { error: "The request could not be declined. Try again." };
    }
    revalidatePath("/");
    revalidatePath("/manage");
    return {};
  }

  const { data: existing } = await supabase
    .from("reservations_confirmed")
    .select("start_at, end_at")
    .eq("room_id", request.room_id)
    .eq("status", "active");

  const conflict = (existing ?? []).some((row) =>
    rangesOverlap(request.start_at, request.end_at, row.start_at, row.end_at),
  );
  if (conflict) {
    return { error: "That time conflicts with a current reservation." };
  }

  const actor = await getAuthUser();
  const { error: insertError } = await supabase
    .from("reservations_confirmed")
    .insert({
      request_id: request.id,
      room_id: request.room_id,
      requester_id: request.requester_id,
      title: request.title,
      description: request.description,
      start_at: request.start_at,
      end_at: request.end_at,
      approved_by: actor?.id ?? session.id,
      status: "active",
    });

  if (insertError) {
    return { error: "That time conflicts with a current reservation." };
  }

  const { error: updateError } = await supabase
    .from("reservation_requests")
    .update({ status: "approved" })
    .eq("id", request.id);

  if (updateError) {
    return { error: "The request was reserved but could not be marked approved." };
  }

  revalidatePath("/");
  revalidatePath("/manage");
  return {};
}

export async function undoReservationApprovalAction(
  _prev: RequestDecisionState,
  formData: FormData,
): Promise<RequestDecisionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured." };
  }

  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { error: TEMP_VIEW_BLOCKED };
  }
  if (!session?.isManager) {
    return { error: "Only managers can undo an approval." };
  }

  const reservationId = formData.get("reservation_id");
  if (typeof reservationId !== "string" || reservationId.length === 0) {
    return { error: "Choose a reservation." };
  }

  const supabase = await createClient();
  const { data: reservation } = await supabase
    .from("reservations_confirmed")
    .select("id, room_id, request_id, status")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation || reservation.status !== "active") {
    return { error: "That reservation is no longer current." };
  }
  if (!reservation.request_id) {
    return { error: "That reservation is not linked to a request." };
  }

  if (!session.isTechAdmin) {
    const { data: room } = await supabase
      .from("rooms")
      .select("manager_id")
      .eq("id", reservation.room_id)
      .maybeSingle();
    if (room?.manager_id !== session.id) {
      return { error: "That reservation is not for a building you manage." };
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("reservations_confirmed")
    .delete()
    .eq("id", reservation.id)
    .eq("status", "active")
    .select("id");

  if (deleteError || !deleted?.length) {
    return { error: "The reservation could not be returned to requests. Try again." };
  }

  const { data: restored, error: updateError } = await supabase
    .from("reservation_requests")
    .update({ status: "pending" })
    .eq("id", reservation.request_id)
    .eq("status", "approved")
    .select("id");

  if (updateError || !restored?.length) {
    return {
      error: "The reservation was released but the request could not be returned to the queue.",
    };
  }

  revalidatePath("/");
  revalidatePath("/manage");
  return {};
}
