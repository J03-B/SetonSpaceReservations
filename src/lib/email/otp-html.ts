import { BRAND } from "@/lib/brand";
import { renderSetonEmail } from "@/lib/email/layout";

export const SIGN_IN_OTP_INSTRUCTION = "Enter this code to sign in.";
export const SIGN_UP_OTP_INSTRUCTION =
  "Enter this code to finish creating your account.";

export function renderOtpEmailHtml(
  token: string,
  instruction: string,
  options: {
    heading: string;
    logoSrc?: string;
    origin?: string;
  },
): string {
  return renderSetonEmail({
    heading: options.heading,
    intro: "",
    rows: [{ label: "Code", value: token, code: true }],
    afterRows: instruction,
    logoSrc: options.logoSrc,
    dividerBeforeRows: true,
    footerOutsideCard: true,
    compactFooter: true,
    actionLabel: "Open Seton Spaces",
    actionHref: options.origin || BRAND.siteUrl,
  }).html;
}
