import { addDays, startOfDay, endOfDay } from "date-fns";
import { MapWorkspace } from "@/components/map/map-workspace";
import { getPublicAvailability } from "@/lib/data/availability";
import { getPublicSpaces } from "@/lib/data/spaces";
import { getSessionUser } from "@/lib/auth/session";
import { findRegionBySpaceSlug } from "@/lib/map/map-config";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    room?: string;
    "edit-mainmap"?: string;
    "edit-building"?: string;
  }>;
}) {
  const params = await searchParams;
  const { room } = params;
  const campusEditMode = "edit-mainmap" in params;
  const buildingEditMode =
    typeof params["edit-building"] === "string"
      ? params["edit-building"]
      : "edit-building" in params
        ? "corpus-christi"
        : null;
  const [spaces, session] = await Promise.all([
    getPublicSpaces(),
    getSessionUser(),
  ]);

  const selectedSpace = spaces.find(
    (s) => s.slug === room && s.isActive,
  );
  const regionMatch = selectedSpace
    ? findRegionBySpaceSlug(selectedSpace.slug)
    : undefined;

  const rangeStart = startOfDay(new Date());
  const rangeEnd = endOfDay(addDays(new Date(), 14));

  const slots = await getPublicAvailability({
    start: rangeStart,
    end: rangeEnd,
  });

  return (
    <MapWorkspace
      spaces={spaces}
      slots={slots}
      isSignedIn={Boolean(session)}
      canRequest={session?.isRequester ?? false}
      isManager={session?.isManager ?? false}
      initialSelectedSlug={selectedSpace?.slug}
      initialMapId={regionMatch?.mapId ?? buildingEditMode ?? undefined}
      campusEditMode={campusEditMode}
      buildingEditMode={buildingEditMode}
    />
  );
}
