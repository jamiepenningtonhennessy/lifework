const LEGACY_LIFEWORK_HOSTS = new Set([
  "penningtonhennessy.com",
  "www.penningtonhennessy.com",
]);
const LEGACY_LIFEWORK_PREFIX = "/coaching/lifework";

/** Selects the visitor-facing hostname when the app is behind a reverse proxy. */
export function getOriginalRequestHostname(headers: {
  host?: string | undefined;
  forwardedHost?: string | undefined;
  originalHost?: string | undefined;
}): string | undefined {
  return headers.forwardedHost?.split(",")[0].trim()
    || headers.originalHost?.split(",")[0].trim()
    || headers.host;
}

/** Returns the standalone Lifework URL for the retired PH entry point, or null for all other requests. */
export function getLegacyLifeworkRedirectUrl(
  hostname: string | undefined,
  pathname: string,
  search: string = ""
): string | null {
  const normalizedHost = hostname?.split(":")[0].toLowerCase();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (!normalizedHost || !LEGACY_LIFEWORK_HOSTS.has(normalizedHost)) {
    return null;
  }

  if (
    normalizedPath !== LEGACY_LIFEWORK_PREFIX
    && !normalizedPath.startsWith(`${LEGACY_LIFEWORK_PREFIX}/`)
  ) {
    return null;
  }

  const destinationPath = normalizedPath.slice(LEGACY_LIFEWORK_PREFIX.length) || "/";
  return `https://lifeworkpath.com${destinationPath}${search}`;
}
