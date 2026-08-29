import { createBrowserClient } from "@supabase/ssr";
import {
  isSupabaseConfigured,
  requireSupabasePublicEnv,
} from "@/lib/supabase/env";

export { isSupabaseConfigured };

export function createClient() {
  const { url, key } = requireSupabasePublicEnv();
  return createBrowserClient(url, key);
}
