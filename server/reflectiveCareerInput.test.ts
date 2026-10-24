import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const backgroundSource = readFileSync(resolve(process.cwd(), "client/src/pages/Background.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const reportSource = readFileSync(resolve(process.cwd(), "server/routers/wowReport.ts"), "utf8");

describe("reflective Career History input", () => {
  it("stores one client-owned career reflection on the client profile", () => {
    expect(schemaSource).toContain('careerReflection: text("careerReflection")');
    expect(routerSource).toContain("getCareerReflection: protectedProcedure");
    expect(routerSource).toContain("saveCareerReflection: protectedProcedure");
    expect(routerSource).toContain("careerReflection: z.string().max(10000)");
  });

  it("shows the reflective prompt rather than role cards and manual-entry controls", () => {
    expect(backgroundSource).toContain("Upload your CV</span>");
    expect(backgroundSource).not.toContain("optional alternative to filling in the form below");
    expect(backgroundSource).toContain("What you have really enjoyed in your career");
    expect(backgroundSource).toContain("Not the usual action-driven verbs of “achieved” and “led”");
    expect(backgroundSource).toContain("Save Career Reflections");
    expect(backgroundSource).not.toContain("Add Career Record");
    expect(backgroundSource).not.toContain("Or add each role manually");
  });

  it("supplies the reflection to Lifework report generation as client evidence", () => {
    expect(reportSource).toContain("--- CLIENT'S REFLECTIONS ON CAREER FULFILMENT ---");
    expect(reportSource).toContain("profile.careerReflection.trim()");
  });
});
