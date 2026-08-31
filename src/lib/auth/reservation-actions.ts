"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CAMPUS_MANAGER_EMAIL } from "@/lib/auth/config";
import { MANAGE_FLASH_COOKIE } from "@/lib/auth/email-decision";
import { TEMP_VIEW_BLOCKED } from "@/lib/auth/impersonation";
import { getAuthUser, getSessionUser } from "@/lib/auth/session";
import { toEasternWallClock, parseStoredTimestamp } from "@/lib/availability/format-when";
import {
  intervalsTouchOrOverlap,
  subtractIntervals,
  toMsInterval,
  unionIntervals,
  wallClockFromMs,
  type MsInterval,
} from "@/lib/availability/intervals";
import {
  formatNoticeConflicts,
  sendNewReservationRequestEmail,
  sendRequesterSubmittedEmail,
  sendReservationDecisionEmail,
} from "@/lib/email/reservation-decision";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type RequestDecisionState = {
  error?: string;
};

export type SubmitReservationResult =
  | {
      ok: true;
      startAt: string;
      endAt: string;
      replaced: Array<{ startAt: string; endAt: string }>;
    }
  | { ok: false; error: string };

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return (
    parseStoredTimestamp(startA).getTime() < parseStoredTimestamp(endB).getTime() &&
    parseStoredTimestamp(endA).getTime() > parseStoredTimestamp(startB).getTime()
  );
}

function mergeRequestReasons(existing: string[], incoming: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...existing, incoming]) {
    const text = raw.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(text);
  }
  return parts.join("\n\n");
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
    .select("id, name, is_active, manager_id")
    .eq("id", input.roomId)
    .maybeSingle();

  if (!room?.is_active) {
    return { ok: false, error: "This space is not open for requests." };
  }

  const { data: ownPending, error: ownPendingError } = await supabase
    .from("reservation_requests")
    .select("id, start_at, end_at, description, created_at")
    .eq("room_id", room.id)
    .eq("requester_id", session.id)
    .eq("status", "pending")
    .order("created_at");

  if (ownPendingError) {
    console.error("own pending lookup failed:", ownPendingError.message);
    return { ok: false, error: "The request could not be sent. Try again." };
  }

  const { data: ownReserved, error: ownReservedError } = await supabase
    .from("reservations_confirmed")
    .select("start_at, end_at")
    .eq("room_id", room.id)
    .eq("requester_id", session.id)
    .eq("status", "active");

  if (ownReservedError) {
    console.error("own reserved lookup failed:", ownReservedError.message);
    return { ok: false, error: "The request could not be sent. Try again." };
  }

  const requested = toMsInterval(startAt, endAt);
  const matching = (ownPending ?? []).filter((row) =>
    intervalsTouchOrOverlap(requested, toMsInterval(row.start_at, row.end_at)),
  );
  const union = unionIntervals([
    requested,
    ...matching.map((row) => toMsInterval(row.start_at, row.end_at)),
  ]);
  if (!union) {
    return { ok: false, error: "Choose a valid time range." };
  }

  const touchingReserved = (ownReserved ?? []).filter((row) =>
    intervalsTouchOrOverlap(union, toMsInterval(row.start_at, row.end_at)),
  );
  const remainders = subtractIntervals(
    union,
    touchingReserved.map((row) => toMsInterval(row.start_at, row.end_at)),
  ).sort((left, right) => left.start - right.start);

  if (remainders.length === 0) {
    return { ok: false, error: "That time is already reserved." };
  }

  const mergedReason = mergeRequestReasons(
    matching.map((row) => row.description ?? ""),
    description,
  );
  if (mergedReason.length > 2000) {
    return {
      ok: false,
      error: "Shorten the reason to 2,000 characters or fewer.",
    };
  }

  const approvedParts = touchingReserved.map((row) => ({
    startAt: row.start_at,
    endAt: row.end_at,
  }));
  const replaced: Array<{ startAt: string; endAt: string }> = matching.map(
    (row) => ({
      startAt: row.start_at,
      endAt: row.end_at,
    }),
  );

  const persistRemainder = async (
    remainder: MsInterval,
    useMatching: boolean,
  ): Promise<{ id: string; startAt: string; endAt: string } | { error: string }> => {
    const pendingStart = wallClockFromMs(remainder.start);
    const pendingEnd = wallClockFromMs(remainder.end);
    if (useMatching && matching.length > 0) {
      const keeper = matching[0];
      if (!keeper) {
        return { error: "The request could not be sent. Try again." };
      }
      const unchanged =
        parseStoredTimestamp(keeper.start_at).getTime() === remainder.start &&
        parseStoredTimestamp(keeper.end_at).getTime() === remainder.end &&
        (keeper.description ?? "").trim() === mergedReason;
      if (unchanged) {
        return { id: keeper.id, startAt: pendingStart, endAt: pendingEnd };
      }
      const dropIds = matching.slice(1).map((row) => row.id);
      const { error: combineError } = await supabase.rpc(
        "combine_own_pending_request",
        {
          p_keep_id: keeper.id,
          p_drop_ids: dropIds,
          p_start_at: pendingStart,
          p_end_at: pendingEnd,
          p_description: mergedReason,
        },
      );
      if (combineError) {
        console.error(
          "combine_own_pending_request failed:",
          combineError.message,
        );
        return { error: "The request could not be sent. Try again." };
      }
      return { id: keeper.id, startAt: pendingStart, endAt: pendingEnd };
    }

    const { data: created, error } = await supabase
      .from("reservation_requests")
      .insert({
        room_id: room.id,
        requester_id: session.id,
        title: room.name,
        description: mergedReason,
        start_at: pendingStart,
        end_at: pendingEnd,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      console.error("reservation request insert failed:", error?.message);
      return { error: "The request could not be sent. Try again." };
    }
    return { id: created.id, startAt: pendingStart, endAt: pendingEnd };
  };

  const saved: Array<{ id: string; startAt: string; endAt: string }> = [];
  for (const [index, remainder] of remainders.entries()) {
    const result = await persistRemainder(remainder, index === 0);
    if ("error" in result) {
      return { ok: false, error: result.error };
    }
    saved.push(result);
  }

  revalidatePath("/");
  revalidatePath("/manage");

  const { data: assignedManagerEmails } = await supabase.rpc(
    "room_manager_notice_emails",
    { p_room_id: room.id },
  );
  const managerEmails = [
    CAMPUS_MANAGER_EMAIL,
    ...(Array.isArray(assignedManagerEmails) ? assignedManagerEmails : []),
  ];
  const combined = matching.length > 0 || approvedParts.length > 0;

  for (const row of saved) {
    const { data: conflictRows, error: conflictError } = await supabase.rpc(
      "request_notice_conflicts",
      { p_request_id: row.id },
    );
    if (conflictError) {
      console.error("request_notice_conflicts failed:", conflictError.message);
    }
    const pendingInterval = toMsInterval(row.startAt, row.endAt);
    const relatedApproved = approvedParts.filter((part) =>
      intervalsTouchOrOverlap(
        pendingInterval,
        toMsInterval(part.startAt, part.endAt),
      ),
    );
    const span = unionIntervals([
      pendingInterval,
      ...relatedApproved.map((part) => toMsInterval(part.startAt, part.endAt)),
    ]);
    const conflictSource = Array.isArray(conflictRows) ? conflictRows : [];
    const conflicts = formatNoticeConflicts(
      conflictSource.filter((conflict) => {
        if (conflict.kind !== "confirmed") return true;
        return !relatedApproved.some(
          (part) =>
            parseStoredTimestamp(part.startAt).getTime() ===
              parseStoredTimestamp(conflict.start_at).getTime() &&
            parseStoredTimestamp(part.endAt).getTime() ===
              parseStoredTimestamp(conflict.end_at).getTime(),
        );
      }),
    );
    const requestMail = {
      requestId: row.id,
      requesterEmail: session.email,
      requesterName: session.fullName,
      roomName: room.name,
      startAt: row.startAt,
      endAt: row.endAt,
      reason: mergedReason,
      combined,
      extension: relatedApproved.length > 0,
      combinedStartAt: span ? wallClockFromMs(span.start) : row.startAt,
      combinedEndAt: span ? wallClockFromMs(span.end) : row.endAt,
      timeParts: [
        ...(span && relatedApproved.length > 0
          ? [
              {
                kind: "approved" as const,
                startAt: wallClockFromMs(span.start),
                endAt: wallClockFromMs(span.end),
              },
            ]
          : []),
        { kind: "pending" as const, startAt: row.startAt, endAt: row.endAt },
      ],
      managerEmails,
      conflicts,
    };
    const mailResults = await Promise.allSettled([
      sendNewReservationRequestEmail(requestMail),
      sendRequesterSubmittedEmail(requestMail),
    ]);
    if (mailResults[0].status === "rejected") {
      console.error("New reservation request email failed:", mailResults[0].reason);
    }
    if (mailResults[1].status === "rejected") {
      console.error("Requester submitted email failed:", mailResults[1].reason);
    }
  }

  const last = saved[saved.length - 1];
  return {
    ok: true,
    startAt: last?.startAt ?? startAt,
    endAt: last?.endAt ?? endAt,
    replaced,
  };
}

export type ApplyDecisionResult =
  | { ok: true; kind: "approved" | "declined" }
  | {
      ok: false;
      error: string;
      notice: "already" | "conflict" | "denied" | "error";
    };

export async function applyReservationDecision(input: {
  requestId: string;
  decision: "approved" | "declined";
  declineReason?: string;
}): Promise<ApplyDecisionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Authentication is not configured.",
      notice: "error",
    };
  }

  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { ok: false, error: TEMP_VIEW_BLOCKED, notice: "denied" };
  }
  if (!session?.isManager) {
    return {
      ok: false,
      error: "Only managers can review requests.",
      notice: "denied",
    };
  }

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("reservation_requests")
    .select(
      "id, room_id, requester_id, title, description, start_at, end_at, status",
    )
    .eq("id", input.requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return {
      ok: false,
      error: "That request is no longer pending.",
      notice: "already",
    };
  }

  if (!session.isTechAdmin) {
    const { data: room } = await supabase
      .from("rooms")
      .select("manager_id")
      .eq("id", request.room_id)
      .maybeSingle();
    if (room?.manager_id !== session.id) {
      return {
        ok: false,
        error: "That request is not for a building you manage.",
        notice: "denied",
      };
    }
  }

  const actor = await getAuthUser();
  const decidedById = actor?.id ?? session.id;
  const decidedAt = new Date();
  const { data: requester } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", request.requester_id)
    .maybeSingle();
  const { data: roomRow } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", request.room_id)
    .maybeSingle();
  const roomName = roomRow?.name?.trim() || request.title?.trim() || "Room";
  const decidedByName = session.fullName.trim() || session.email;

  const notify = (kind: "approved" | "declined", declineReason?: string) =>
    sendReservationDecisionEmail({
      kind,
      requestId: request.id,
      requesterEmail: requester?.email ?? "",
      roomName,
      startAt: request.start_at,
      endAt: request.end_at,
      decidedByName,
      decidedAt,
      declineReason,
    });

  if (input.decision === "declined") {
    const declineReason = input.declineReason?.trim() ?? "";
    if (declineReason.length === 0) {
      return {
        ok: false,
        error: "Enter a reason for the decline.",
        notice: "error",
      };
    }
    if (declineReason.length > 2000) {
      return {
        ok: false,
        error: "Shorten the reason to 2,000 characters or fewer.",
        notice: "error",
      };
    }

    const { error } = await supabase
      .from("reservation_requests")
      .update({
        status: "declined",
        declined_by: decidedById,
        declined_at: decidedAt.toISOString(),
        decline_reason: declineReason,
      })
      .eq("id", request.id);
    if (error) {
      return {
        ok: false,
        error: "The request could not be declined. Try again.",
        notice: "error",
      };
    }
    revalidatePath("/");
    revalidatePath("/manage");
    try {
      await notify("declined", declineReason);
    } catch (error) {
      console.error("Reservation decision email failed:", error);
    }
    return { ok: true, kind: "declined" };
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
    return {
      ok: false,
      error: "That time conflicts with a current reservation.",
      notice: "conflict",
    };
  }

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
      approved_by: decidedById,
      approved_at: decidedAt.toISOString(),
      status: "active",
    });

  if (insertError) {
    return {
      ok: false,
      error: "That time conflicts with a current reservation.",
      notice: "conflict",
    };
  }

  const { error: updateError } = await supabase
    .from("reservation_requests")
    .update({ status: "approved" })
    .eq("id", request.id);

  if (updateError) {
    return {
      ok: false,
      error: "The request was reserved but could not be marked approved.",
      notice: "error",
    };
  }

  revalidatePath("/");
  revalidatePath("/manage");
  try {
    await notify("approved");
  } catch (error) {
    console.error("Reservation decision email failed:", error);
  }
  return { ok: true, kind: "approved" };
}

export async function decideReservationRequestAction(
  _prev: RequestDecisionState,
  formData: FormData,
): Promise<RequestDecisionState> {
  const requestId = formData.get("request_id");
  const decision = formData.get("decision");
  if (typeof requestId !== "string" || requestId.length === 0) {
    return { error: "Choose a request." };
  }
  if (decision !== "approved" && decision !== "declined") {
    return { error: "Choose approve or decline." };
  }

  const rawReason = formData.get("decline_reason");
  const result = await applyReservationDecision({
    requestId,
    decision,
    declineReason: typeof rawReason === "string" ? rawReason : "",
  });
  if (!result.ok) return { error: result.error };
  const store = await cookies();
  store.delete(MANAGE_FLASH_COOKIE);
  if (decision === "approved") {
    redirect(
      `/manage?notice=approved&request=${encodeURIComponent(requestId)}`,
    );
  }
  redirect("/manage");
}

export async function consumeManageFlashAction() {
  const store = await cookies();
  store.delete(MANAGE_FLASH_COOKIE);
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
