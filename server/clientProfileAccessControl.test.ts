import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientProfileSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ClientProfile.tsx"),
  "utf8"
);

describe("counsellor client access control", () => {
  it("clearly identifies the client-facing Alistair permission", () => {
    expect(clientProfileSource).toContain("Client Access: Explore with Alistair");
    expect(clientProfileSource).toContain("Unlock Alistair");
    expect(clientProfileSource).toContain("Lock Alistair");
    expect(clientProfileSource).toContain("Step 6: Explore with Alistair");
  });

  it("uses the existing client-access mutations and acknowledges Alistair access", () => {
    expect(clientProfileSource).toContain("trpc.counselor.unlockCareerExplorer.useMutation");
    expect(clientProfileSource).toContain("trpc.counselor.lockCareerExplorer.useMutation");
    expect(clientProfileSource).toContain("Client access to Alistair unlocked.");
    expect(clientProfileSource).toContain("Client access to Alistair locked.");
  });
});
