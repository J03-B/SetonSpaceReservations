import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  isEmailDecision,
  verifyEmailDecisionToken,
  type EmailDecision,
} from "@/lib/email/decision-link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const EMAIL_DECISION_PENDING_COOKIE = "seton_email_decision";
export const MANAGE_FLASH_COOKIE = "seton_manage_flash";

export type EmailDecisionPayload = {
  requestId: string;
  decision: EmailDecision;
  token: string;
};

export type ManageFlash =
  | { kind: "approved"; requestId: string }
  | { kind: "decline"; requestId: string }
  | { kind: "error"; notice: string };

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 10 * 60,
};

function cookieBase() {
  return COOKIE_OPTIONS;
}

export function parseEmailDecisionPayload(
  value: string | undefined,
): EmailDecisionPayload | null {
  if (!value) return null;
  const [requestId, decision, token] = value.split("|");
  if (!requestId || !token || !isEmailDecision(decision)) return null;
  return { requestId, decision, token };
}

export function serializeEmailDecisionPayload(
  payload: EmailDecisionPayload,
): string {
  return `${payload.requestId}|${payload.decision}|${payload.token}`;
}

export function parseManageFlash(value: string | undefined): ManageFlash | null {
  if (!value) return null;
  const [kind, rest] = value.split("|");
  if (!rest) return null;
  if (kind === "approved" || kind === "decline") {
    return { kind, requestId: rest };
  }
  if (kind === "error") {
    return { kind: "error", notice: rest };
  }
  return null;
}

export function serializeManageFlash(flash: ManageFlash): string {
  if (flash.kind === "error") return `error|${flash.notice}`;
  return `${flash.kind}|${flash.requestId}`;
}

export function applyPendingDecisionCookie(
  response: NextResponse,
  payload: EmailDecisionPayload | null,
) {
  if (!payload) {
    response.cookies.delete(EMAIL_DECISION_PENDING_COOKIE);
    return;
  }
  response.cookies.set(
    EMAIL_DECISION_PENDING_COOKIE,
    serializeEmailDecisionPayload(payload),
    cookieBase(),
  );
}

export function applyManageFlashCookie(
  response: NextResponse,
  flash: ManageFlash | null,
) {
  if (!flash) {
    response.cookies.delete(MANAGE_FLASH_COOKIE);
    return;
  }
  response.cookies.set(
    MANAGE_FLASH_COOKIE,
    serializeManageFlash(flash),
    cookieBase(),
  );
}

export async function readManageFlash(): Promise<ManageFlash | null> {
  const store = await cookies();
  return parseManageFlash(store.get(MANAGE_FLASH_COOKIE)?.value);
}

export async function verifyEmailDecisionLink(input: {
  requestId: string;
  decision: string;
  token: string;
}): Promise<{ notice: string }> {
  if (!isEmailDecision(input.decision)) {
    return { notice: "invalid" };
  }
  if (!verifyEmailDecisionToken(input.requestId, input.decision, input.token)) {
    return { notice: "invalid" };
  }
  if (!isSupabaseConfigured()) {
    return { notice: "error" };
  }

  const session = await getSessionUser();
  if (session?.isImpersonating || !session?.isManager) {
    return { notice: "denied" };
  }

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("reservation_requests")
    .select("id, room_id, status")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return { notice: "already" };
  }

  if (!session.isTechAdmin) {
    const { data: room } = await supabase
      .from("rooms")
      .select("manager_id")
      .eq("id", request.room_id)
      .maybeSingle();
    if (room?.manager_id !== session.id) {
      return { notice: "denied" };
    }
  }

  return { notice: "confirm" };
}

