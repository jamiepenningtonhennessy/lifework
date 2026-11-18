import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { getOrGenerateCanonicalStage1 } from "./routers/canonicalStage1";
import { storagePut } from "./storage";
import { generateMasterReportPdf } from "./masterReportPdf";
import { preflightReportPdf } from "./reportPdfPreflight";
import { buildClaudeExportJson } from "./routers/claudeExport";
import { renderHtmlReport } from "./html-report";
import { generateWheelPng } from "./routers/insightsWheelPng";
import { wowReportRouter } from "./routers/wowReport";
import { REPORT_CHAPTERS, reportStructureIssues } from "../shared/reportStructure";
import { reportVariantAnswerTail, VARIANT_AREA_HEADING_RULE } from "../shared/reportVariantAudience";
import { fourConditionsJson, makeVariantSections, REPORT_TEST_TYPES } from "./testing/reportVariantFixture";

// Never import the original DB module: every router database operation is fake.
vi.mock("./db", () => ({
  getClientProfileById: vi.fn(),
  getAchievements: vi.fn(),
  getFamilyBackground: vi.fn(),
  getEducationHistory: vi.fn(),
  getCareerHistory: vi.fn(),
  getViaResults: vi.fn(),
  getIpipResults: vi.fn(),
  getAnalysisReport: vi.fn(),
  upsertAnalysisReport: vi.fn(),
  clearAllWowPdfUrls: vi.fn(),
  insertReportGenerationLog: vi.fn(),
  getReportGenerationRuns: vi.fn(),
  getReportGenerationLogsByRunId: vi.fn(),
}));
vi.mock("./routers/canonicalStage1", () => ({
  getOrGenerateCanonicalStage1: vi.fn(),
  CANONICAL_SYSTEM_PROMPT: "Synthetic canonical system prompt",
  LIFE_HISTORY_PROMPT: "Synthetic canonical user prompt",
}));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./routers/claudeExport", () => ({ buildClaudeExportJson: vi.fn() }));
vi.mock("./html-report", () => ({ renderHtmlReport: vi.fn() }));
vi.mock("./masterReportPdf", () => ({ generateMasterReportPdf: vi.fn() }));
vi.mock("./reportPdfPreflight", () => ({ preflightReportPdf: vi.fn() }));
vi.mock("./routers/insightsWheelPng", () => ({ generateWheelPng: vi.fn() }));

const CLIENT_ID = -9999; // Deliberately synthetic; no real client data is read.
const ctx = {
  user: {
    id: CLIENT_ID, openId: "fictional-admin", name: "Fictional Admin",
    email: "test@example.invalid", role: "admin", loginMethod: "manus",
    createdAt: new Date(0), updatedAt: new Date(0), lastSignedIn: new Date(0),
  },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

type Fixture = ReturnType<typeof makeVariantSections>;
type OutputKey = "summary" | "viaSection" | "personalitySection" | "behaviouralStyle" | "careerDirections" | "developmentEdge" | "coachingQuestions" | "fourPillars";
type FakeRequest = {
  messages: Array<{ role: string; content: string }>;
  response_format?: { json_schema: { name: string; schema: { required: string[] } } };
};
const REQUIRED_FIELDS = [
  "summary", "lifeHistoryPattern", "fourPillars", "viaSection", "personalitySection",
  "behaviouralStyle", "developmentEdge", "coachingQuestions", "careerDirections",
];
let requests: Array<{ key: OutputKey; prompt: string; body: FakeRequest }>;
let stored: Record<string, unknown>;
let originalJson: string;
let fixture: Fixture;
let emptySection: OutputKey | undefined;

function outputKey(prompt: string): OutputKey {
  // Match instructions, not call order: the router authors sections in parallel.
  if (prompt.includes("You are writing the Four Conditions of Fulfilment chapter")) return "fourPillars";
  if (prompt.includes("Write the Lifework Summary")) return "summary";
  if (prompt.includes("Write the Character Strengths chapter")) return "viaSection";
  if (prompt.includes("Write the Personality Profile chapter")) return "personalitySection";
  if (prompt.startsWith("Primary colour energy:")) return "behaviouralStyle";
  if (prompt.includes("Write the Career Directions chapter")) return "careerDirections";
  if (prompt.includes("Write the Development Edge chapter")) return "developmentEdge";
  if (prompt.includes("Write the Conclusions chapter")) return "coachingQuestions";
  throw new Error(`Unexpected model prompt in isolated authoring test: ${prompt.slice(0, 100)}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  requests = [];
  emptySection = undefined;
  fixture = makeVariantSections();
  originalJson = JSON.stringify(fixture);
  stored = {
    clientId: CLIENT_ID, wowReportStatus: "done", wowReportJson: originalJson,
    wowReportPdfUrl: "https://example.invalid/previous-fictional-report.pdf",
    wowReportWritingStyle: "house", wowReportType: "standard",
  };

  // Fail closed on every fake DB entry point, then enable only expected reads/writes.
  for (const mock of Object.values(db)) {
    vi.mocked(mock as (...args: unknown[]) => unknown).mockImplementation(() => {
      throw new Error("Unexpected database operation in isolated authoring test");
    });
  }
  vi.mocked(db.getClientProfileById).mockResolvedValue({
    id: CLIENT_ID, firstName: "Fictional", lastName: "Review Client", pronouns: "they/them/their",
    currentRole: "Fictional project coordinator", currentOrg: "Fictional Workshop",
  } as any);
  vi.mocked(db.getAchievements).mockResolvedValue([
    { id: -1, title: "Fictional school project", description: "Organised a woodland project.", decade: "childhood", age: 12, esf: "enjoyable" },
    { id: -2, title: "Fictional community workshop", description: "Helped build a workshop.", decade: "twenties", age: 22, esf: "satisfying" },
    { id: -3, title: "Fictional mentoring project", description: "Taught a small volunteer group.", decade: "thirties", age: 32, esf: "fulfilling" },
  ] as any);
  vi.mocked(db.getFamilyBackground).mockResolvedValue(null as any);
  vi.mocked(db.getEducationHistory).mockResolvedValue([]);
  vi.mocked(db.getCareerHistory).mockResolvedValue([]);
  vi.mocked(db.getViaResults).mockResolvedValue({ rankedStrengths: JSON.stringify(fixture.viaRanked) } as any);
  vi.mocked(db.getIpipResults).mockResolvedValue({ domainScores: JSON.stringify(fixture.domainScores), facetScores: "{}" } as any);
  vi.mocked(db.getAnalysisReport).mockImplementation(async () => ({ ...stored }) as any);
  vi.mocked(db.upsertAnalysisReport).mockImplementation(async (update) => {
    stored = { ...stored, ...update };
  });
  vi.mocked(db.insertReportGenerationLog).mockResolvedValue(undefined as any);
  vi.mocked(getOrGenerateCanonicalStage1).mockImplementation(async () => fixture.lifeHistoryPattern);

  for (const mock of [invokeLLM, storagePut, buildClaudeExportJson, renderHtmlReport, generateMasterReportPdf, preflightReportPdf, generateWheelPng]) {
    vi.mocked(mock as (...args: unknown[]) => unknown).mockImplementation(() => {
      throw new Error("Unexpected model/render/storage call in isolated authoring test");
    });
  }
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as FakeRequest;
    const prompt = body.messages.find((message) => message.role === "user")?.content ?? "";
    const key = outputKey(prompt);
    requests.push({ key, prompt, body });
    const content = emptySection === key
      ? "   "
      : key === "fourPillars" ? JSON.stringify(fourConditionsJson()) : fixture[key];
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function assertNoRenderOrExternalModel() {
  for (const mock of [invokeLLM, storagePut, buildClaudeExportJson, renderHtmlReport, generateMasterReportPdf, preflightReportPdf, generateWheelPng]) {
    expect(mock).not.toHaveBeenCalled();
  }
}

describe.each(REPORT_TEST_TYPES)("isolated %s report authoring", (reportType) => {
  it("generates the same required sections and Four Conditions while preserving audience prompts", async () => {
    fixture = makeVariantSections(reportType);
    const result = await wowReportRouter.createCaller(ctx).generate({
      clientId: CLIENT_ID, reportType, writingStyle: "house", forceRegenerate: true,
    });
    expect(result).toMatchObject({ started: true, renderRequired: true, cached: false });
    expect(stored.wowReportStatus).toBe("pdf_pending");
    expect(stored.wowReportType).toBe(reportType);
    expect(stored.wowReportPdfUrl).toBe("https://example.invalid/previous-fictional-report.pdf");
    const authored = JSON.parse(stored.wowReportJson as string);
    expect(REPORT_CHAPTERS.map((chapter) => chapter.field)).toEqual(REQUIRED_FIELDS);
    for (const key of REQUIRED_FIELDS) expect(authored[key]?.trim(), key).toBeTruthy();
    expect(reportStructureIssues(authored)).toEqual([]);
    expect(authored.reportType).toBe(reportType);
    expect(authored.lifeHistoryPattern).toBe(fixture.lifeHistoryPattern);
    expect(getOrGenerateCanonicalStage1).toHaveBeenCalledOnce();
    expect(getOrGenerateCanonicalStage1).toHaveBeenCalledWith(CLIENT_ID);
    expect(fetch).toHaveBeenCalledTimes(8);
    expect(requests.map((request) => request.key).sort()).toEqual([
      "summary", "viaSection", "personalitySection", "behaviouralStyle", "careerDirections", "developmentEdge", "coachingQuestions", "fourPillars",
    ].sort());

    const fourConditions = requests.find((request) => request.key === "fourPillars")!;
    expect(fourConditions.prompt).toContain("Places, People, Problems, Procedures");
    expect(fourConditions.body.response_format?.json_schema.name).toBe("four_pillars");
    expect(fourConditions.body.response_format?.json_schema.schema.required).toEqual(["places", "people", "problems", "procedures", "combination"]);
    const conditionHeadings = [...authored.fourPillars.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(conditionHeadings).toEqual([
      "PLACES — Where Energy Was High", "PEOPLE — Who Was Present, and in What Role",
      "PROBLEMS — The Nature of the Challenge", "PROCEDURES — How the Work Was Done", "The Combination",
    ]);
    for (const key of ["places", "people", "problems", "procedures"] as const) {
      expect(authored.fourPillars).toContain(fourConditionsJson()[key].learning);
      expect(authored.fourPillars).toContain(fourConditionsJson()[key].example1);
      expect(authored.fourPillars).toContain(fourConditionsJson()[key].example2);
    }
    expect(db.insertReportGenerationLog).toHaveBeenCalledTimes(9);
    expect(vi.mocked(db.insertReportGenerationLog).mock.calls.map(([log]) => log.sectionKey).sort()).toEqual([
      "lifeHistoryPattern", "summary", "via", "personality", "behavioural", "career", "development", "fourPillars", "conclusions",
    ].sort());

    const conclusions = requests.find((request) => request.key === "coachingQuestions")!.prompt;
    for (const heading of ["Past", "Present", "Future", "Tell Me About Yourself"]) {
      expect(conclusions).toContain(`## ${heading}`);
    }
    expect(conclusions).toContain('Paragraph 1: Open with "I am fundamentally driven by:"');
    expect(conclusions).toContain("three bullet points (one line each)");
    expect(conclusions).toContain("Paragraph 2 (2-3 sentences): A forward-looking statement");
    expect(conclusions).toContain("under 60 seconds");
    expect(conclusions).not.toContain("under 90 seconds");
    expect(conclusions).not.toContain("Paragraph 3:");
    expect(conclusions).toContain("End with a single sentence of intent.");

    if (reportType === "standard") {
      // Standard stays on its existing default prompt, rather than the variant helper.
      expect(conclusions).toContain("This is the synthesis chapter");
      expect(conclusions).toContain("should be readable in under 60 seconds");
      expect(conclusions).not.toContain("exactly two prose paragraphs");
    } else {
      expect(conclusions.endsWith(reportVariantAnswerTail(reportType))).toBe(true);
      expect(conclusions).toContain("exactly two prose paragraphs plus three driver bullets");
      for (const key of ["careerDirections", "developmentEdge"] as const) {
        expect(requests.find((request) => request.key === key)!.prompt).toContain(VARIANT_AREA_HEADING_RULE);
      }
    }
    if (reportType === "student") {
      expect(conclusions).toContain("seed themes already visible in education, childhood, and early experiences");
      expect(conclusions).toContain("development priorities for the first 3 years");
      expect(conclusions).toContain("Even at this early stage, I have already shown...");
      expect(conclusions).toContain("demonstrated capability, not abstract potential");
      expect(requests.find((request) => request.key === "careerDirections")!.prompt).toContain("entry-level roles or graduate pathways");
    }
    if (reportType === "job_returner") {
      expect(conclusions).toContain("what the career break has added");
      expect(conclusions).toContain("what remains fully intact after the break");
      expect(conclusions).toContain("Before my career break, I built a track record in...");
      expect(conclusions).toContain("During that time, I also...");
      expect(conclusions).toContain("not an apology or a deficit");
      expect(requests.find((request) => request.key === "careerDirections")!.prompt).toContain("re-entry pathways");
    }
    if (reportType === "retirement") {
      expect(conclusions).toContain("reproduced and deepened across the decades");
      expect(conclusions).toContain("next chapter make possible");
      expect(conclusions).toContain("the question 'What are you doing now?'");
      expect(conclusions).toContain("lifetime of accumulated capability");
    } else {
      expect(conclusions).toContain("the interview question 'Tell me about yourself'");
    }
    assertNoRenderOrExternalModel();
  });

  it.each(["summary", "coachingQuestions", "fourPillars"] as const)("does not persist a replacement when %s output is empty", async (key) => {
    fixture = makeVariantSections(reportType);
    emptySection = key;
    await expect(wowReportRouter.createCaller(ctx).generate({
      clientId: CLIENT_ID, reportType, writingStyle: "house", forceRegenerate: true,
    })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(stored.wowReportStatus).toBe("error");
    expect(stored.wowReportJson).toBe(originalJson);
    expect(stored.wowReportPdfUrl).toBe("https://example.invalid/previous-fictional-report.pdf");
    expect(stored.wowReportType).toBe("standard");
    for (const [update] of vi.mocked(db.upsertAnalysisReport).mock.calls) {
      expect(update.wowReportStatus).not.toBe("pdf_pending");
      if (update.wowReportJson !== undefined) expect(update.wowReportJson).toBe(originalJson);
    }
    if (key !== "fourPillars") expect(stored.wowReportError).toContain("Report structure check failed");
    assertNoRenderOrExternalModel();
  });
});
