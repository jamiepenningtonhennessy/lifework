/**
 * Tools reserved for the master counsellor view during the first staged rollout
 * of external counsellor access. This controls navigation visibility only; the
 * later ownership phase will add server-side data access restrictions.
 */
export const STANDARD_COUNSELLOR_HIDDEN_CLIENT_PROFILE_TABS = new Set([
  "report",
  "virtual-peter",
  "role-decoder",
  "linkedin-rewriter",
  "jobs",
]);

export function isClientProfileTabVisible(
  tabId: string,
  view: "master" | "standard-counsellor",
): boolean {
  return view === "master" || !STANDARD_COUNSELLOR_HIDDEN_CLIENT_PROFILE_TABS.has(tabId);
}
