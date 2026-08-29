import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/paths";

function errorRedirect(origin: string, message: string) {
  const url = new URL("/auth/error", origin);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), "/account");

  if (!code) {
    return errorRedirect(
      origin,
      "The confirmation link is missing a code. Request a new email and try again.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return errorRedirect(
      origin,
      "This confirmation link is invalid or has expired. Request a new email and try again.",
    );
  }

  return NextResponse.redirect(new URL(next, origin));
}
