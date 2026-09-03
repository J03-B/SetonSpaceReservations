/**
 * Shared auth cookie domain (e.g. `.setonschool.net`) so Spaces and Help
 * can share a session. Only apply it when the current host actually matches;
 * browsers reject Domain=.setonschool.net cookies on `*.vercel.app`.
 */
export function getCookieDomain(hostname?: string): string | undefined {
  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (!configured) return undefined;

  const host = (
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : undefined)
  )
    ?.split(":")[0]
    ?.toLowerCase();

  if (!host) return undefined;

  const bare = configured.replace(/^\./, "").toLowerCase();
  if (host === bare || host.endsWith(`.${bare}`)) {
    return configured.startsWith(".") ? configured : `.${configured}`;
  }

  return undefined;
}

export function getAuthCookieOptions(hostname?: string) {
  const domain = getCookieDomain(hostname);
  const secure =
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  return {
    path: "/",
    sameSite: "lax" as const,
    secure,
    ...(domain ? { domain } : {}),
  };
}

/** Hosts that should 308 to the canonical school domain (shared cookies). */
export function getCanonicalOrigin(hostname: string): string | null {
  // Off until help/spaces DNS CNAMEs are live — otherwise vercel.app would 308 to a dead host.
  if (process.env.NEXT_PUBLIC_CANONICAL_REDIRECT !== "1") return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;

  let canonical: URL;
  try {
    canonical = new URL(siteUrl);
  } catch {
    return null;
  }

  const host = hostname.split(":")[0]?.toLowerCase();
  const canonicalHost = canonical.hostname.toLowerCase();
  if (!host || host === canonicalHost) return null;

  // Only bounce vercel.app / project aliases onto the school domain.
  const isVercelApp =
    host.endsWith(".vercel.app") || host === "vercel.app";
  if (!isVercelApp) return null;

  // Avoid redirect loops if SITE_URL is still a vercel URL.
  if (canonicalHost.endsWith(".vercel.app")) return null;

  return canonical.origin;
}
