import { describe, expect, it } from "vitest";
import { isSupportedAlistairDocument } from "./pdf-extract";

describe("Alistair document upload support", () => {
  it("accepts text-based PDF and DOCX reports", () => {
    expect(isSupportedAlistairDocument("application/pdf")).toBe(true);
    expect(isSupportedAlistairDocument("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });

  it("rejects unsupported document types", () => {
    expect(isSupportedAlistairDocument("text/plain")).toBe(false);
    expect(isSupportedAlistairDocument("application/msword")).toBe(false);
  });
});
