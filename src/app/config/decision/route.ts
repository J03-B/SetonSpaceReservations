import { NextResponse, type NextRequest } from "next/server";
import { applyReservationDecision } from "@/lib/auth/reservation-actions";
import {
  applyManageFlashCookie,
  applyPendingDecisionCookie,
  parseEmailDecisionPayload,
  EMAIL_DECISION_PENDING_COOKIE,
  verifyEmailDecisionLink,
  type EmailDecisionPayload,
  type ManageFlash,
} from "@/lib/auth/email-decision";
import { isEmailDecision } from "@/lib/email/decision-link";
import { getSessionUser } from "@/lib/auth/session";

function manageRedirect(origin: string) {
  const response = NextResponse.redirect(new URL("/config", origin), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function finish(
  origin: string,
  flash: ManageFlash | null,
  clearPending = true,
) {
  const response = manageRedirect(origin);
  applyManageFlashCookie(response, flash);
  if (clearPending) applyPendingDecisionCookie(response, null);
  return response;
}

function payloadFromSearch(
  searchParams: URLSearchParams,
): EmailDecisionPayload | null {
  const requestId = searchParams.get("request") ?? "";
  const decision = searchParams.get("decision") ?? "";
  const token = searchParams.get("token") ?? "";
  if (!requestId || !token || !isEmailDecision(decision)) return null;
  return { requestId, decision, token };
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const fromQuery = payloadFromSearch(searchParams);
  const fromCookie = parseEmailDecisionPayload(
    request.cookies.get(EMAIL_DECISION_PENDING_COOKIE)?.value,
  );
  const payload = fromQuery ?? fromCookie;

  if (!payload) {
    const response = manageRedirect(origin);
    applyPendingDecisionCookie(response, null);
    return response;
  }

  const session = await getSessionUser();
  if (!session) {
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set("next", "/config/decision");
    const response = NextResponse.redirect(signIn, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    applyPendingDecisionCookie(response, payload);
    return response;
  }
  if (!session.isManager) {
    const response = NextResponse.redirect(new URL("/", origin), 303);
    applyPendingDecisionCookie(response, null);
    return response;
  }

  const verified = await verifyEmailDecisionLink(payload);
  if (verified.notice !== "confirm") {
    return finish(origin, { kind: "error", notice: verified.notice });
  }

  if (payload.decision === "declined") {
    return finish(origin, {
      kind: "decline",
      requestId: payload.requestId,
    });
  }

  const result = await applyReservationDecision({
    requestId: payload.requestId,
    decision: "approved",
  });
  if (!result.ok) {
    return finish(origin, { kind: "error", notice: result.notice });
  }
  return finish(origin, {
    kind: "approved",
    requestId: payload.requestId,
  });
}
