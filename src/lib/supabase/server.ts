import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getAuthCookieOptions } from "@/lib/supabase/cookies";
import {
  isSupabaseConfigured,
  requireSupabasePublicEnv,
} from "@/lib/supabase/env";

export { isSupabaseConfigured };

async function requestHostname() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  return host.split(":")[0] || undefined;
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabasePublicEnv();
  const cookieOptions = getAuthCookieOptions(await requestHostname());

  return createServerClient(url, key, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware handles refresh.
        }
      },
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
