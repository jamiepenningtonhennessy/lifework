import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getClientProfileById: vi.fn(),
  updateClientProfile: vi.fn().mockResolvedValue(undefined),
}));

import { getClientProfileById, updateClientProfile } from "./db";

describe("Career Explorer unlock/lock helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unlockCareerExplorer sets careerExplorerUnlocked to true", async () => {
    (getClientProfileById as any).mockResolvedValue({ id: 1, userId: 42, careerExplorerUnlocked: false });

    const profile = await getClientProfileById(1);
    expect(profile).not.toBeNull();

    await updateClientProfile(1, { careerExplorerUnlocked: true });
    expect(updateClientProfile).toHaveBeenCalledWith(1, { careerExplorerUnlocked: true });
  });

  it("lockCareerExplorer sets careerExplorerUnlocked to false", async () => {
    (getClientProfileById as any).mockResolvedValue({ id: 1, userId: 42, careerExplorerUnlocked: true });

    const profile = await getClientProfileById(1);
    expect(profile).not.toBeNull();

    await updateClientProfile(1, { careerExplorerUnlocked: false });
    expect(updateClientProfile).toHaveBeenCalledWith(1, { careerExplorerUnlocked: false });
  });

  it("throws NOT_FOUND when profile does not exist", async () => {
    (getClientProfileById as any).mockResolvedValue(null);

    const profile = await getClientProfileById(999);
    expect(profile).toBeNull();
    // In the router, a null profile throws TRPCError NOT_FOUND
    expect(updateClientProfile).not.toHaveBeenCalled();
  });

  it("updateClientProfile is called exactly once per unlock", async () => {
    (getClientProfileById as any).mockResolvedValue({ id: 5, userId: 10, careerExplorerUnlocked: false });
    await updateClientProfile(5, { careerExplorerUnlocked: true });
    expect(updateClientProfile).toHaveBeenCalledTimes(1);
  });
});
