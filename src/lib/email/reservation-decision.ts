import { BRAND } from "@/lib/brand";
import {
  buildApprovedEmail,
  buildDeclinedEmail,
  buildMailboxNewRequestEmail,
  buildRequesterSubmittedEmail,
  confirmationNumber,
  type ReservationEmailFields,
} from "@/lib/email/messages";
import { EMAIL_LOGO_CID } from "@/lib/email/layout";
import { emailLogoSrc } from "@/lib/email/logo";
import { sendTransactionalEmail } from "@/lib/email/send";

export { confirmationNumber };

export type ReservationDecisionKind = "approved" | "declined";

export interface ReservationDecisionEmailInput {
  kind: ReservationDecisionKind;
  requestId: string;
  requesterEmail: string;
  roomName: string;
  startAt: string;
  endAt: string;
  decidedByName: string;
  decidedAt: Date;
  declineReason?: string;
}

export interface NewReservationRequestEmailInput {
  requestId: string;
  requesterEmail: string;
  requesterName: string;
  roomName: string;
  startAt: string;
  endAt: string;
  reason: string;
  managerEmails?: string[];
}

export function uniqueNoticeEmails(
  emails: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of emails) {
    const email = value?.trim().toLowerCase() ?? "";
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return unique;
}

function requestFields(
  input: NewReservationRequestEmailInput,
): ReservationEmailFields {
  return {
    requestId: input.requestId,
    requesterEmail: input.requesterEmail,
    requesterName: input.requesterName,
    roomName: input.roomName,
    startAt: input.startAt,
    endAt: input.endAt,
    reason: input.reason,
    decidedByName: "",
    decidedAt: new Date(0),
    declineReason: "",
    origin: BRAND.siteUrl,
    logoSrc: emailLogoSrc() ?? `cid:${EMAIL_LOGO_CID}`,
  };
}

export async function sendReservationDecisionEmail(
  input: ReservationDecisionEmailInput,
): Promise<void> {
  const to = input.requesterEmail.trim().toLowerCase();
  if (!to.includes("@")) return;

  const fields: ReservationEmailFields = {
    requestId: input.requestId,
    requesterEmail: input.requesterEmail,
    requesterName: "",
    roomName: input.roomName,
    startAt: input.startAt,
    endAt: input.endAt,
    reason: "",
    decidedByName: input.decidedByName,
    decidedAt: input.decidedAt,
    declineReason: input.declineReason ?? "",
    origin: BRAND.siteUrl,
    logoSrc: emailLogoSrc() ?? `cid:${EMAIL_LOGO_CID}`,
  };
  const content =
    input.kind === "approved"
      ? buildApprovedEmail(fields)
      : buildDeclinedEmail(fields);

  await sendTransactionalEmail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export async function sendNewReservationRequestEmail(
  input: NewReservationRequestEmailInput,
): Promise<void> {
  const content = buildMailboxNewRequestEmail(requestFields(input));
  const recipients = uniqueNoticeEmails([
    BRAND.email,
    ...(input.managerEmails ?? []),
  ]);
  if (recipients.length === 0) return;

  await sendTransactionalEmail({
    to: recipients,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export async function sendRequesterSubmittedEmail(
  input: NewReservationRequestEmailInput,
): Promise<void> {
  const to = input.requesterEmail.trim().toLowerCase();
  if (!to.includes("@")) return;

  const content = buildRequesterSubmittedEmail(requestFields(input));

  await sendTransactionalEmail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
