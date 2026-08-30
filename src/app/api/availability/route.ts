import { NextRequest, NextResponse } from "next/server";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { getPublicAvailability } from "@/lib/data/availability";
import { getPublicSpaces } from "@/lib/data/spaces";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const spaceSlug = searchParams.get("spaceId") ?? searchParams.get("space");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const spaces = await getPublicSpaces();
  const space = spaceSlug
    ? spaces.find(
        (s) => (s.slug === spaceSlug || s.id === spaceSlug) && s.isActive,
      )
    : undefined;

  const start = startParam ? startOfDay(parseISO(startParam)) : undefined;
  const end = endParam ? endOfDay(parseISO(endParam)) : undefined;

  if (start && end && end < start) {
    return NextResponse.json(
      { error: { code: "INVALID_RANGE", message: "End must be after start." } },
      { status: 400 },
    );
  }

  const slots = await getPublicAvailability({
    spaceId: space?.id,
    start,
    end,
  });

  return NextResponse.json({ slots });
}
