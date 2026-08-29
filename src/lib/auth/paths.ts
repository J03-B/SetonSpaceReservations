const FALLBACK = "/";

/** Allow only in-app relative paths to prevent open redirects. */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = FALLBACK,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  return value;
}
