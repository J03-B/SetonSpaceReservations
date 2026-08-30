import { formatInTimeZone } from "date-fns-tz";
import { formatCampusWhen, parseStoredTimestamp } from "@/lib/availability/format-when";
import { BRAND } from "@/lib/brand";
import { DEFAULT_TIMEZONE } from "@/lib/domain/statuses";
import { renderSetonEmail, type EmailContent } from "@/lib/email/layout";
import { emailLogoSrc } from "@/lib/email/logo";
import {
  SIGN_IN_OTP_INSTRUCTION,
  SIGN_UP_OTP_INSTRUCTION,
  renderOtpEmailHtml,
} from "@/lib/email/otp-html";

export function confirmationNumber(requestId: string): string {
  if (isTemplateToken(requestId)) return "{confirmation}";
  return `SR-${requestId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function subjectDate(startAt: string): string {
  if (isTemplateToken(startAt)) return "{date}";
  return formatInTimeZone(
    parseStoredTimestamp(startAt),
    DEFAULT_TIMEZONE,
    "MMM d",
  );
}

function isTemplateToken(value: string): boolean {
  return /^\{[a-z0-9_]+\}$/i.test(value.trim());
}

function formatDecisionStamp(date: Date, decidedByName: string): string {
  if (isTemplateToken(decidedByName)) return "{decided_at}";
  return formatInTimeZone(date, DEFAULT_TIMEZONE, "EEE, MMM d, yyyy, h:mm a 'ET'");
}

function whenLine(startAt: string, endAt: string): string {
  if (isTemplateToken(startAt) || isTemplateToken(endAt)) return "{when}";
  return `${formatCampusWhen(startAt, endAt).replaceAll("\n", " ")} ET`;
}

function siteActionHref(input: ReservationEmailFields): string {
  const origin = input.origin?.replace(/\/$/, "") ?? "";
  if (isTemplateToken(origin)) return origin;
  return BRAND.siteUrl;
}

function cardChrome(
  input: ReservationEmailFields,
): Pick<
  EmailContent,
  | "logoSrc"
  | "dividerBeforeRows"
  | "footerOutsideCard"
  | "compactFooter"
  | "actionLabel"
  | "actionHref"
> {
  return {
    logoSrc: input.logoSrc,
    dividerBeforeRows: true,
    footerOutsideCard: true,
    compactFooter: true,
    actionLabel: "Open Seton Spaces",
    actionHref: siteActionHref(input),
  };
}

export interface ReservationEmailFields {
  requestId: string;
  requesterEmail: string;
  requesterName: string;
  roomName: string;
  startAt: string;
  endAt: string;
  reason: string;
  decidedByName: string;
  decidedAt: Date;
  declineReason: string;
  origin?: string;
  logoSrc?: string;
}

export const EMAIL_PREVIEW_SAMPLE: ReservationEmailFields = {
  requestId: "8f3c2a91-4b6e-4d12-9a70-1c2e8b4f6d33",
  requesterEmail: "semperjoey@gmail.com",
  requesterName: "J Benin",
  roomName: "Gym",
  startAt: "2026-09-12T19:00:00.000Z",
  endAt: "2026-09-12T21:00:00.000Z",
  reason: "Varsity practice and a parent meeting after.",
  decidedByName: "J Benin",
  decidedAt: new Date("2026-08-30T18:00:00.000Z"),
  declineReason: "The gym is already needed for a school event at that time.",
  origin: BRAND.siteUrl,
};

export const EMAIL_RAW_FIELDS: ReservationEmailFields = {
  requestId: "{request_id}",
  requesterEmail: "{requester_email}",
  requesterName: "{requester_name}",
  roomName: "{space}",
  startAt: "{when}",
  endAt: "{when}",
  reason: "{reason}",
  decidedByName: "{decided_by}",
  decidedAt: EMAIL_PREVIEW_SAMPLE.decidedAt,
  declineReason: "{decline_reason}",
  origin: "{origin}",
};

export function buildApprovedEmail(input: ReservationEmailFields) {
  const shortDate = subjectDate(input.startAt);
  return {
    subject: `Reservation approved — ${input.roomName} — ${shortDate}`,
    ...renderSetonEmail({
      heading: "Reservation approved",
      intro: "Your reservation request was approved.",
      introAfter: "The time is now reserved.",
      ...cardChrome(input),
      rows: [
        { label: "Status", value: "Reservation approved" },
        { label: "Space", value: input.roomName },
        { label: "When", value: whenLine(input.startAt, input.endAt) },
        { label: "Approved by", value: input.decidedByName },
        { label: "Decision made", value: formatDecisionStamp(input.decidedAt, input.decidedByName) },
        { label: "Request ID", value: input.requestId, compact: true },
      ],
    }),
  };
}

export function buildDeclinedEmail(input: ReservationEmailFields) {
  const shortDate = subjectDate(input.startAt);
  const rows: EmailContent["rows"] = [
    { label: "Status", value: "Reservation declined" },
    { label: "Space", value: input.roomName },
    { label: "When", value: whenLine(input.startAt, input.endAt) },
  ];
  if (input.declineReason) {
    rows.push({ label: "Reason", value: input.declineReason, multiline: true });
  }
  rows.push(
    { label: "Declined by", value: input.decidedByName },
    { label: "Decision made", value: formatDecisionStamp(input.decidedAt, input.decidedByName) },
    { label: "Request ID", value: input.requestId, compact: true },
  );
  return {
    subject: `Reservation declined — ${input.roomName} — ${shortDate}`,
    ...renderSetonEmail({
      heading: "Reservation declined",
      intro: "Your reservation request was declined.",
      introAfter: "The time is not reserved.",
      ...cardChrome(input),
      rows,
    }),
  };
}

export function buildRequesterSubmittedEmail(input: ReservationEmailFields) {
  const shortDate = subjectDate(input.startAt);
  return {
    subject: `Reservation request submitted — ${input.roomName} — ${shortDate}`,
    ...renderSetonEmail({
      heading: "Request submitted",
      intro: "We received your reservation request.",
      introAfter: "It is pending review.",
      ...cardChrome(input),
      rows: [
        { label: "Status", value: "Submitted" },
        { label: "Space", value: input.roomName },
        { label: "When", value: whenLine(input.startAt, input.endAt) },
        { label: "Reason", value: input.reason, multiline: true },
        { label: "Request ID", value: input.requestId, compact: true },
      ],
    }),
  };
}

export function buildMailboxNewRequestEmail(input: ReservationEmailFields) {
  const shortDate = subjectDate(input.startAt);
  const requesterName = input.requesterName.trim() || input.requesterEmail;
  return {
    subject: `New reservation request — ${input.roomName} — ${shortDate}`,
    ...renderSetonEmail({
      heading: "New reservation request",
      intro: "A reservation request was submitted.",
      introAfter: "It needs review.",
      ...cardChrome(input),
      rows: [
        { label: "Status", value: "Submitted" },
        { label: "Space", value: input.roomName },
        { label: "When", value: whenLine(input.startAt, input.endAt) },
        { label: "Reason", value: input.reason, multiline: true },
        {
          label: "Requester",
          value: `${requesterName} (${input.requesterEmail})`,
        },
        { label: "Request ID", value: input.requestId, compact: true },
      ],
    }),
  };
}

export type EmailTemplateId =
  | "sign-in"
  | "sign-up"
  | "request-requester"
  | "request-mailbox"
  | "approved"
  | "declined";

export interface EmailTemplateCard {
  id: EmailTemplateId;
  label: string;
  via: "Supabase" | "Gmail";
  subject: string;
  rawSubject: string;
  html: string;
  rawHtml: string;
  copyLabel: string;
  copyValue: string;
  rawCopyValue: string;
}

export function emailTemplateCards(
  sample: ReservationEmailFields = EMAIL_PREVIEW_SAMPLE,
): EmailTemplateCard[] {
  const previewOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const storageLogo = emailLogoSrc();
  const preview = {
    ...sample,
    logoSrc: sample.logoSrc ?? storageLogo ?? `${previewOrigin}${BRAND.logoSrc}`,
  };
  const requester = buildRequesterSubmittedEmail(preview);
  const requesterRaw = buildRequesterSubmittedEmail({
    ...EMAIL_RAW_FIELDS,
    logoSrc: preview.logoSrc,
  });
  const mailbox = buildMailboxNewRequestEmail(preview);
  const mailboxRaw = buildMailboxNewRequestEmail({
    ...EMAIL_RAW_FIELDS,
    logoSrc: preview.logoSrc,
  });
  const approved = buildApprovedEmail(preview);
  const approvedRaw = buildApprovedEmail({
    ...EMAIL_RAW_FIELDS,
    logoSrc: preview.logoSrc,
  });
  const declined = buildDeclinedEmail(preview);
  const declinedRaw = buildDeclinedEmail({
    ...EMAIL_RAW_FIELDS,
    logoSrc: preview.logoSrc,
  });
  const otpOptions = {
    logoSrc: preview.logoSrc,
    origin: preview.origin,
  };
  const supabaseOtp = {
    logoSrc: storageLogo ?? "{{ .SiteURL }}/logo.png",
    origin: BRAND.siteUrl,
  };
  const signInRaw = renderOtpEmailHtml("{{ .Token }}", SIGN_IN_OTP_INSTRUCTION, {
    heading: "Sign in",
    ...supabaseOtp,
  });
  const signUpRaw = renderOtpEmailHtml("{{ .Token }}", SIGN_UP_OTP_INSTRUCTION, {
    heading: "Sign up",
    ...supabaseOtp,
  });

  return [
    {
      id: "sign-in",
      label: "Sign in",
      via: "Supabase",
      subject: "Sign In Code",
      rawSubject: "Sign In Code",
      html: renderOtpEmailHtml("123456", SIGN_IN_OTP_INSTRUCTION, {
        heading: "Sign in",
        ...otpOptions,
      }),
      rawHtml: signInRaw,
      copyLabel: "Copy for Supabase",
      copyValue: signInRaw,
      rawCopyValue: signInRaw,
    },
    {
      id: "sign-up",
      label: "Sign up",
      via: "Supabase",
      subject: "Sign In Code",
      rawSubject: "Sign In Code",
      html: renderOtpEmailHtml("123456", SIGN_UP_OTP_INSTRUCTION, {
        heading: "Sign up",
        ...otpOptions,
      }),
      rawHtml: signUpRaw,
      copyLabel: "Copy for Supabase",
      copyValue: signUpRaw,
      rawCopyValue: signUpRaw,
    },
    {
      id: "request-requester",
      label: "Request confirmation",
      via: "Gmail",
      subject: requester.subject,
      rawSubject: requesterRaw.subject,
      html: requester.html,
      rawHtml: requesterRaw.html,
      copyLabel: "Copy HTML",
      copyValue: requester.html,
      rawCopyValue: requesterRaw.html,
    },
    {
      id: "request-mailbox",
      label: "Request notice",
      via: "Gmail",
      subject: mailbox.subject,
      rawSubject: mailboxRaw.subject,
      html: mailbox.html,
      rawHtml: mailboxRaw.html,
      copyLabel: "Copy HTML",
      copyValue: mailbox.html,
      rawCopyValue: mailboxRaw.html,
    },
    {
      id: "approved",
      label: "Approved",
      via: "Gmail",
      subject: approved.subject,
      rawSubject: approvedRaw.subject,
      html: approved.html,
      rawHtml: approvedRaw.html,
      copyLabel: "Copy HTML",
      copyValue: approved.html,
      rawCopyValue: approvedRaw.html,
    },
    {
      id: "declined",
      label: "Declined",
      via: "Gmail",
      subject: declined.subject,
      rawSubject: declinedRaw.subject,
      html: declined.html,
      rawHtml: declinedRaw.html,
      copyLabel: "Copy HTML",
      copyValue: declined.html,
      rawCopyValue: declinedRaw.html,
    },
  ];
}
