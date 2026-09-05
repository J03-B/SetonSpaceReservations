"use server";

import { revalidatePath } from "next/cache";
import { TEMP_VIEW_BLOCKED } from "@/lib/auth/impersonation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type UsersAdminActionState = {
  error?: string;
  success?: string;
};

async function requireTechAdmin() {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured." } as const;
  }
  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { error: TEMP_VIEW_BLOCKED } as const;
  }
  if (!session?.isTechAdmin) {
    return { error: "Only admins can manage users." } as const;
  }
  return { session } as const;
}

export async function promoteUserToTrustedAction(
  _prev: UsersAdminActionState,
  formData: FormData,
): Promise<UsersAdminActionState> {
  const gate = await requireTechAdmin();
  if ("error" in gate) return { error: gate.error };

  const userId = formData.get("user_id");
  if (typeof userId !== "string" || userId.length === 0) {
    return { error: "Choose a person to promote." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_user_to_trusted", {
    p_user_id: userId,
  });
  if (error) {
    return { error: "Could not promote to trusted access. Try again." };
  }

  revalidatePath("/config");
  revalidatePath("/account");
  return { success: "Promoted to trusted user." };
}

export async function setUserAccountStatusAction(
  _prev: UsersAdminActionState,
  formData: FormData,
): Promise<UsersAdminActionState> {
  const gate = await requireTechAdmin();
  if ("error" in gate) return { error: gate.error };

  const userId = formData.get("user_id");
  const status = formData.get("status");
  if (typeof userId !== "string" || userId.length === 0) {
    return { error: "Choose a person." };
  }
  if (
    status !== "active" &&
    status !== "suspended" &&
    status !== "revoked"
  ) {
    return { error: "Choose a valid account status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_account_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) {
    return { error: error.message || "Could not update account status." };
  }

  revalidatePath("/config");
  revalidatePath("/account");
  const label =
    status === "active"
      ? "Account reactivated."
      : status === "suspended"
        ? "Account suspended."
        : "Account revoked.";
  return { success: label };
}
