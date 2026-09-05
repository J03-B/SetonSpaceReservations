import { MapWorkspace } from "@/components/map/map-workspace";
import { getPublicAvailability } from "@/lib/data/availability";
import { getOwnOccupancyRanges } from "@/lib/data/own-pending";
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
  const [spaces, session, slots] = await Promise.all([
    getPublicSpaces(),
    getSessionUser(),
    getPublicAvailability(),
  ]);
  const canEditMap = Boolean(session?.isTechDeveloper);
  const campusEditMode = canEditMap && "edit-mainmap" in params;
  const buildingEditMode = canEditMap
    ? typeof params["edit-building"] === "string"
      ? params["edit-building"]
      : "edit-building" in params
        ? "corpus-christi"
        : null
    : null;
  const ownOccupancy = session
    ? await getOwnOccupancyRanges(session.id)
    : [];

  const selectedSpace = spaces.find(
    (s) => s.slug === room && s.isActive,
  );
  const regionMatch = selectedSpace
    ? findRegionBySpaceSlug(selectedSpace.slug)
    : undefined;

  return (
    <MapWorkspace
      spaces={spaces}
      slots={slots}
      isSignedIn={Boolean(session)}
      canRequest={session?.isRequester ?? false}
      isManager={session?.isManager ?? false}
      ownOccupancy={ownOccupancy}
      initialSelectedSlug={selectedSpace?.slug}
      initialMapId={regionMatch?.mapId ?? buildingEditMode ?? undefined}
      campusEditMode={campusEditMode}
      buildingEditMode={buildingEditMode}
    />
  );
}
