"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCampusManagerEmail } from "@/lib/auth/config";
import {
  clearTempView,
  isUserId,
  setTempViewUserId,
} from "@/lib/auth/impersonation";
import { getAuthUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type TempViewState = {
  error?: string;
};

export async function startTempViewAction(
  _prev: TempViewState,
  formData: FormData,
): Promise<TempViewState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured." };
  }

  const actor = await getAuthUser();
  if (!actor?.isTechDeveloper || actor.isImpersonating) {
    return { error: "Only a developer can start a temporary view." };
  }

  const userIdValue = formData.get("user_id");
  const emailValue = formData.get("email");
  const userId = typeof userIdValue === "string" ? userIdValue : "";
  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

  const supabase = await createClient();
  let target: { id: string; account_status: string } | null = null;

  if (isUserId(userId)) {
    const { data } = await supabase
      .from("users")
      .select("id, account_status, email")
      .eq("id", userId)
      .maybeSingle();
    target = data;
  }

  if (!target && email) {
    const { data } = await supabase
      .from("users")
      .select("id, account_status, email")
      .eq("email", email)
      .maybeSingle();
    target = data;
  }

  if (!target) {
    return {
      error: isCampusManagerEmail(email)
        ? "That account hasn’t signed in yet."
        : "That account is not available.",
    };
  }
  if (target.id === actor.id) {
    return { error: "You are already using that account." };
  }
  if (target.account_status !== "active") {
    return { error: "That account is not available." };
  }

  await setTempViewUserId(target.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function stopTempViewAction(): Promise<void> {
  const actor = await getAuthUser();
  if (!actor?.isTechDeveloper) {
    redirect("/account");
  }

  await clearTempView();
  revalidatePath("/", "layout");
  redirect("/account");
}
