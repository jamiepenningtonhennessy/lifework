import { describe, expect, it } from "vitest";
import { canClientAccessAlistair } from "../shared/alistairAccess";

describe("client Alistair access", () => {
  it("uses the counsellor Role Specification unlock as the client guidance gate", () => {
    expect(canClientAccessAlistair(true)).toBe(true);
    expect(canClientAccessAlistair(1)).toBe(true);
    expect(canClientAccessAlistair("1")).toBe(true);
  });

  it("keeps Alistair unavailable until the counsellor has authorised the feature", () => {
    expect(canClientAccessAlistair(false)).toBe(false);
    expect(canClientAccessAlistair(0)).toBe(false);
    expect(canClientAccessAlistair(undefined)).toBe(false);
  });
});
