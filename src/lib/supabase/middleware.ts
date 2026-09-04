import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/auth/paths";
import {
  getAuthCookieOptions,
  getCanonicalOrigin,
} from "@/lib/supabase/cookies";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

const AUTH_ENTRY_PREFIXES = ["/sign-in", "/sign-up"];
const PROTECTED_PREFIXES = ["/account", "/config"];

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function updateSession(request: NextRequest) {
  const canonicalOrigin = getCanonicalOrigin(request.nextUrl.hostname);
  if (canonicalOrigin) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonicalOrigin,
    );
    return NextResponse.redirect(destination, 308);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const cookieOptions = getAuthCookieOptions(request.nextUrl.hostname);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    const next = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", next);
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (isAuthenticated && isAuthEntryPath(pathname)) {
    const next = safeInternalPath(
      request.nextUrl.searchParams.get("next"),
      "/account",
    );
    const url = request.nextUrl.clone();
    const parsed = new URL(next, request.nextUrl.origin);
    url.pathname = parsed.pathname;
    url.search = parsed.search;
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  return supabaseResponse;
}
