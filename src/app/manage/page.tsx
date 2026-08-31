import { redirect } from "next/navigation";
import { ManageBoard, type ManagedEvent } from "@/app/manage/manage-board";
import type { TempViewPerson } from "@/app/manage/temp-view-form";
import type { TrustCandidate } from "@/app/manage/trust-queue";
import { AuthMessage } from "@/components/auth/form-fields";
import {
  CAMPUS_MANAGER_EMAIL,
  isBootstrapAdminEmail,
} from "@/lib/auth/config";
import {
  accessLabelFor,
  asAccessLevel,
  getSessionUser,
  type AccessLabel,
} from "@/lib/auth/session";
import { formatCampusWhen, toEasternWallClock } from "@/lib/availability/format-when";
import {
  groupManagedRoomsByBuilding,
  type BuildingRoomGroup,
  type CatalogRoom,
} from "@/lib/auth/managed-rooms";
import { readManageFlash } from "@/lib/auth/email-decision";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Manage",
};

type TimeRow = {
  id: string;
  title: string | null;
  description: string | null;
  decline_reason?: string | null;
  status: string;
  start_at: string;
  end_at: string;
  room_id: string;
  requester_id: string;
};

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA < endB && endA > startB;
}

function sortByWhen(items: ManagedEvent[]): ManagedEvent[] {
  return [...items].sort((a, b) => a.when.localeCompare(b.when));
}

function toEvents(
  rows: TimeRow[],
  roomsById: Map<string, { name: string; building: string }>,
  usersById: Map<string, { fullName: string; email: string }>,
  conflictIds: Set<string>,
  whyFrom: "description" | "decline" = "description",
): ManagedEvent[] {
  return sortByWhen(
    rows.map((row) => {
      const room = roomsById.get(row.room_id);
      const requester = usersById.get(row.requester_id);
      const why =
        whyFrom === "decline"
          ? row.decline_reason?.trim() || "—"
          : row.description?.trim() || "—";
      return {
        id: row.id,
        title: room?.name ?? row.title?.trim() ?? "Room",
        why,
        roomName: room?.name ?? "Room",
        building: room?.building ?? "Campus",
        requesterName: requester?.fullName ?? "Requester",
        requesterEmail: requester?.email ?? "",
        when: formatCampusWhen(row.start_at, row.end_at),
        hasConflict: conflictIds.has(row.id),
      };
    }),
  );
}

function roomGroupsForAccount(
  rooms: CatalogRoom[],
  userId: string,
  accessLabel: AccessLabel,
): BuildingRoomGroup[] {
  if (accessLabel !== "Manager" && accessLabel !== "Admin") {
    return [];
  }

  return groupManagedRoomsByBuilding(
    rooms,
    userId,
    accessLabel === "Admin",
  );
}

function withCampusManager(
  people: TempViewPerson[],
  rooms: CatalogRoom[],
): TempViewPerson[] {
  if (
    people.some(
      (person) => person.email.toLowerCase() === CAMPUS_MANAGER_EMAIL,
    )
  ) {
    return people;
  }

  const campusManagerId =
    rooms.find((room) => room.manager_id)?.manager_id ?? "";

  return [
    {
      id: campusManagerId,
      fullName: "J Benin",
      email: CAMPUS_MANAGER_EMAIL,
      accessLabel: "Manager",
      roomGroups: roomGroupsForAccount(rooms, campusManagerId, "Manager"),
    },
    ...people,
  ];
}

async function getTrustCandidates(): Promise<TrustCandidate[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, access_level")
    .in("access_level", ["guest", "user"])
    .eq("account_status", "active")
    .order("full_name");

  return (data ?? []).map((row) => {
    const accessLevel = asAccessLevel(row.access_level);
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      accessLabel: accessLabelFor(accessLevel, false),
    };
  });
}

function emailDecisionNotice(notice: string | undefined): {
  success?: string;
  error?: string;
} {
  switch (notice) {
    case "approved":
      return { success: "The request was approved." };
    case "declined":
      return { success: "The request was declined." };
    case "already":
      return { error: "That request is no longer pending." };
    case "conflict":
      return { error: "That time conflicts with a current reservation." };
    case "denied":
      return { error: "You cannot review that request." };
    case "invalid":
      return { error: "That email link is invalid." };
    case "error":
      return { error: "The request could not be updated. Try again from Manage." };
    default:
      return {};
  }
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{
    request?: string;
    decision?: string;
    token?: string;
    notice?: string;
    decline?: string;
    approve?: string;
  }>;
}) {
  const params = await searchParams;
  const emailQuery = new URLSearchParams();
  if (params.request) emailQuery.set("request", params.request);
  if (params.decision) emailQuery.set("decision", params.decision);
  if (params.token) emailQuery.set("token", params.token);
  if (params.request && params.decision && params.token) {
    redirect(`/manage/decision?${emailQuery.toString()}`);
  }

  const session = await getSessionUser();

  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent("/manage")}`);
  }
  if (!session.isManager) {
    redirect("/");
  }

  const flash = await readManageFlash();
  const notice = emailDecisionNotice(
    flash?.kind === "error" ? flash.notice : params.notice,
  );
  const openDeclineRequestId =
    flash?.kind === "decline"
      ? flash.requestId
      : params.decline === "1" && params.request
        ? params.request
        : undefined;
  const approvedRequestId =
    flash?.kind === "approved" ? flash.requestId : params.request;

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <h1 className="text-center text-3xl font-semibold">Manage</h1>
      </div>
    );
  }

  const supabase = await createClient();
  const roomsQuery = session.isTechAdmin
    ? supabase.from("rooms").select("id, name, building, manager_id")
    : supabase
        .from("rooms")
        .select("id, name, building, manager_id")
        .eq("manager_id", session.id);

  const { data: rooms } = await roomsQuery;
  const managedRooms = rooms ?? [];
  const managedRoomIds = managedRooms.map((room) => room.id);
  const catalogRooms: CatalogRoom[] = managedRooms.map((room) => ({
    name: room.name,
    building: room.building,
    manager_id: room.manager_id,
  }));
  const roomsById = new Map(
    managedRooms.map((room) => [
      room.id,
      { name: room.name, building: room.building ?? "Campus" },
    ]),
  );

  let requestRows: TimeRow[] = [];
  let declinedRows: TimeRow[] = [];
  let reservationRows: TimeRow[] = [];

  if (session.isTechAdmin || managedRoomIds.length > 0) {
    let requestQuery = supabase
      .from("reservation_requests")
      .select(
        "id, title, description, status, start_at, end_at, room_id, requester_id",
      )
      .eq("status", "pending")
      .order("start_at");
    let declinedQuery = supabase
      .from("reservation_requests")
      .select(
        "id, title, description, decline_reason, status, start_at, end_at, room_id, requester_id",
      )
      .eq("status", "declined")
      .order("start_at", { ascending: false });
    let reservationQuery = supabase
      .from("reservations_confirmed")
      .select(
        "id, title, description, status, start_at, end_at, room_id, requester_id",
      )
      .eq("status", "active")
      .gte("end_at", toEasternWallClock(new Date()))
      .order("start_at");

    if (!session.isTechAdmin) {
      requestQuery = requestQuery.in("room_id", managedRoomIds);
      declinedQuery = declinedQuery.in("room_id", managedRoomIds);
      reservationQuery = reservationQuery.in("room_id", managedRoomIds);
    }

    const [requestResult, declinedResult, reservationResult] = await Promise.all([
      requestQuery,
      declinedQuery,
      reservationQuery,
    ]);
    requestRows = requestResult.data ?? [];
    declinedRows = declinedResult.data ?? [];
    reservationRows = reservationResult.data ?? [];
  }

  const declineTarget =
    openDeclineRequestId &&
    requestRows.some((row) => row.id === openDeclineRequestId)
      ? openDeclineRequestId
      : undefined;
  const shownNotice =
    openDeclineRequestId && !declineTarget
      ? emailDecisionNotice("already")
      : notice;
  const noticeApproved =
    (params.notice === "approved" || flash?.kind === "approved") &&
    !shownNotice.error;

  const conflictIds = new Set(
    requestRows
      .filter((request) =>
        [...reservationRows, ...requestRows.filter((other) => other.id !== request.id)].some(
          (other) =>
            other.room_id === request.room_id &&
            overlaps(
              request.start_at,
              request.end_at,
              other.start_at,
              other.end_at,
            ),
        ),
      )
      .map((request) => request.id),
  );

  const requesterIds = [
    ...new Set(
      [...requestRows, ...declinedRows, ...reservationRows].map(
        (row) => row.requester_id,
      ),
    ),
  ];

  const { data: requesters } =
    requesterIds.length > 0
      ? await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", requesterIds)
      : { data: [] };

  const usersById = new Map(
    (requesters ?? []).map((row) => [
      row.id,
      { fullName: row.full_name, email: row.email },
    ]),
  );

  let approvedEvent: ManagedEvent | undefined;
  if (noticeApproved && approvedRequestId) {
    const { data: approvedRow } = await supabase
      .from("reservation_requests")
      .select(
        "id, title, description, status, start_at, end_at, room_id, requester_id",
      )
      .eq("id", approvedRequestId)
      .maybeSingle();
    if (approvedRow) {
      if (!roomsById.has(approvedRow.room_id)) {
        const { data: room } = await supabase
          .from("rooms")
          .select("id, name, building")
          .eq("id", approvedRow.room_id)
          .maybeSingle();
        if (room) {
          roomsById.set(room.id, {
            name: room.name,
            building: room.building ?? "Campus",
          });
        }
      }
      if (!usersById.has(approvedRow.requester_id)) {
        const { data: requester } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", approvedRow.requester_id)
          .maybeSingle();
        if (requester) {
          usersById.set(requester.id, {
            fullName: requester.full_name,
            email: requester.email,
          });
        }
      }
      approvedEvent = toEvents(
        [approvedRow],
        roomsById,
        usersById,
        new Set(),
      )[0];
    }
  }

  const [trustCandidates, directoryResult] = await Promise.all([
    session.isTechAdmin ? getTrustCandidates() : Promise.resolve([]),
    session.isTechAdmin
      ? supabase.rpc("list_accounts_for_admin")
      : Promise.resolve({ data: [] }),
  ]);

  const directoryPeople: TempViewPerson[] = (directoryResult.data ?? []).map(
    (row: {
      id: string;
      full_name: string;
      email: string;
      access_level: string;
    }) => {
      const accessLevel = asAccessLevel(row.access_level);
      const accessLabel = accessLabelFor(
        accessLevel,
        accessLevel === "admin" || isBootstrapAdminEmail(row.email),
      );
      return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        accessLabel,
        roomGroups: roomGroupsForAccount(catalogRooms, row.id, accessLabel),
      };
    },
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6">
      <h1 className="text-center text-3xl font-semibold">Manage</h1>
      {shownNotice.error ? (
        <div className="mx-auto mt-6 max-w-xl">
          <AuthMessage error={shownNotice.error} />
        </div>
      ) : null}
      <div className="mt-8">
        <ManageBoard
          isAdmin={session.isTechAdmin}
          rejected={toEvents(
            declinedRows,
            roomsById,
            usersById,
            new Set(),
            "decline",
          )}
          requests={toEvents(requestRows, roomsById, usersById, conflictIds)}
          reservations={toEvents(
            reservationRows,
            roomsById,
            usersById,
            new Set(),
          )}
          trustCandidates={trustCandidates}
          tempViewPeople={withCampusManager(directoryPeople, catalogRooms)}
          openDeclineRequestId={declineTarget}
          approvedEvent={approvedEvent}
          noticeApproved={noticeApproved}
        />
      </div>
    </div>
  );
}
