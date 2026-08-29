"use server";

import { revalidatePath } from "next/cache";
import { TEMP_VIEW_BLOCKED } from "@/lib/auth/impersonation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type TrustActionState = {
  error?: string;
  success?: string;
};

export async function approveTrustedUserAction(
  _prev: TrustActionState,
  formData: FormData,
): Promise<TrustActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured." };
  }

  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { error: TEMP_VIEW_BLOCKED };
  }
  if (!session?.isTechAdmin) {
    return { error: "Only admins can approve trusted access." };
  }

  const userId = formData.get("user_id");
  if (typeof userId !== "string" || userId.length === 0) {
    return { error: "Choose a person to approve." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_trusted_user", {
    p_user_id: userId,
  });

  if (error) {
    return { error: "Could not approve trusted access. Try again." };
  }

  revalidatePath("/manage");
  revalidatePath("/account");
  return { success: "Trusted access approved." };
}
