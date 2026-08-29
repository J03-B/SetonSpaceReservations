import type { PublicStatus, RoomCurrentStatus } from "./statuses";

export type PublicActivityCategory = "Academic" | "Club" | "Other";

/** Privacy-safe public model — masterplan §21.2, style guide §21.5 */
export interface PublicAvailabilitySlot {
  spaceId: string;
  spaceSlug: string;
  spaceName: string;
  startAt: string;
  endAt: string;
  publicStatus: PublicStatus;
  activityCategory?: PublicActivityCategory;
  requestUpdatedAt?: string | null;
  timezone: string;
}

export interface PublicSpace {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description: string | null;
  building: string | null;
  capacity: number | null;
  timezone: string;
  currentStatus: RoomCurrentStatus;
  isActive: boolean;
}

export interface OperatingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}
