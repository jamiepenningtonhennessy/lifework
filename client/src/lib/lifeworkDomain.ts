export const STANDALONE_LIFEWORK_HOSTS = [
  "lifeworkpath.com",
  "www.lifeworkpath.com",
  "lifework.manus.space",
] as const;

/** Returns whether a hostname should open the standalone Lifework experience. */
export function isStandaloneLifeworkHostname(hostname: string | null | undefined): boolean {
  return !!hostname && STANDALONE_LIFEWORK_HOSTS.includes(hostname.toLowerCase() as typeof STANDALONE_LIFEWORK_HOSTS[number]);
}

/** Browser-safe runtime check for the canonical Lifework hostnames. */
export function isStandaloneLifeworkDomain(): boolean {
  return typeof window !== "undefined" && isStandaloneLifeworkHostname(window.location.hostname);
}

/** The correct public landing route for the hostname currently serving the application. */
export function lifeworkLandingPath(): string {
  return isStandaloneLifeworkDomain() ? "/" : "/coaching/lifework";
}
