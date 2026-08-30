import { BRAND } from "@/lib/brand";
import { escapeHtml, escapeHtmlMultiline } from "@/lib/email/escape";

export const EMAIL_LOGO_CID = "seton-logo";

export interface EmailContent {
  heading: string;
  intro: string;
  introAfter?: string;
  rows: Array<{
    label: string;
    value: string;
    multiline?: boolean;
    stacked?: boolean;
    compact?: boolean;
  }>;
  actionLabel?: string;
  actionHref?: string;
  showQuestions?: boolean;
  logoSrc?: string;
  dividerBeforeRows?: boolean;
  footerOutsideCard?: boolean;
  compactFooter?: boolean;
  code?: string;
  codeCaption?: string;
  dividerAfterCode?: boolean;
}

function brandHeaderHtml(logoSrc?: string): string {
  if (!logoSrc) {
    return `<p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e4d8c;">
                  ${escapeHtml(BRAND.name)}
                </p>`;
  }

  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(BRAND.logoAlt)}" width="80" height="32" style="height: 32px; width: auto; display: block; border: 0; outline: none;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 15px; font-weight: 600; color: #1e4d8c;">
                      ${escapeHtml(BRAND.name)}
                    </td>
                  </tr>
                </table>`;
}

function rowHtml(row: EmailContent["rows"][number]): string {
  const value = row.multiline || row.stacked
    ? escapeHtmlMultiline(row.value)
    : escapeHtml(row.value);
  const size = row.compact ? "12px" : "16px";
  const nowrap = row.compact ? " white-space: nowrap;" : "";

  if (row.stacked) {
    return `<p style="margin: 16px 0 0; font-size: ${size}; line-height: 1.5; color: #5c6678; text-align: left;">
                  ${escapeHtml(row.label)}
                </p>
                <p style="margin: 4px 0 0; font-size: ${size}; line-height: 1.5; color: #1a2332; text-align: left;">
                  ${value}
                </p>`;
  }

  return `<p style="margin: 16px 0 0; font-size: ${size}; line-height: 1.5; color: #5c6678;${nowrap}">
                  ${escapeHtml(row.label)}: <span style="color: #1a2332;">${value}</span>
                </p>`;
}

function footerParts(content: EmailContent, fontSize: string, marginTop: string) {
  const actionHtml = content.actionLabel
    ? content.actionHref
      ? `<a href="${escapeHtml(content.actionHref)}" style="color: #1e4d8c; text-decoration: none;">${escapeHtml(content.actionLabel)}</a>`
      : `<span style="color: #1e4d8c;">${escapeHtml(content.actionLabel)}</span>`
    : "";
  const questionsHtml =
    content.showQuestions === false
      ? ""
      : `Questions: <a href="mailto:${escapeHtml(BRAND.email)}" style="color: #1e4d8c; text-decoration: none;">${escapeHtml(BRAND.email)}</a>`;

  if (content.footerOutsideCard) {
    const pieces = [actionHtml, questionsHtml].filter(Boolean);
    if (pieces.length === 0) return "";
    const body =
      pieces.length === 1
        ? pieces[0]
        : `${actionHtml}<span style="padding: 0 10px; color: #b8c0ce;">|</span>${questionsHtml}`;
    return `<p style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678;">
                  ${body}
                </p>`;
  }

  return `${
    actionHtml
      ? `<p style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678;">
                  ${actionHtml}
                </p>`
      : ""
  }${
    questionsHtml
      ? `<p style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678;">
                  ${questionsHtml}
                </p>`
      : ""
  }`;
}

function dividerHtml(): string {
  return `<hr style="border: none; border-top: 1px solid #d8dde6; margin: 24px 0 8px;" />`;
}

/** Matches supabase/templates/magic_link.html — Seton Spaces card on gray. */
export function renderSetonEmail(content: EmailContent): {
  html: string;
  text: string;
} {
  const detailsHtml = content.rows.map(rowHtml).join("");
  const fontSize = content.compactFooter || content.footerOutsideCard ? "13px" : "16px";
  const insideFooter = content.footerOutsideCard
    ? ""
    : footerParts(content, fontSize, "20px");
  const outsideFooter = content.footerOutsideCard
    ? footerParts(content, fontSize, "16px")
    : "";
  const headingHtml = content.heading
    ? `<p style="margin: 28px 0 0; font-size: 22px; font-weight: 600; color: #1a2332;">
                  ${escapeHtml(content.heading)}
                </p>`
    : "";
  const introHtml = content.intro
    ? `<p style="margin: 20px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678;">
                  ${escapeHtml(content.intro)}
                </p>`
    : "";
  const introAfterHtml = content.introAfter
    ? `<p style="margin: 12px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678;">
                  ${escapeHtml(content.introAfter)}
                </p>`
    : "";
  const dividerBeforeHtml = content.dividerBeforeRows ? dividerHtml() : "";
  const codeHtml = content.code
    ? `<p style="margin: 16px 0 0; font-size: 36px; letter-spacing: 0.28em; font-weight: 600; color: #1a2332;">
                  ${escapeHtml(content.code)}
                </p>`
    : "";
  const dividerAfterCodeHtml = content.dividerAfterCode ? dividerHtml() : "";
  const codeCaptionHtml = content.codeCaption
    ? `<p style="margin: 16px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678;">
                  ${escapeHtml(content.codeCaption)}
                </p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin: 0; padding: 0; background: #f7f8fa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f7f8fa">
      <tr>
        <td align="center" style="padding: 40px 16px">
          <table role="presentation" width="420" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid #d8dde6; border-radius: 12px;">
            <tr>
              <td style="padding: 40px 32px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; text-align: center;">
                ${brandHeaderHtml(content.logoSrc)}
                ${headingHtml}
                ${introHtml}
                ${introAfterHtml}
                ${dividerBeforeHtml}
                ${codeHtml}
                ${dividerAfterCodeHtml}
                ${codeCaptionHtml}
                ${detailsHtml}
                ${insideFooter}
              </td>
            </tr>
          </table>
          ${outsideFooter}
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textRows = content.rows
    .map((row) =>
      row.stacked ? `${row.label}\n${row.value}` : `${row.label}: ${row.value}`,
    )
    .join("\n");

  const text = [
    BRAND.name,
    ...(content.heading ? [content.heading] : []),
    "",
    content.intro,
    ...(content.introAfter ? [content.introAfter] : []),
    "",
    ...(content.code ? [content.code] : []),
    ...(content.codeCaption ? [content.codeCaption, ""] : content.code ? [""] : []),
    textRows,
    "",
    ...(content.actionLabel
      ? [
          content.actionHref
            ? `${content.actionLabel}: ${content.actionHref}`
            : content.actionLabel,
        ]
      : []),
    ...(content.showQuestions === false ? [] : [`Questions: ${BRAND.email}`]),
  ].join("\n");

  return { html, text };
}
