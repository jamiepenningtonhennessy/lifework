import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  FAMILY_FIELD_LABELS,
  FAMILY_REQUIRED_FIELDS,
  getFamilyBackgroundCompletion,
  type FamilyBackgroundData,
} from "../shared/familyBackground";

// Never import the actual DB module: every helper is replaced, including any
// helper used by a nested router. Unexpected calls fail closed, not against DB.
vi.mock("./db", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
  const names = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map(match => match[1]);
  return Object.fromEntries(names.map(name => [name, vi.fn(() => {
    throw new Error(`Unexpected mocked database helper: ${name}`);
  })]));
});
vi.mock("pdf-parse", () => ({ default: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(() => { throw new Error("No LLM calls allowed"); }) }));
vi.mock("./storage", () => ({ storagePut: vi.fn(() => { throw new Error("No uploads allowed"); }) }));
vi.mock("../shared/via-data", async importOriginal => ({
  ...await importOriginal<typeof import("../shared/via-data")>(),
  scoreVia: vi.fn(),
}));
vi.mock("../shared/ipip-data", async importOriginal => ({
  ...await importOriginal<typeof import("../shared/ipip-data")>(),
  scoreIpip: vi.fn(),
}));

import * as db from "./db";
import { scoreVia } from "../shared/via-data";
import { scoreIpip } from "../shared/ipip-data";
import { appRouter } from "./routers";

const fullFamily: FamilyBackgroundData = Object.fromEntries(
  FAMILY_REQUIRED_FIELDS.map(field => [field, "Not known"]),
);
const profile = {
  id: 900001,
  userId: 900002,
  firstName: "Synthetic",
  backgroundStatus: "not_started",
  sageStatus: "completed",
  viaStatus: "not_started",
  ipipStatus: "not_started",
};
const ctx = {
  user: {
    id: profile.userId,
    openId: "family-regression-synthetic",
    email: "synthetic@example.com",
    name: "Synthetic Client",
    role: "user",
    loginMethod: "manus",
    createdAt: new Date(0), updatedAt: new Date(0), lastSignedIn: new Date(0),
  },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;
const caller = appRouter.createCaller(ctx);
const adminCaller = appRouter.createCaller({ ...ctx, user: { ...ctx.user!, role: "admin" } });

function setFamily(family: FamilyBackgroundData | null) {
  vi.mocked(db.getFamilyBackground).mockResolvedValue(family as any);
}
function expectNoQuestionnaireWritesOrScoring() {
  expect(scoreVia).not.toHaveBeenCalled();
  expect(scoreIpip).not.toHaveBeenCalled();
  expect(db.upsertViaResults).not.toHaveBeenCalled();
  expect(db.upsertIpipResults).not.toHaveBeenCalled();
  expect(db.updateClientProfile).not.toHaveBeenCalled();
  expect(db.getOrCreateClientProfile).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getOrCreateClientProfile).mockResolvedValue({ ...profile } as any);
  vi.mocked(db.getClientProfileByUserId).mockResolvedValue({ ...profile } as any);
  vi.mocked(db.getClientProfileById).mockResolvedValue({ ...profile } as any);
  setFamily(null);
  vi.mocked(db.getEnrichmentCounts).mockResolvedValue({ total: 20, enriched: 0 });
  vi.mocked(db.upsertFamilyBackground).mockResolvedValue(undefined);
  vi.mocked(db.updateClientProfile).mockResolvedValue(undefined);
  vi.mocked(db.upsertCareer).mockResolvedValue(900003);
  vi.mocked(db.upsertViaResults).mockResolvedValue(undefined);
  vi.mocked(db.upsertIpipResults).mockResolvedValue(undefined);
  vi.mocked(db.getAchievements).mockResolvedValue([]);
  vi.mocked(db.getEducationHistory).mockResolvedValue([]);
  vi.mocked(db.getCareerHistory).mockResolvedValue([]);
  vi.mocked(db.getInterviewMessages).mockResolvedValue([]);
  vi.mocked(db.getChatSessionsByClient).mockResolvedValue([]);
  vi.mocked(db.getViaResults).mockResolvedValue(null);
  vi.mocked(db.getIpipResults).mockResolvedValue(null);
  vi.mocked(db.getAnalysisReport).mockResolvedValue(null);
  vi.mocked(scoreVia).mockReturnValue([{ strengthId: "creativity", name: "Creativity", score: 4, rank: 1 }] as any);
  vi.mocked(scoreIpip).mockReturnValue({ domainScores: {}, facetScores: {} } as any);
});

describe("shared family completion", () => {
  it("exports precisely the six required fields with English labels", () => {
    expect(FAMILY_REQUIRED_FIELDS).toEqual([
      "fatherOccupation", "motherOccupation", "siblingPosition", "upbringingLocation",
      "familyNarrative", "significantInfluences",
    ]);
    expect(Object.keys(FAMILY_FIELD_LABELS)).toEqual([...FAMILY_REQUIRED_FIELDS]);
    for (const label of Object.values(FAMILY_FIELD_LABELS)) expect(label.trim().length).toBeGreaterThan(0);
  });
  it.each([null, undefined, {}])("reports all fields for missing data: %j", data => {
    expect(getFamilyBackgroundCompletion(data)).toEqual({ complete: false, missingFields: FAMILY_REQUIRED_FIELDS });
  });
  it("returns stable missing keys for partial drafts", () => {
    expect(getFamilyBackgroundCompletion({ fatherOccupation: " Teacher ", siblingPosition: "\t" })).toEqual({
      complete: false, missingFields: FAMILY_REQUIRED_FIELDS.slice(1),
    });
  });
  it.each(FAMILY_REQUIRED_FIELDS)("treats null/empty/whitespace %s as missing", field => {
    for (const value of [null, "", " \n\t "]) {
      expect(getFamilyBackgroundCompletion({ ...fullFamily, [field]: value })).toEqual({ complete: false, missingFields: [field] });
    }
  });
  it.each(["Not known", "Not applicable", "Prefer not to say"])("accepts explicit '%s' for every required field", value => {
    const data = Object.fromEntries(FAMILY_REQUIRED_FIELDS.map(field => [field, ` ${value} `]));
    expect(getFamilyBackgroundCompletion(data)).toEqual({ complete: true, missingFields: [] });
  });
});

describe("family draft and completion mutations", () => {
  it("permits partial drafts by default and marks them in progress", async () => {
    const result = await caller.background.saveFamily({ fatherOccupation: " Teacher " });
    expect(db.upsertFamilyBackground).toHaveBeenCalledWith({ clientId: profile.id, fatherOccupation: "Teacher" });
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { backgroundStatus: "in_progress" });
    expect(result).toMatchObject({ success: true, backgroundStatus: "in_progress", familyBackgroundCompleted: false });
    expect(result.familyBackgroundMissingFields).toEqual(FAMILY_REQUIRED_FIELDS.slice(1));
  });
  it("preserves omitted fields, merges saved data and excludes complete from persistence", async () => {
    setFamily(fullFamily);
    const result = await caller.background.saveFamily({ fatherOccupation: "Not applicable", complete: true });
    expect(db.upsertFamilyBackground).toHaveBeenCalledWith({ clientId: profile.id, fatherOccupation: "Not applicable" });
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { backgroundStatus: "completed" });
    expect(result).toMatchObject({ familyBackgroundCompleted: true, familyBackgroundMissingFields: [] });
  });
  it.each([false, true])("marks full family completed with complete=%s and no CV/career", async complete => {
    const result = await caller.background.saveFamily({ ...fullFamily, complete } as any);
    expect(result.backgroundStatus).toBe("completed");
    expect(db.getCareerHistory).not.toHaveBeenCalled();
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { backgroundStatus: "completed" });
  });
  it("validates merged saved data when the last missing field is submitted", async () => {
    setFamily({ ...fullFamily, significantInfluences: null });
    const result = await caller.background.saveFamily({ significantInfluences: "Prefer not to say", complete: true });
    expect(result.familyBackgroundCompleted).toBe(true);
  });
  it("permits empty initial drafts but never claims completion", async () => {
    expect((await caller.background.saveFamily({ complete: false })).backgroundStatus).toBe("in_progress");
  });
  it.each([null, { fatherOccupation: "Not known" }])("rejects incomplete completion requests before any writes: %j", async family => {
    setFamily(family);
    await expect(caller.background.saveFamily({ complete: true })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("family background fields") });
    expect(db.upsertFamilyBackground).not.toHaveBeenCalled();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
    expect(db.getOrCreateClientProfile).not.toHaveBeenCalled();
  });
  it("does not create a profile for an invalid first completion request", async () => {
    vi.mocked(db.getClientProfileByUserId).mockResolvedValue(null);
    await expect(caller.background.saveFamily({ complete: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getOrCreateClientProfile).not.toHaveBeenCalled();
    expect(db.upsertFamilyBackground).not.toHaveBeenCalled();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it.each(FAMILY_REQUIRED_FIELDS)("rejects accidental blank overwrite of %s even for drafts", async field => {
    setFamily(fullFamily);
    for (const complete of [false, true]) {
      await expect(caller.background.saveFamily({ [field]: " \n\t ", complete })).rejects.toMatchObject({
        code: "BAD_REQUEST", message: expect.stringContaining("cannot be replaced with a blank"),
      });
    }
    expect(db.upsertFamilyBackground).not.toHaveBeenCalled();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it("does not update backgroundStatus if the family write fails", async () => {
    vi.mocked(db.upsertFamilyBackground).mockRejectedValueOnce(new Error("Synthetic write failure"));
    await expect(caller.background.saveFamily(fullFamily as any)).rejects.toThrow("Synthetic write failure");
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it("repairs a stale completed status when saving an incomplete draft", async () => {
    vi.mocked(db.getClientProfileByUserId).mockResolvedValue({ ...profile, backgroundStatus: "completed" } as any);
    await caller.background.saveFamily({ familyNarrative: "Synthetic draft" });
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { backgroundStatus: "in_progress" });
  });
});

describe("career saves cannot bypass compulsory family", () => {
  it.each([null, { fatherOccupation: "Not known" }, fullFamily])("derives status from family when saving career: %j", async family => {
    setFamily(family);
    const expected = getFamilyBackgroundCompletion(family).complete ? "completed" : "in_progress";
    // Also repairs a legacy completed flag that came from optional career data.
    vi.mocked(db.getOrCreateClientProfile).mockResolvedValue({ ...profile, backgroundStatus: "completed" } as any);
    await caller.background.saveCareer({ organisation: "Synthetic organisation" });
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { backgroundStatus: expected });
  });
  it.each([null, { fatherOccupation: "Not known" }, fullFamily])("derives status from family when saving reflection: %j", async family => {
    setFamily(family);
    await caller.background.saveCareerReflection({ careerReflection: "Synthetic reflection" });
    expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, {
      careerReflection: "Synthetic reflection",
      backgroundStatus: getFamilyBackgroundCompletion(family).complete ? "completed" : "in_progress",
    });
  });
  it("does not update status if career save fails", async () => {
    vi.mocked(db.upsertCareer).mockRejectedValueOnce(new Error("Synthetic career write failure"));
    await expect(caller.background.saveCareer({ organisation: "Synthetic" })).rejects.toThrow();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
});

describe("new and resubmitted direct questionnaire mutations", () => {
  const questionnaires = [
    { name: "VIA", submit: () => caller.via.submitSurvey({ answers: { "1": 4 } }), score: scoreVia, write: db.upsertViaResults, status: "viaStatus" },
    { name: "IPIP", submit: () => caller.ipip.submit({ answers: { "1": 4 } }), score: scoreIpip, write: db.upsertIpipResults, status: "ipipStatus" },
  ];
  for (const questionnaire of questionnaires) {
    it.each(["not_started", "completed"])(`${questionnaire.name} blocks missing family before scoring/writes even with status=%s`, async status => {
      vi.mocked(db.getClientProfileByUserId).mockResolvedValue({ ...profile, backgroundStatus: "completed", [questionnaire.status]: status } as any);
      await expect(questionnaire.submit()).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("six family background fields") });
      expectNoQuestionnaireWritesOrScoring();
    });
    it.each(FAMILY_REQUIRED_FIELDS)(`${questionnaire.name} blocks missing %s before scoring/writes`, async field => {
      setFamily({ ...fullFamily, [field]: "  " });
      await expect(questionnaire.submit()).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoQuestionnaireWritesOrScoring();
    });
    it(`${questionnaire.name} accepts full family without optional career/CV/enrichment`, async () => {
      setFamily(fullFamily);
      await expect(questionnaire.submit()).resolves.toMatchObject({ success: true });
      expect(questionnaire.score).toHaveBeenCalledWith({ 1: 4 });
      expect(questionnaire.write).toHaveBeenCalledWith(expect.objectContaining({ clientId: profile.id, completedAt: expect.any(Date) }));
      expect(db.updateClientProfile).toHaveBeenCalledWith(profile.id, { [questionnaire.status]: "completed" });
    });
    it(`${questionnaire.name} blocks missing profiles without creating one`, async () => {
      vi.mocked(db.getClientProfileByUserId).mockResolvedValue(null);
      await expect(questionnaire.submit()).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoQuestionnaireWritesOrScoring();
    });
    it(`${questionnaire.name} retains events then Sage blocker precedence`, async () => {
      vi.mocked(db.getEnrichmentCounts).mockResolvedValueOnce({ total: 2, enriched: 0 });
      await expect(questionnaire.submit()).rejects.toMatchObject({ message: expect.stringContaining("at least 20 achievements") });
      vi.mocked(db.getClientProfileByUserId).mockResolvedValue({ ...profile, sageStatus: "not_started" } as any);
      await expect(questionnaire.submit()).rejects.toMatchObject({ message: expect.stringContaining("Sage life history conversation") });
      expectNoQuestionnaireWritesOrScoring();
    });
  }
});

describe("read-only completion metadata and legacy result compatibility", () => {
  it.each([null, { fatherOccupation: "Not known" }, fullFamily])("returns matching client and counsellor gates for family=%j", async family => {
    setFamily(family);
    const client = await caller.profile.getEnrichmentStatus();
    const counsellor = await adminCaller.counselor.getClientEnrichmentStatus({ clientId: profile.id });
    expect(client).toEqual(counsellor);
    expect(client).toMatchObject({
      enriched: 0,
      familyBackgroundCompleted: getFamilyBackgroundCompletion(family).complete,
      familyBackgroundMissingFields: getFamilyBackgroundCompletion(family).missingFields,
      unlocked: getFamilyBackgroundCompletion(family).complete,
    });
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it.each(["not_started", "in_progress", "completed"])("recognises saved complete family for client/counsellor with persisted status=%s, without writes", async backgroundStatus => {
    setFamily(fullFamily);
    vi.mocked(db.getOrCreateClientProfile).mockResolvedValue({ ...profile, backgroundStatus } as any);
    vi.mocked(db.getClientProfileById).mockResolvedValue({ ...profile, backgroundStatus } as any);
    expect(await caller.profile.getMyProfile()).toMatchObject({ backgroundStatus: "completed", familyBackgroundCompleted: true, familyBackgroundMissingFields: [] });
    expect((await adminCaller.counselor.getClientProfile({ clientId: profile.id })).profile).toMatchObject({ backgroundStatus: "completed", familyBackgroundCompleted: true });
    expect(db.updateClientProfile).not.toHaveBeenCalled();
    expect(db.upsertFamilyBackground).not.toHaveBeenCalled();
  });
  it("does not trust a legacy career-only completed flag in either profile query", async () => {
    vi.mocked(db.getOrCreateClientProfile).mockResolvedValue({ ...profile, backgroundStatus: "completed" } as any);
    vi.mocked(db.getClientProfileById).mockResolvedValue({ ...profile, backgroundStatus: "completed" } as any);
    expect(await caller.profile.getMyProfile()).toMatchObject({ backgroundStatus: "in_progress", familyBackgroundCompleted: false });
    expect((await adminCaller.counselor.getClientProfile({ clientId: profile.id })).profile).toMatchObject({ backgroundStatus: "in_progress", familyBackgroundCompleted: false });
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it("keeps completed VIA/IPIP results, questions, family and reports accessible with no family", async () => {
    const via = { clientId: profile.id, rankedStrengths: [{ name: "Synthetic strength" }] };
    const ipip = { clientId: profile.id, domainScores: { synthetic: 1 } };
    const report = { clientId: profile.id, fullReportMarkdown: "Synthetic existing report" };
    vi.mocked(db.getViaResults).mockResolvedValue(via as any);
    vi.mocked(db.getIpipResults).mockResolvedValue(ipip as any);
    vi.mocked(db.getAnalysisReport).mockResolvedValue(report as any);
    expect(await caller.via.getMyResults()).toEqual(via);
    expect(await caller.ipip.getMyResults()).toEqual(ipip);
    expect(await caller.analysis.getMyReport()).toEqual(report);
    expect((await caller.via.getQuestions()).questions.length).toBeGreaterThan(0);
    expect(await caller.background.getFamily()).toBeNull();
    const counsellor = await adminCaller.counselor.getClientProfile({ clientId: profile.id });
    expect(counsellor).toMatchObject({ via, ipip, report, family: null });
    expect(db.getEnrichmentCounts).not.toHaveBeenCalled();
    expect(scoreVia).not.toHaveBeenCalled();
    expect(scoreIpip).not.toHaveBeenCalled();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it("keeps the saved WOW report/PDF status accessible without family", async () => {
    vi.mocked(db.getAnalysisReport).mockResolvedValue({
      clientId: profile.id,
      wowReportJson: JSON.stringify({ summary: "Synthetic saved summary" }),
      wowReportStatus: "done",
      wowReportPdfUrl: "https://example.com/synthetic-existing.pdf",
    } as any);
    expect(await adminCaller.wowReport.get({ clientId: profile.id })).toMatchObject({
      exists: true,
      status: "done",
      pdfUrl: "https://example.com/synthetic-existing.pdf",
      sections: { summary: "Synthetic saved summary" },
    });
    expect(db.getFamilyBackground).not.toHaveBeenCalled();
    expect(db.getEnrichmentCounts).not.toHaveBeenCalled();
    expect(db.updateClientProfile).not.toHaveBeenCalled();
  });
  it("never invokes a real/raw DB helper", () => {
    expect(db.getDb).not.toHaveBeenCalled();
  });
});
