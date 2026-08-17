export const STANDALONE_LIFEWORK_HOSTS = [
  "lifeworkpath.com",
  "www.lifeworkpath.com",
  "lifework.manus.space",
  "plumtrees-kfbbe6kq.manus.space",
] as const;

const MANAGED_PREVIEW_HOSTNAME_PATTERN = /^3000-[a-z0-9-]+\.us\d+\.manus\.computer$/;
const MANAGED_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Returns whether a hostname should open the standalone Lifework experience. */
export function isStandaloneLifeworkHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;

  const normalizedHostname = hostname.toLowerCase();
  return STANDALONE_LIFEWORK_HOSTS.includes(normalizedHostname as typeof STANDALONE_LIFEWORK_HOSTS[number])
    || MANAGED_PREVIEW_HOSTNAME_PATTERN.test(normalizedHostname)
    || MANAGED_PREVIEW_HOSTS.has(normalizedHostname);
}

/** Browser-safe runtime check for the canonical Lifework hostnames. */
export function isStandaloneLifeworkDomain(): boolean {
  return typeof window !== "undefined" && isStandaloneLifeworkHostname(window.location.hostname);
}

/** Returns whether a hostname is one of the public Pennington Hennessy website hosts. */
export function isPenningtonHennessyHostname(hostname: string | null | undefined): boolean {
  return hostname === "penningtonhennessy.com" || hostname === "www.penningtonhennessy.com";
}

/** The correct public landing route for the hostname currently serving the application. */
export function lifeworkLandingPath(): string {
  return isStandaloneLifeworkDomain() ? "/" : "/coaching/lifework";
}
