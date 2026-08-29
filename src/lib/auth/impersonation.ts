import { cookies } from "next/headers";

export const TEMP_VIEW_COOKIE = "seton_temp_view";

const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUserId(value: string): boolean {
  return USER_ID.test(value);
}

export async function readTempViewUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(TEMP_VIEW_COOKIE)?.value;
  if (!value || !isUserId(value)) return null;
  return value;
}

export async function setTempViewUserId(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TEMP_VIEW_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearTempView(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TEMP_VIEW_COOKIE);
}

export const TEMP_VIEW_BLOCKED =
  "Disable temporary view before making changes.";
