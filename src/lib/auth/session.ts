import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  isManager: boolean;
  isTechAdmin: boolean;
}

/** Server-side session check for header Manage link and future auth gates. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: roles } = await supabase
    .from("role_assignments")
    .select("role")
    .eq("user_id", user.id);

  const roleSet = new Set((roles ?? []).map((r) => r.role as string));

  return {
    id: user.id,
    email: user.email ?? "",
    isManager:
      roleSet.has("space_manager") || roleSet.has("tech_admin"),
    isTechAdmin: roleSet.has("tech_admin"),
  };
}
