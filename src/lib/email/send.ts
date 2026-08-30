import { readFile } from "node:fs/promises";
import path from "node:path";
import { BRAND } from "@/lib/brand";
import { EMAIL_LOGO_CID } from "@/lib/email/layout";

function encodeSubject(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function chunkBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function toHeader(to: string | string[]): string {
  return (Array.isArray(to) ? to : [to])
    .map((address) => address.trim())
    .filter((address) => address.includes("@"))
    .join(", ");
}

function buildRfc822(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  inlinePng?: { cid: string; data: Buffer };
}): string {
  const from = `${BRAND.name} <${BRAND.email}>`;
  const textB64 = Buffer.from(input.text, "utf8").toString("base64");
  const htmlB64 = Buffer.from(input.html, "utf8").toString("base64");
  const altBoundary = `seton_alt_${Date.now().toString(16)}`;
  const relatedBoundary = `seton_rel_${Date.now().toString(16)}`;

  const alternative = [
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    textB64,
    `--${altBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlB64,
    `--${altBoundary}--`,
  ].join("\r\n");

  const headers = [
    `From: ${from}`,
    `To: ${toHeader(input.to)}`,
    `Reply-To: ${from}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
  ];

  if (!input.inlinePng) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      alternative,
      "",
    ].join("\r\n");
  }

  const imageB64 = chunkBase64(input.inlinePng.data.toString("base64"));
  return [
    ...headers,
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    "",
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    alternative,
    `--${relatedBoundary}`,
    "Content-Type: image/png",
    `Content-ID: <${input.inlinePng.cid}>`,
    `Content-Disposition: inline; filename="logo.png"`,
    "Content-Transfer-Encoding: base64",
    "",
    imageB64,
    `--${relatedBoundary}--`,
    "",
  ].join("\r\n");
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail API is not configured.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gmail token refresh failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Gmail token refresh did not return an access token.");
  }
  return payload.access_token;
}

async function loadInlineLogo(html: string): Promise<Buffer | undefined> {
  if (!html.includes(`cid:${EMAIL_LOGO_CID}`)) return undefined;
  try {
    return await readFile(path.join(process.cwd(), "public", "logo.png"));
  } catch (error) {
    console.warn("Email logo could not be attached:", error);
    return undefined;
  }
}

export async function sendTransactionalEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn(
      "Reservation email skipped: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN. Sign-in codes are sent by Supabase, not the Gmail API.",
    );
    return;
  }

  const to = toHeader(input.to);
  if (!to) {
    throw new Error("Reservation email skipped: no recipients.");
  }

  const logo = await loadInlineLogo(input.html);
  const accessToken = await getAccessToken();
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: toBase64Url(
          buildRfc822({
            ...input,
            to,
            ...(logo ? { inlinePng: { cid: EMAIL_LOGO_CID, data: logo } } : {}),
          }),
        ),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gmail send failed (${response.status}): ${detail}`);
  }
}
