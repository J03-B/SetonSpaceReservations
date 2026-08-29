import { NextResponse } from "next/server";
import { getPublicSpaces } from "@/lib/data/spaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const spaces = (await getPublicSpaces()).filter((space) => space.isActive);
  return NextResponse.json({ spaces });
}
