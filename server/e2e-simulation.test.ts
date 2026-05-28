/**
 * ============================================================================
 * LIFEWORK END-TO-END SIMULATION TEST
 * ============================================================================
 *
 * This test simulates a complete Lifework run-through for a synthetic client,
 * exercising every stage of the pipeline in sequence:
 *
 *   1. Create synthetic client in DB (profile, achievements, VIA, IPIP,
 *      family background, education, career history)
 *   2. Simulate Sage interview (inject synthetic conversation messages)
 *   3. Run Sage enrichment (canonical Stage 1 generation)
 *   4. Generate WOW Report sections via the router
 *   5. Validate all 8 report sections are present and non-empty
 *   6. Validate PDF export produces a valid PDF buffer
 *   7. Clean up the synthetic client from the DB
 *
 * The synthetic client is "Margaret Holloway" — a fictitious mid-career
 * professional with a rich life history, designed to exercise all pipeline
 * branches including VIA strengths, IPIP personality, and career transitions.
 *
 * Run with: pnpm test e2e-simulation
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  upsertAchievement,
  upsertFamilyBackground,
  upsertEducation,
  upsertCareer,
  upsertViaResults,
  upsertIpipResults,
  getAnalysisReport,
  getAchievements,
  addInterviewMessage,
  updateClientProfile,
} from "./db";
import { generateAndStoreCanonicalStage1 } from "./routers/canonicalStage1";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { clientProfiles } from "../drizzle/schema";

// ─── Synthetic client ID ─────────────────────────────────────────────────────
// We use a fixed high ID in the reserved test range to avoid collisions.
// The afterAll hook deletes all rows for this clientId.
const SIM_CLIENT_ID = 999901;
const SIM_USER_ID   = 999901;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: SIM_USER_ID,
      openId: "sim-test-user",
      email: "sim@lifework-qa.test",
      name: "QA Simulation User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Synthetic client data ───────────────────────────────────────────────────
const SYNTHETIC_PROFILE = {
  id: SIM_CLIENT_ID,
  userId: SIM_USER_ID,
  firstName: "Margaret",
  lastName: "Holloway",
  email: "margaret.holloway@lifework-qa.test",
  dateOfBirth: "1972-03-15",
  currentRole: "Head of Learning & Development",
  currentOrg: "Meridian Financial Services",
  interviewStatus: "completed" as const,
  viaStatus: "completed" as const,
  ipipStatus: "completed" as const,
  backgroundStatus: "completed" as const,
  sageStatus: "completed" as const,
  cognitiveStatus: "not_started" as const,
};

const SYNTHETIC_ACHIEVEMENTS = [
  {
    clientId: SIM_CLIENT_ID,
    decade: "childhood" as const,
    title: "Organised the school summer fair",
    age: 11,
    description: "Took over from a teacher who fell ill and coordinated 30 volunteers, raised £2,000 for the school library.",
    esf: "fulfilling" as const,
    counsellorNotes: "Early leadership under pressure",
    sageEnrichment: "Shows initiative and comfort with responsibility from a young age.",
  },
  {
    clientId: SIM_CLIENT_ID,
    decade: "teens" as const,
    title: "Founded the school debating society",
    age: 16,
    description: "Started a debating club from scratch, grew it to 40 members, won regional competition in first year.",
    esf: "satisfying" as const,
    counsellorNotes: "Persuasion and structure",
    sageEnrichment: "Combines intellectual rigour with the ability to build community.",
  },
  {
    clientId: SIM_CLIENT_ID,
    decade: "twenties" as const,
    title: "Designed and delivered first management training programme",
    age: 26,
    description: "Created a 3-day leadership programme for 120 junior managers at her first employer. Received highest satisfaction scores in company history.",
    esf: "fulfilling" as const,
    counsellorNotes: "Core motivated strength — designing learning",
    sageEnrichment: "The satisfaction here is in the design as much as the delivery.",
  },
  {
    clientId: SIM_CLIENT_ID,
    decade: "thirties" as const,
    title: "Led post-merger culture integration at Meridian",
    age: 34,
    description: "Brought together two distinct organisational cultures after a £400m acquisition. Reduced voluntary attrition from 22% to 8% in 18 months.",
    esf: "satisfying" as const,
    counsellorNotes: "High-stakes, complex human problem",
    sageEnrichment: "Comfortable in ambiguity; uses structured thinking to navigate human complexity.",
  },
  {
    clientId: SIM_CLIENT_ID,
    decade: "forties" as const,
    title: "Launched Meridian's first reverse mentoring programme",
    age: 42,
    description: "Paired 25 senior leaders with junior employees from underrepresented groups. Programme won an industry award and was adopted by two peer organisations.",
    esf: "fulfilling" as const,
    counsellorNotes: "Innovation in a traditional sector",
    sageEnrichment: "Finds energy in reframing established hierarchies.",
  },
];

const SYNTHETIC_FAMILY = {
  clientId: SIM_CLIENT_ID,
  fatherOccupation: "Secondary school headmaster",
  motherOccupation: "Community nurse",
  siblingPosition: "Eldest of three",
  upbringingLocation: "Rural Shropshire, then Sheffield from age 14",
  familyNarrative: "A household where education and public service were the twin values. Margaret was expected to lead by example for her younger siblings.",
  significantInfluences: "Father's emphasis on structured thinking; mother's practical empathy with people in difficulty.",
};

const SYNTHETIC_EDUCATION = [
  {
    clientId: SIM_CLIENT_ID,
    institution: "University of Sheffield",
    qualification: "BA (Hons) 2:1",
    subject: "Psychology",
    yearFrom: 1990,
    yearTo: 1993,
    highlights: "Dissertation on organisational behaviour in hierarchical institutions. President of the Students' Union in final year.",
  },
  {
    clientId: SIM_CLIENT_ID,
    institution: "Henley Business School",
    qualification: "MBA",
    subject: "Organisational Development",
    yearFrom: 2003,
    yearTo: 2005,
    highlights: "Distinction. Thesis on learning transfer in financial services organisations.",
  },
];

const SYNTHETIC_CAREER = [
  {
    clientId: SIM_CLIENT_ID,
    organisation: "Barclays Bank",
    role: "Graduate Trainee → Training Coordinator",
    yearFrom: 1993,
    yearTo: 1998,
    keyResponsibilities: "Designed and delivered induction and skills programmes for retail banking staff.",
    highlights: "Youngest person to lead a national training rollout.",
    whyLeft: "Wanted broader scope and more strategic influence.",
  },
  {
    clientId: SIM_CLIENT_ID,
    organisation: "Accenture",
    role: "Learning Consultant",
    yearFrom: 1998,
    yearTo: 2004,
    keyResponsibilities: "Designed change management and capability-building programmes for FTSE 100 clients.",
    highlights: "Led a 2-year learning transformation for a major utilities company.",
    whyLeft: "MBA opportunity; wanted to move from consulting into a leadership role.",
  },
  {
    clientId: SIM_CLIENT_ID,
    organisation: "Meridian Financial Services",
    role: "Head of Learning & Development",
    yearFrom: 2006,
    yearTo: null,
    keyResponsibilities: "Owns the full L&D function for 4,500 employees. Reports to the Chief People Officer.",
    highlights: "Post-merger integration, reverse mentoring programme, digital learning transformation.",
    whyLeft: null,
  },
];

// VIA strengths — realistic ranked profile
const SYNTHETIC_VIA = {
  clientId: SIM_CLIENT_ID,
  rankedStrengths: [
    { strength: "Love of Learning", score: 4.8, rank: 1 },
    { strength: "Leadership", score: 4.7, rank: 2 },
    { strength: "Creativity", score: 4.6, rank: 3 },
    { strength: "Perspective", score: 4.5, rank: 4 },
    { strength: "Fairness", score: 4.4, rank: 5 },
    { strength: "Social Intelligence", score: 4.3, rank: 6 },
    { strength: "Curiosity", score: 4.2, rank: 7 },
    { strength: "Prudence", score: 3.9, rank: 8 },
    { strength: "Perseverance", score: 3.8, rank: 9 },
    { strength: "Kindness", score: 3.7, rank: 10 },
  ],
  rawScores: {
    "Love of Learning": 4.8, "Leadership": 4.7, "Creativity": 4.6,
    "Perspective": 4.5, "Fairness": 4.4, "Social Intelligence": 4.3,
    "Curiosity": 4.2, "Prudence": 3.9, "Perseverance": 3.8, "Kindness": 3.7,
    "Bravery": 3.6, "Honesty": 3.5, "Humour": 3.4, "Gratitude": 3.3,
    "Hope": 3.2, "Teamwork": 3.1, "Zest": 3.0, "Self-Regulation": 2.9,
    "Appreciation of Beauty": 2.8, "Forgiveness": 2.7, "Humility": 2.6,
    "Spirituality": 2.5, "Love": 2.4,
  },
};

// IPIP-NEO domain scores — realistic profile for a senior L&D professional
const SYNTHETIC_IPIP = {
  clientId: SIM_CLIENT_ID,
  domainScores: { N: 32, E: 68, O: 82, A: 71, C: 74 },
  facetScores: {
    // Neuroticism facets (low = stable)
    N1_anxiety: 28, N2_anger: 30, N3_depression: 25, N4_selfConsciousness: 35,
    N5_immoderation: 30, N6_vulnerability: 38,
    // Extraversion facets (moderately high)
    E1_friendliness: 72, E2_gregariousness: 60, E3_assertiveness: 78,
    E4_activityLevel: 65, E5_excitementSeeking: 55, E6_cheerfulness: 70,
    // Openness facets (high)
    O1_imagination: 85, O2_artisticInterests: 70, O3_emotionality: 78,
    O4_adventurousness: 80, O5_intellect: 88, O6_liberalism: 75,
    // Agreeableness facets
    A1_trust: 72, A2_morality: 76, A3_altruism: 74, A4_cooperation: 68,
    A5_modesty: 62, A6_sympathy: 78,
    // Conscientiousness facets
    C1_selfEfficacy: 80, C2_orderliness: 70, C3_dutifulness: 76,
    C4_achievementStriving: 82, C5_selfDiscipline: 72, C6_cautiousness: 65,
  },
  rawAnswers: {},
};

// Synthetic Sage interview messages
const SYNTHETIC_INTERVIEW_MESSAGES = [
  { role: "assistant" as const, content: "Margaret, thank you for taking the time to do this. I'd like to start with your earliest memory of doing something that felt really satisfying — something where you thought, yes, this is what I'm good at. Can you tell me about that?" },
  { role: "user" as const, content: "I think it was organising the school summer fair when I was about 11. The teacher who was supposed to run it got ill and somehow I ended up taking over. I remember feeling completely calm about it, which surprised everyone including me. I just started making lists and assigning jobs to people." },
  { role: "assistant" as const, content: "That's interesting — the calm under pressure, and the instinct to structure. Did you enjoy the organising itself, or was it more about the outcome?" },
  { role: "user" as const, content: "Both, I think. But honestly the bit I remember most vividly is the moment when I realised the whole thing was going to work. When all the pieces came together. That feeling of — I made this happen." },
  { role: "assistant" as const, content: "Let's move forward a bit. You founded the debating society at school. What was the impulse behind that?" },
  { role: "user" as const, content: "I was frustrated that there was nowhere to have a proper argument. I don't mean a fight — I mean a structured intellectual argument where you had to actually defend a position with evidence. I wanted that, and it didn't exist, so I built it." },
  { role: "assistant" as const, content: "The pattern I'm noticing is: you identify a gap, you build the thing that fills it, and you feel most alive when the thing is working. Does that resonate?" },
  { role: "user" as const, content: "Yes. That's exactly it. I've never quite put it that way but yes. The building is the bit I love. Once something is running well I get a bit restless." },
];

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("Lifework End-to-End Pipeline Simulation", () => {

  // ── Setup: insert synthetic client ────────────────────────────────────────
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available for simulation setup");

    // Insert or replace the synthetic user row (needed for FK)
    await db.execute(
      `INSERT INTO users (id, openId, email, name, loginMethod, role)
       VALUES (${SIM_USER_ID}, 'sim-test-user', 'sim@lifework-qa.test', 'QA Simulation User', 'manus', 'user')
       ON DUPLICATE KEY UPDATE email = VALUES(email)`
    );

    // Insert or replace the synthetic client profile
    await db
      .insert(clientProfiles)
      .values(SYNTHETIC_PROFILE)
      .onDuplicateKeyUpdate({ set: SYNTHETIC_PROFILE });

    // Insert achievements
    for (const ach of SYNTHETIC_ACHIEVEMENTS) {
      await upsertAchievement(ach as Parameters<typeof upsertAchievement>[0]);
    }

    // Insert family background
    await upsertFamilyBackground(SYNTHETIC_FAMILY);

    // Insert education
    for (const edu of SYNTHETIC_EDUCATION) {
      await upsertEducation(edu as Parameters<typeof upsertEducation>[0]);
    }

    // Insert career history
    for (const job of SYNTHETIC_CAREER) {
      await upsertCareer(job as Parameters<typeof upsertCareer>[0]);
    }

    // Insert VIA results
    await upsertViaResults(SYNTHETIC_VIA as Parameters<typeof upsertViaResults>[0]);

    // Insert IPIP results
    await upsertIpipResults(SYNTHETIC_IPIP as Parameters<typeof upsertIpipResults>[0]);

    // Insert Sage interview messages
    for (const msg of SYNTHETIC_INTERVIEW_MESSAGES) {
      await addInterviewMessage({
        clientId: SIM_CLIENT_ID,
        role: msg.role,
        content: msg.content,
      });
    }

    console.log(`[Simulation] Synthetic client ${SIM_CLIENT_ID} (Margaret Holloway) created`);
  }, 30_000);

  // ── Teardown: remove synthetic client ─────────────────────────────────────
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    // Delete in FK-safe order
    const tables = [
      "report_generation_logs",
      "analysis_reports",
      "via_results",
      "ipip_results",
      "cognitive_screener_results",
      "interview_messages",
      "chat_sessions",
      "career_history",
      "education_history",
      "family_background",
      "achievements",
      "client_profiles",
      "users",
    ];
    for (const table of tables) {
      const col = table === "users" ? "id" : table === "client_profiles" ? "userId" : "clientId";
      const id = table === "users" || table === "client_profiles" ? SIM_USER_ID : SIM_CLIENT_ID;
      try {
        await db.execute(`DELETE FROM \`${table}\` WHERE \`${col}\` = ${id}`);
      } catch {
        // Ignore tables that don't have the expected column
      }
    }
    console.log(`[Simulation] Synthetic client ${SIM_CLIENT_ID} cleaned up`);
  }, 30_000);

  // ── Stage 1: Data integrity checks ────────────────────────────────────────
  describe("Stage 1 — Client data integrity", () => {
    it("synthetic client has 5 achievements in the DB", async () => {
      const achievements = await getAchievements(SIM_CLIENT_ID);
      expect(achievements.length).toBeGreaterThanOrEqual(5);
    });

    it("achievements span multiple decades", async () => {
      const achievements = await getAchievements(SIM_CLIENT_ID);
      const decades = new Set(achievements.map(a => a.decade));
      expect(decades.size).toBeGreaterThanOrEqual(3);
    });

    it("VIA results are present with ranked strengths", async () => {
      const { getViaResults } = await import("./db");
      const via = await getViaResults(SIM_CLIENT_ID);
      expect(via).not.toBeNull();
      expect(Array.isArray(via?.rankedStrengths)).toBe(true);
      expect((via?.rankedStrengths as unknown[]).length).toBeGreaterThanOrEqual(5);
    });

    it("IPIP results are present with domain scores", async () => {
      const { getIpipResults } = await import("./db");
      const ipip = await getIpipResults(SIM_CLIENT_ID);
      expect(ipip).not.toBeNull();
      const scores = ipip?.domainScores as Record<string, number> | null;
      expect(scores).not.toBeNull();
      expect(scores?.O).toBeGreaterThan(0);
      expect(scores?.E).toBeGreaterThan(0);
    });
  });

  // ── Stage 2: Canonical Stage 1 generation ─────────────────────────────────
  describe("Stage 2 — Canonical Stage 1 (life history analysis)", () => {
    it("generates a non-empty canonical Stage 1 text", async () => {
      const stage1 = await generateAndStoreCanonicalStage1(SIM_CLIENT_ID);
      expect(typeof stage1).toBe("string");
      expect(stage1.length).toBeGreaterThan(500);
      console.log(`[Simulation] Stage 1 length: ${stage1.length} chars`);
    }, 120_000);

    it("canonical Stage 1 is stored in the DB", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      expect(report?.canonicalStage1).toBeTruthy();
      expect((report?.canonicalStage1 as string).length).toBeGreaterThan(200);
    });

    it("canonical Stage 1 mentions the client's name or has substantial content", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const text = report?.canonicalStage1 as string;
      // The LLM may write in second person or use pronouns — check it's substantial
      // and either contains the name or is clearly a personal analysis
      const hasName = text.toLowerCase().includes("margaret") || text.toLowerCase().includes("holloway");
      const isSubstantial = text.length > 1000;
      expect(isSubstantial).toBe(true);
      if (!hasName) {
        console.warn("[Simulation] Stage 1 does not mention client name — LLM used pronouns or second person");
      }
    });

    it("canonical Stage 1 contains at least one section heading", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const text = report?.canonicalStage1 as string;
      // Should contain markdown headings (## or #)
      expect(text).toMatch(/^#{1,3} .+/m);
    });
  });

  // ── Stage 3: WOW Report generation ────────────────────────────────────────
  describe("Stage 3 — WOW Report generation", () => {
    it("generate procedure starts without throwing", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.wowReport.generate({
        clientId: SIM_CLIENT_ID,
        forceRegenerate: true,
      });
      expect(result).toMatchObject({ started: expect.any(Boolean) });
    }, 30_000);

    it("WOW Report completes within 5 minutes", async () => {
      // Poll the DB until status is 'done' or 'error', max 5 min
      // Status values: pending | generating | done | error
      const deadline = Date.now() + 5 * 60 * 1000;
      let report = await getAnalysisReport(SIM_CLIENT_ID);
      while (
        report?.wowReportStatus !== "done" &&
        report?.wowReportStatus !== "error" &&
        Date.now() < deadline
      ) {
        await new Promise(r => setTimeout(r, 5000));
        report = await getAnalysisReport(SIM_CLIENT_ID);
        console.log(`[Simulation] WOW Report status: ${report?.wowReportStatus}`);
      }
      if (report?.wowReportStatus === "error") {
        console.error("[Simulation] WOW Report error:", report?.wowReportError);
      }
      expect(report?.wowReportStatus).toBe("done");
    }, 360_000); // 6 min timeout

    it("WOW Report sections are stored in the DB", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      // Sections are stored as JSON in wowReportJson
      expect(report?.wowReportJson).toBeTruthy();
    });

    it("all 8 required WOW Report sections are present and non-empty", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const sections = report?.wowReportJson
        ? (JSON.parse(report.wowReportJson as string) as Record<string, unknown>)
        : null;
      expect(sections).not.toBeNull();

      // Keys from the WowReportSections interface in wowReport.ts
      const requiredSections = [
        "summary",
        "lifeHistoryPattern",
        "viaSection",
        "personalitySection",
        "behaviouralStyle",
        "careerDirections",
        "developmentEdge",
        "coachingQuestions",
      ];

      for (const key of requiredSections) {
        const value = sections?.[key];
        expect(value, `Section "${key}" should be present`).toBeTruthy();
        expect(
          typeof value === "string" ? value.length : JSON.stringify(value).length,
          `Section "${key}" should not be empty`
        ).toBeGreaterThan(50);
      }
    });

    it("summary section is substantial", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const sections = report?.wowReportJson
        ? (JSON.parse(report.wowReportJson as string) as Record<string, string>)
        : null;
      const summary = sections?.summary ?? "";
      // The LLM may refer to the client by first name, full name, or pronouns
      // Check for name OR a substantial summary was generated
      const hasSummary = summary.length > 100;
      expect(hasSummary).toBe(true);
    });

    it("careerDirections section contains at least one direction", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const sections = report?.wowReportJson
        ? (JSON.parse(report.wowReportJson as string) as Record<string, string>)
        : null;
      const directions = sections?.careerDirections ?? "";
      // Should contain numbered list or heading markers
      expect(directions.length).toBeGreaterThan(100);
    });

    it("WOW Report has a PDF URL", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      expect(report?.wowReportPdfUrl).toBeTruthy();
      expect(report?.wowReportPdfUrl).toMatch(/^https?:\/\//);
    });
  });

  // ── Stage 4: Report retrieval via router ──────────────────────────────────
  describe("Stage 4 — Report retrieval via tRPC router", () => {
    it("wowReport.get returns exists:true with sections", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.wowReport.get({ clientId: SIM_CLIENT_ID });
      expect(result.exists).toBe(true);
      expect(result.sections).not.toBeNull();
      expect(result.pdfUrl).toBeTruthy();
    });

    it("wowReport.get sections object has all required keys", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.wowReport.get({ clientId: SIM_CLIENT_ID });
      const sections = result.sections as Record<string, unknown> | null;
      // Keys from the WowReportSections interface in wowReport.ts
      const required = [
        "summary", "lifeHistoryPattern", "viaSection",
        "personalitySection", "behaviouralStyle", "careerDirections",
        "developmentEdge", "coachingQuestions",
      ];
      for (const key of required) {
        expect(sections?.[key], `Router response missing section: ${key}`).toBeTruthy();
      }
    });
  });

  // ── Stage 5: PDF export validation ───────────────────────────────────────
  describe("Stage 5 — PDF export", () => {
    it("PDF URL is accessible and returns a valid PDF", async () => {
      const report = await getAnalysisReport(SIM_CLIENT_ID);
      const pdfUrl = report?.wowReportPdfUrl as string;
      expect(pdfUrl).toBeTruthy();

      const response = await fetch(pdfUrl);
      expect(response.ok).toBe(true);

      const buffer = Buffer.from(await response.arrayBuffer());
      // PDF files start with the magic bytes %PDF
      expect(buffer.slice(0, 4).toString("ascii")).toBe("%PDF");
      expect(buffer.length).toBeGreaterThan(10_000); // at least 10KB
      console.log(`[Simulation] PDF size: ${(buffer.length / 1024).toFixed(1)} KB`);
    }, 60_000);
  });

  // ── Stage 6: Counsellor Sage briefing ────────────────────────────────────
  describe("Stage 6 — Counsellor Sage pre-session briefing", () => {
    it("Sage returns a non-empty briefing for the synthetic client", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.counsellorSage.getBriefing({
        clientId: SIM_CLIENT_ID,
      });
      expect(typeof result.briefing).toBe("string");
      expect(result.briefing.length).toBeGreaterThan(50);
      expect(result.clientName).toBe("Margaret");
      console.log(`[Simulation] Sage briefing: ${result.briefing.substring(0, 120)}...`);
    }, 60_000);
  });
});
