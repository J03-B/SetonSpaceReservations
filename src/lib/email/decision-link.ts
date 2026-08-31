import { createHmac, timingSafeEqual } from "crypto";
import { BRAND } from "@/lib/brand";

export type EmailDecision = "approved" | "declined";

function decisionSecret(): string {
  return (
    process.env.EMAIL_DECISION_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function isEmailDecision(value: string | undefined): value is EmailDecision {
  return value === "approved" || value === "declined";
}

export function emailDecisionToken(
  requestId: string,
  decision: EmailDecision,
): string {
  const secret = decisionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${requestId}:${decision}`)
    .digest("base64url");
}

export function verifyEmailDecisionToken(
  requestId: string,
  decision: EmailDecision,
  token: string,
): boolean {
  const expected = emailDecisionToken(requestId, decision);
  if (!expected || !token) return false;
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function emailDecisionHref(
  requestId: string,
  decision: EmailDecision,
): string {
  const token = emailDecisionToken(requestId, decision);
  if (!token) {
    console.error(
      "EMAIL_DECISION_SECRET (or GOOGLE_CLIENT_SECRET) is missing; email decision links will not verify.",
    );
  }
  const origin = BRAND.siteUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    request: requestId,
    decision,
    token,
  });
  return `${origin}/manage/decision?${params.toString()}`;
}
