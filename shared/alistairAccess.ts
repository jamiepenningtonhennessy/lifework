/** The counsellor’s Role Specification unlock is also the permission gate for client Alistair guidance. */
export function canClientAccessAlistair(careerExplorerUnlocked: unknown): boolean {
  return careerExplorerUnlocked === true || careerExplorerUnlocked === 1 || careerExplorerUnlocked === "1";
}
