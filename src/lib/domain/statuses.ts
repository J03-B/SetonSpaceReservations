/**
 * Canonical status enums — see docs/seton-space-reservations-masterplan.md §13, §11.2
 * and docs/seton-space-reservations-style-guide.md §4.1
 */

export const PUBLIC_STATUSES = [
  "Available",
  "Pending",
  "Reserved",
  "Blocked",
  "Closed",
] as const;

export type PublicStatus = (typeof PUBLIC_STATUSES)[number];

export const ROOM_CURRENT_STATUSES = ["Open", "Pending", "Reserved"] as const;

export type RoomCurrentStatus = (typeof ROOM_CURRENT_STATUSES)[number];

export const PUBLIC_STATUS_LABELS: Record<PublicStatus, string> = {
  Available: "Open",
  Pending: "Pending",
  Reserved: "Reserved",
  Blocked: "Blocked",
  Closed: "Closed",
};

export const RESERVATION_REQUEST_STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Changes Requested",
  "Resubmitted",
  "Approved",
  "Declined",
  "Cancelled by Requester",
  "Cancelled by Manager",
  "Expired",
  "Completed",
] as const;

export type ReservationRequestStatus =
  (typeof RESERVATION_REQUEST_STATUSES)[number];

export const EXTERNAL_ACCESS_STATUSES = [
  "Not Submitted",
  "Submitted",
  "Under Review",
  "Changes Requested",
  "Approved",
  "Declined",
  "Suspended",
  "Revoked",
] as const;

export type ExternalAccessStatus = (typeof EXTERNAL_ACCESS_STATUSES)[number];

export const ROLES = [
  "tech_admin",
  "space_manager",
  "requester",
] as const;

export type Role = (typeof ROLES)[number];

export const MANAGER_TYPES = ["Primary", "Backup"] as const;

export type ManagerType = (typeof MANAGER_TYPES)[number];

export const DEFAULT_TIMEZONE = "America/New_York";
