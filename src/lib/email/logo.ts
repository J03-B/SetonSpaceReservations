import { getSupabaseUrl } from "@/lib/supabase/env";

export const EMAIL_BRAND_BUCKET = "brand";
export const EMAIL_BRAND_OBJECT = "logo.png";

/** Public Storage URL for email images. Independent of the Vercel site origin. */
export function emailLogoSrc(): string | undefined {
  const base = getSupabaseUrl()?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/storage/v1/object/public/${EMAIL_BRAND_BUCKET}/${EMAIL_BRAND_OBJECT}`;
}
