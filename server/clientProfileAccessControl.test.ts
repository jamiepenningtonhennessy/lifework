import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientProfileSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ClientProfile.tsx"),
  "utf8"
);

describe("counsellor client access control", () => {
  it("clearly identifies the shared Alistair and Role Specification permission", () => {
    expect(clientProfileSource).toContain("Client Access: Alistair &amp; Role Specification");
    expect(clientProfileSource).toContain("Unlock Alistair &amp; Role Specification");
    expect(clientProfileSource).toContain("Lock Client Access");
    expect(clientProfileSource).toContain("Step 6: Explore with Alistair and Step 7: Role Specification");
  });

  it("uses the existing shared client-access mutations and acknowledges both capabilities", () => {
    expect(clientProfileSource).toContain("trpc.counselor.unlockCareerExplorer.useMutation");
    expect(clientProfileSource).toContain("trpc.counselor.lockCareerExplorer.useMutation");
    expect(clientProfileSource).toContain("Client access to Alistair and Role Specification unlocked.");
    expect(clientProfileSource).toContain("Client access to Alistair and Role Specification locked.");
  });
});
