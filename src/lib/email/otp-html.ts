import { renderSetonEmail } from "@/lib/email/layout";

export const SIGN_IN_OTP_INSTRUCTION = "Enter this code to sign in.";
export const SIGN_UP_OTP_INSTRUCTION =
  "Enter this code to finish creating your account.";

const HELP_SITE_URL = "https://help.setonschool.net";
const SPACES_SITE_URL = "https://spaces.setonschool.net";

const AUTH_ACTION_LINKS = [
  { label: "Open Seton Help", href: HELP_SITE_URL },
  { label: "Open Seton Spaces", href: SPACES_SITE_URL },
] as const;

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
    brandName: "Seton School",
    actionLinks: [...AUTH_ACTION_LINKS],
    dividerBeforeRows: true,
    footerOutsideCard: true,
    compactFooter: true,
  }).html;
}
