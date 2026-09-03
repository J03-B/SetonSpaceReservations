"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type AuthActionState, mapAuthError } from "@/lib/auth/errors";
import { clearTempView, TEMP_VIEW_BLOCKED } from "@/lib/auth/impersonation";
import { getRequestOrigin } from "@/lib/auth/origin";
import { safeInternalPath } from "@/lib/auth/paths";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const OTP_LENGTH = 6;

function notConfigured(): AuthActionState {
  return {
    error:
      "Authentication is not configured. Add the Supabase project URL and publishable key, then try again.",
  };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function sendSignInCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readString(formData, "email").toLowerCase();
  const next = safeInternalPath(readString(formData, "next"), "/account");

  if (!isSupabaseConfigured()) {
    return { ...notConfigured(), email };
  }

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", email };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl(origin, next),
    },
  });

  if (error) {
    return { error: mapAuthError(error.message), email };
  }

  return { codeSent: true, email };
}

export async function verifySignInCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const email = readString(formData, "email").toLowerCase();
  const token = readString(formData, "token").replace(/\s/g, "");
  const next = safeInternalPath(readString(formData, "next"), "/account");

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) {
    return {
      error: "Enter the code from your email.",
      email,
      codeSent: true,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return {
      error: mapAuthError(error.message),
      email,
      codeSent: true,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const fullName = readString(formData, "full_name");
  const email = readString(formData, "email").toLowerCase();
  const acceptedRules = formData.get("accepted_rules") === "on";

  if (fullName.length < 2 || !acceptedRules) {
    return { error: "Please fill out your information." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl(origin, "/account"),
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect(`/sign-in?email=${encodeURIComponent(email)}&sent=1`);
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearTempView();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resendConfirmationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const email = readString(formData, "email").toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return {
    success: "If that email needs verification, we sent a new confirmation email.",
  };
}

export async function updateProfileAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return notConfigured();

  const session = await getSessionUser();
  if (session?.isImpersonating) {
    return { error: TEMP_VIEW_BLOCKED };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/account");
  }

  const fullName = readString(formData, "full_name");

  if (fullName.length < 2) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: { full_name: "Enter your name." },
    };
  }

  const { data: savedFullName, error } = await supabase.rpc(
    "update_own_full_name",
    { p_full_name: fullName },
  );

  if (error || typeof savedFullName !== "string") {
    return { error: "Your profile could not be saved. Try again." };
  }

  await supabase.auth.updateUser({
    data: { full_name: savedFullName },
  });

  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { success: "Profile saved.", savedFullName };
}
