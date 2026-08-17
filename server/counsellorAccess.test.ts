import { describe, expect, it } from "vitest";
import { canAccessClientRecords, canEnterCounsellorWorkspace } from "../shared/counsellorAccess";

describe("standard counsellor access boundary", () => {
  it("allows both master and standard counsellors into the counsellor workspace", () => {
    expect(canEnterCounsellorWorkspace("admin")).toBe(true);
    expect(canEnterCounsellorWorkspace("counselor")).toBe(true);
    expect(canEnterCounsellorWorkspace("user")).toBe(false);
  });

  it("keeps real client records master-only until client assignment is implemented", () => {
    expect(canAccessClientRecords("admin")).toBe(true);
    expect(canAccessClientRecords("counselor")).toBe(false);
    expect(canAccessClientRecords("user")).toBe(false);
  });
});
