import { BRAND } from "@/lib/brand";
import { escapeHtml, escapeHtmlMultiline } from "@/lib/email/escape";

export const EMAIL_LOGO_CID = "seton-logo";

export type EmailCardTone = "neutral" | "pending" | "approved" | "declined";

export type EmailDetailRow = {
  label: string;
  value?: string;
  lines?: string[];
  multiline?: boolean;
  compact?: boolean;
  code?: boolean;
  tone?: EmailCardTone;
  dividerBefore?: boolean;
  copyable?: boolean;
};

export type EmailButtonRow = {
  buttons: Array<{
    label: string;
    href: string;
    kind: "approve" | "decline";
  }>;
};

export type EmailConflictItem = {
  status: string;
  who: string;
  when: string;
};

export type EmailConflictBlockRow = {
  label: string;
  conflicts: EmailConflictItem[];
};

export type EmailTimePart = {
  kind: Exclude<EmailCardTone, "neutral">;
  when: string;
};

export type EmailTimePartsRow = {
  label: string;
  combinedWhen?: string;
  parts: EmailTimePart[];
};

export type EmailRow =
  | EmailDetailRow
  | EmailButtonRow
  | EmailConflictBlockRow
  | EmailTimePartsRow;

export interface EmailContent {
  heading: string;
  intro: string;
  introAfter?: string;
  rows: EmailRow[];
  actionLabel?: string;
  actionHref?: string;
  /** Extra footer links (e.g. Help + Spaces). Shown before Questions when set. */
  actionLinks?: Array<{ label: string; href: string }>;
  showQuestions?: boolean;
  logoSrc?: string;
  /** Title next to logo. Defaults to BRAND.name. */
  brandName?: string;
  dividerBeforeRows?: boolean;
  footerOutsideCard?: boolean;
  compactFooter?: boolean;
  afterRows?: string;
}

function brandHeaderHtml(logoSrc?: string, brandName: string = BRAND.name): string {
  if (!logoSrc) {
    return `<p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e4d8c;">
                  ${escapeHtml(brandName)}
                </p>`;
  }

  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(BRAND.logoAlt)}" width="80" height="32" style="height: 32px; width: auto; display: block; border: 0; outline: none;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 15px; font-weight: 600; color: #1e4d8c;">
                      ${escapeHtml(brandName)}
                    </td>
                  </tr>
                </table>`;
}

function isButtonRow(row: EmailRow): row is EmailButtonRow {
  return "buttons" in row;
}

function isConflictBlockRow(row: EmailRow): row is EmailConflictBlockRow {
  return "conflicts" in row;
}

function isTimePartsRow(row: EmailRow): row is EmailTimePartsRow {
  return "parts" in row;
}

const CARD_TONES: Record<
  EmailCardTone,
  { background: string; border: string; accent: string; eyebrow: string }
> = {
  neutral: {
    background: "#f7f8fa",
    border: "#d8dde6",
    accent: "#5c6678",
    eyebrow: "",
  },
  pending: {
    background: "#fef6e0",
    border: "#9a6700",
    accent: "#9a6700",
    eyebrow: "Pending",
  },
  approved: {
    background: "#e8f5ee",
    border: "#1a7f4b",
    accent: "#1a7f4b",
    eyebrow: "Approved",
  },
  declined: {
    background: "#fdecea",
    border: "#b42318",
    accent: "#b42318",
    eyebrow: "Declined",
  },
};

function copyableIdHtml(label: string, value: string): string {
  const id = escapeHtml(value);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0;">
                  <tr>
                    <td valign="middle" width="1%" style="padding-right: 10px; font-size: 16px; line-height: 1.4; color: #5c6678; white-space: nowrap; text-align: left;">
                      ${escapeHtml(label)}
                    </td>
                    <td valign="middle" width="99%" align="center" style="padding: 6px 10px; border: 1px solid #d8dde6; border-radius: 10px; background: #f7f8fa; text-align: center;">
                      <span style="color: #1a2332; font-size: 11px; line-height: 1.4; -webkit-user-select: all; user-select: all;">${id}</span>
                    </td>
                  </tr>
                </table>`;
}

function fieldLabelHtml(label: string): string {
  return `<p align="center" style="margin: 16px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${escapeHtml(label)}
                </p>`;
}

function detailCardHtml(input: {
  tone?: EmailCardTone;
  eyebrow?: string;
  lines: string[];
  multiline?: boolean;
  compact?: boolean;
  code?: boolean;
}): string {
  const tone = CARD_TONES[input.tone ?? "neutral"];
  const isCode = Boolean(input.code);
  const size = input.compact ? "12px" : isCode ? "36px" : "16px";
  const nowrap = input.compact || isCode ? " white-space: nowrap;" : "";
  const weight = isCode ? " font-weight: 600;" : "";
  const tracking = isCode ? " letter-spacing: 0.28em;" : "";
  const eyebrow = input.eyebrow?.trim();
  const body = input.lines
    .map((line, index) => {
      const html = input.multiline
        ? escapeHtmlMultiline(line)
        : escapeHtml(line);
      const color =
        input.tone &&
        input.tone !== "neutral" &&
        !eyebrow &&
        index === 0 &&
        !input.multiline &&
        !isCode
          ? tone.accent
          : "#1a2332";
      const margin = eyebrow || index > 0 ? "6px 0 0" : "0";
      return `<p align="center" style="margin: ${margin}; font-size: ${size}; line-height: 1.5; color: ${color}; text-align: center;${nowrap}${weight}${tracking}">${html}</p>`;
    })
    .join("");
  const eyebrowHtml = eyebrow
    ? `<p align="center" style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${tone.accent}; text-align: center;">${escapeHtml(eyebrow)}</p>`
    : "";
  return `<table role="presentation" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; margin: 8px 0 0; border: 1px solid ${tone.border}; border-radius: 10px; background: ${tone.background};">
                  <tr>
                    <td align="center" style="padding: ${isCode ? "16px 14px" : "12px 14px"}; text-align: center;">
                      ${eyebrowHtml}${body}
                    </td>
                  </tr>
                </table>`;
}

function timePartCardHtml(part: EmailTimePart): string {
  return detailCardHtml({
    lines: [part.when],
  });
}

function conflictCardHtml(lines: string[]): string {
  return detailCardHtml({ lines });
}

function buttonHtml(button: EmailButtonRow["buttons"][number]): string {
  const background = button.kind === "approve" ? "#1a7f4b" : "#b42318";
  return `<a href="${escapeHtml(button.href)}" rel="noreferrer" style="display: inline-block; background: ${background}; color: #ffffff; font-size: 14px; font-weight: 600; line-height: 1.2; text-decoration: none; padding: 12px 18px; border-radius: 8px;">${escapeHtml(button.label)}</a>`;
}

function rowHtml(row: EmailRow): string {
  if (isButtonRow(row)) {
    const cells = row.buttons
      .map(
        (button) =>
          `<td align="center" style="padding: 0 6px;">${buttonHtml(button)}</td>`,
      )
      .join("");
    return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 24px auto 0;">
                  <tr>
                    ${cells}
                  </tr>
                </table>`;
  }

  if (isTimePartsRow(row)) {
    const combined = row.combinedWhen
      ? detailCardHtml({ lines: [row.combinedWhen] })
      : "";
    return `${fieldLabelHtml(row.label)}
                ${combined}
                ${row.parts.map(timePartCardHtml).join("")}`;
  }

  if (isConflictBlockRow(row)) {
    const cards =
      row.conflicts.length === 0
        ? conflictCardHtml(["None"])
        : row.conflicts
            .map((conflict) =>
              conflictCardHtml([conflict.status, conflict.who, conflict.when]),
            )
            .join("");
    return `${fieldLabelHtml(row.label)}
                ${cards}`;
  }

  const lines =
    row.lines && row.lines.length > 0
      ? row.lines
      : [row.value ?? ""];
  const divider = row.dividerBefore
    ? dividerHtml(row.copyable ? "24px 0 24px" : undefined)
    : "";
  if (row.copyable) {
    return `${divider}${copyableIdHtml(row.label, row.value ?? lines[0] ?? "")}`;
  }
  return `${divider}${fieldLabelHtml(row.label)}
                ${detailCardHtml({
                  tone: row.tone,
                  lines,
                  multiline: row.multiline,
                  compact: row.compact,
                  code: row.code,
                })}`;
}

function footerParts(content: EmailContent, fontSize: string, marginTop: string) {
  const linkPieces: string[] = [];
  if (content.actionLinks?.length) {
    for (const link of content.actionLinks) {
      linkPieces.push(
        `<a href="${escapeHtml(link.href)}" style="color: #1e4d8c; text-decoration: none;">${escapeHtml(link.label)}</a>`,
      );
    }
  } else if (content.actionLabel) {
    linkPieces.push(
      content.actionHref
        ? `<a href="${escapeHtml(content.actionHref)}" style="color: #1e4d8c; text-decoration: none;">${escapeHtml(content.actionLabel)}</a>`
        : `<span style="color: #1e4d8c;">${escapeHtml(content.actionLabel)}</span>`,
    );
  }
  const actionHtml = linkPieces.join(
    `<span style="padding: 0 10px; color: #b8c0ce;">|</span>`,
  );
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
    return `<p align="center" style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${body}
                </p>`;
  }

  return `${
    actionHtml
      ? `<p align="center" style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${actionHtml}
                </p>`
      : ""
  }${
    questionsHtml
      ? `<p align="center" style="margin: ${marginTop} 0 0; font-size: ${fontSize}; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${questionsHtml}
                </p>`
      : ""
  }`;
}

function dividerHtml(margin = "24px 0 8px"): string {
  return `<hr style="border: none; border-top: 1px solid #d8dde6; margin: ${margin};" />`;
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
    ? `<p align="center" style="margin: 28px 0 0; font-size: 22px; font-weight: 600; color: #1a2332; text-align: center;">
                  ${escapeHtml(content.heading)}
                </p>`
    : "";
  const introHtml = content.intro
    ? `<p align="center" style="margin: 20px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${escapeHtml(content.intro)}
                </p>`
    : "";
  const introAfterHtml = content.introAfter
    ? `<p align="center" style="margin: 12px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${escapeHtml(content.introAfter)}
                </p>`
    : "";
  const dividerBeforeHtml = content.dividerBeforeRows ? dividerHtml() : "";
  const hasCopyableId = content.rows.some(
    (row) => !("buttons" in row) && !("conflicts" in row) && !("parts" in row) && row.copyable,
  );
  const cardPadding = hasCopyableId ? "32px 20px 20px" : "32px 20px";
  const afterRowsHtml = content.afterRows
    ? `<p align="center" style="margin: 16px 0 0; font-size: 16px; line-height: 1.5; color: #5c6678; text-align: center;">
                  ${escapeHtml(content.afterRows)}
                </p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="margin: 0; padding: 0; width: 100%; background: #f7f8fa; -webkit-text-size-adjust: 100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; background: #f7f8fa;">
      <tr>
        <td align="center" style="padding: 24px 12px; text-align: center;">
          <table role="presentation" width="100%" align="center" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 420px; margin: 0 auto; background: #ffffff; border: 1px solid #d8dde6; border-radius: 12px;">
            <tr>
              <td align="center" style="padding: ${cardPadding}; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; text-align: center;">
                ${brandHeaderHtml(content.logoSrc, content.brandName)}
                ${headingHtml}
                ${introHtml}
                ${introAfterHtml}
                ${dividerBeforeHtml}
                ${detailsHtml}
                ${afterRowsHtml}
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
    .map((row) => {
      if (isButtonRow(row)) {
        return row.buttons
          .map((button) => `${button.label}: ${button.href}`)
          .join("\n");
      }
      if (isTimePartsRow(row)) {
        return [
          row.label,
          ...(row.combinedWhen ? [row.combinedWhen] : []),
          ...row.parts.map((part) => part.when),
        ].join("\n");
      }
      if (isConflictBlockRow(row)) {
        if (row.conflicts.length === 0) {
          return `${row.label}\nNone`;
        }
        return [
          row.label,
          ...row.conflicts.map(
            (conflict) =>
              `${conflict.status}\n${conflict.who}\n${conflict.when}`,
          ),
        ].join("\n\n");
      }
      const lines =
        row.lines && row.lines.length > 0
          ? row.lines
          : [row.value ?? ""];
      const body = [row.label, ...lines].join("\n");
      return row.dividerBefore ? `\n${body}` : body;
    })
    .join("\n");

  const text = [
    content.brandName ?? BRAND.name,
    ...(content.heading ? [content.heading] : []),
    "",
    content.intro,
    ...(content.introAfter ? [content.introAfter] : []),
    "",
    textRows,
    ...(content.afterRows ? ["", content.afterRows] : []),
    "",
    ...(content.actionLinks?.length
      ? content.actionLinks.map((link) => `${link.label}: ${link.href}`)
      : content.actionLabel
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
