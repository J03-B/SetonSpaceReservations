import { NextRequest, NextResponse } from "next/server";
import { parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import {
  getPublicAvailability,
  defaultAvailabilityRange,
} from "@/lib/data/availability";
import { getPublicSpaces } from "@/lib/data/spaces";

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

  const defaultRange = defaultAvailabilityRange();
  const start = startParam ? startOfDay(parseISO(startParam)) : defaultRange.start;
  const end = endParam ? endOfDay(parseISO(endParam)) : defaultRange.end;

  if (end < start) {
    return NextResponse.json(
      { error: { code: "INVALID_RANGE", message: "End must be after start." } },
      { status: 400 },
    );
  }

  if (end > addDays(start, 90)) {
    return NextResponse.json(
      {
        error: {
          code: "RANGE_TOO_LARGE",
          message: "Maximum query range is 90 days.",
        },
      },
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
