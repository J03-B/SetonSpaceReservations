import { NextResponse } from "next/server";
import { getPublicSpaces } from "@/lib/data/spaces";

export async function GET() {
  const spaces = await getPublicSpaces();
  return NextResponse.json({ spaces });
}
