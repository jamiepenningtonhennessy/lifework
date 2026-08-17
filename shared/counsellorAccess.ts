export type LifeworkUserRole = "user" | "counselor" | "admin";

/** Both master administrators and standard counsellors may enter the counsellor workspace. */
export function canEnterCounsellorWorkspace(role: LifeworkUserRole | undefined): boolean {
  return role === "admin" || role === "counselor";
}

/** Only the master administrator can currently view client records. */
export function canAccessClientRecords(role: LifeworkUserRole | undefined): boolean {
  return role === "admin";
}
