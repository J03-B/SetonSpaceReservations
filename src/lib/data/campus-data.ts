import campusJson from "../../../data/campus.json";
import type {
  PublicActivityCategory,
  PublicAvailabilitySlot,
  PublicSpace,
} from "@/lib/domain/types";
import type { PublicStatus } from "@/lib/domain/statuses";
import { DEFAULT_TIMEZONE } from "@/lib/domain/statuses";

/**
 * Local campus data — edit `data/campus.json` to change rooms and requests.
 * Eventually this file will sync with Supabase; until then it is the source of truth
 * when Supabase is not configured.
 *
 * Room availability on the map:
 * - No overlapping request → green (Open)
 * - Pending request → yellow
 * - Reserved → red
 * - Blocked / Closed → gray
 */
export interface CampusRequest {
  /** ISO 8601 start */
  start: string;
  /** ISO 8601 end */
  end: string;
  status: Exclude<PublicStatus, "Available">;
  requesterName: string;
  /** When the request was submitted */
  requestedAt: string;
  category?: PublicActivityCategory;
}

export interface CampusRoom {
  id: string;
  name: string;
  slug: string;
  requests: CampusRequest[];
}

export interface CampusBuilding {
  id: string;
  name: string;
  rooms: CampusRoom[];
}

export interface CampusData {
  campus: {
    name: string;
    timezone: string;
  };
  buildings: CampusBuilding[];
}

const data = campusJson as CampusData;

export function getCampusData(): CampusData {
  return data;
}

function roomToSpace(room: CampusRoom, buildingName: string): PublicSpace {
  const timezone = data.campus.timezone || DEFAULT_TIMEZONE;
  return {
    id: `local-${room.slug}`,
    name: room.name,
    shortName: room.name,
    slug: room.slug,
    description: null,
    building: buildingName,
    capacity: null,
    timezone,
    currentStatus: "Open",
    isActive: true,
  };
}

/** All rooms as public spaces (for listings and map). */
export function campusToPublicSpaces(): PublicSpace[] {
  return data.buildings.flatMap((building) =>
    building.rooms.map((room) => roomToSpace(room, building.name)),
  );
}

function overlaps(
  slotStart: Date,
  slotEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  return slotStart < rangeEnd && slotEnd > rangeStart;
}

function requestToSlot(
  room: CampusRoom,
  buildingName: string,
  request: CampusRequest,
): PublicAvailabilitySlot {
  const space = roomToSpace(room, buildingName);
  return {
    spaceId: space.id,
    spaceSlug: space.slug,
    spaceName: space.name,
    startAt: request.start,
    endAt: request.end,
    publicStatus: request.status,
    activityCategory: request.category,
    requestUpdatedAt: request.requestedAt,
    timezone: space.timezone,
  };
}

/** Requests in `data/campus.json` as availability slots for a date range. */
export function campusToAvailabilitySlots(query: {
  start: Date;
  end: Date;
  spaceId?: string;
}): PublicAvailabilitySlot[] {
  const slots: PublicAvailabilitySlot[] = [];

  for (const building of data.buildings) {
    for (const room of building.rooms) {
      const space = roomToSpace(room, building.name);
      if (query.spaceId && space.id !== query.spaceId) continue;

      for (const request of room.requests) {
        const start = new Date(request.start);
        const end = new Date(request.end);
        if (!overlaps(start, end, query.start, query.end)) continue;
        slots.push(requestToSlot(room, building.name, request));
      }
    }
  }

  return slots;
}

/**
 * Shape for a future Supabase sync — maps local JSON rows to DB tables.
 * Not wired yet; kept here so the JSON → API path stays obvious.
 */
export function campusDataForSupabaseSync(): {
  spaces: Array<{
    slug: string;
    name: string;
    building: string;
    timezone: string;
  }>;
  reservationRequests: Array<{
    spaceSlug: string;
    startAt: string;
    endAt: string;
    publicStatus: PublicStatus;
    requesterName: string;
    requestedAt: string;
    category?: PublicActivityCategory;
  }>;
} {
  const timezone = data.campus.timezone || DEFAULT_TIMEZONE;

  const spaces = data.buildings.flatMap((building) =>
    building.rooms.map((room) => ({
      slug: room.slug,
      name: room.name,
      building: building.name,
      timezone,
    })),
  );

  const reservationRequests = data.buildings.flatMap((building) =>
    building.rooms.flatMap((room) =>
      room.requests.map((request) => ({
        spaceSlug: room.slug,
        startAt: request.start,
        endAt: request.end,
        publicStatus: request.status as PublicStatus,
        requesterName: request.requesterName,
        requestedAt: request.requestedAt,
        category: request.category,
      })),
    ),
  );

  return { spaces, reservationRequests };
}
