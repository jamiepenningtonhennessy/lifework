const LEGACY_LIFEWORK_HOSTS = new Set([
  "penningtonhennessy.com",
  "www.penningtonhennessy.com",
]);

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

  if (normalizedPath !== "/coaching/lifework") {
    return null;
  }

  return `https://lifeworkpath.com/${search}`;
}
