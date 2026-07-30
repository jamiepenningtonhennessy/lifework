/**
 * Jobs/Opportunities pipeline — Heartbeat handlers
 *
 * Five stages, all running off-request via Heartbeat (HTTP cron).
 * The client page only reads pre-computed rows; it never triggers these.
 *
 * Stage 1 — generateTargetSpec:   WOW report → TargetSpec (one LLM call)
 * Stage 2 — buildMonitorList:     TargetSpec → bucket weights → company scores
 * Stage 3 — scanListings:         VacancySource adapters → job_listings → job_matches
 * Stage 4 — scanNewsSignals:      NewsSource (Google News RSS) → latent_signals
 * Stage 5 — sendAlerts:           new matches/signals → in-app notification
 *
 * Seams (// MANUS: implement here markers from 03-seams.md) are implemented
 * using Node fetch only — no Python/binaries.
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";
import {
  companyUniverse,
  clientTargetSpec,
  clientConstraints,
  clientMonitorList,
  jobListings,
  jobMatches,
  latentSignals,
  jobAlerts,
  analysisReports,
  clientProfiles,
  careerHistory,
} from "../../drizzle/schema";
import { eq, and, inArray, isNull, gte, sql } from "drizzle-orm";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences and sanitise control characters from LLM JSON responses.
 *
 * Some models:
 *   1. Wrap JSON in ```json ... ``` fences
 *   2. Embed literal newlines / tabs inside string values (invalid JSON)
 *
 * This helper handles both cases so JSON.parse never sees either.
 */
function stripFences(raw: string): string {
  // 1. Remove opening fence (```json, ```, ```JSON, etc.) — handles leading whitespace
  let s = raw.trim();
  // Handle ```json\n{...}\n``` pattern (multiline) — allow optional leading whitespace
  s = s.replace(/^\s*```[a-zA-Z]*\r?\n/, "");
  // 2. Remove closing fence — allow trailing whitespace
  s = s.replace(/\r?\n\s*```\s*$/, "").trim();
  // Also strip any remaining inline fences (e.g. ``` json without newline)
  s = s.replace(/^\s*```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
  // 3. Replace literal control characters inside JSON string values.
  //    We replace bare \n, \r, \t that appear INSIDE quoted strings with their
  //    escaped equivalents.  We do this by scanning character-by-character so
  //    we only touch characters inside double-quoted regions.
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // Strip other ASCII control characters (0x00-0x1F except the above)
      if (ch.charCodeAt(0) < 0x20) continue;
    }
    result += ch;
  }
  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TargetSpec {
  summary: string;
  seniority_band: string;
  role_families: { title: string; why: string }[];
  functions: string[];
  sectors: { sector: string; weight: "high" | "medium" | "low" }[];
  organisation_archetypes: string[];
  quality_preferences?: string[];  // QualityKey[] — inferred from WOW report
  geography: { base: string; acceptable: string[]; hard_constraints: string[] };
  differentiators: string[];
  deal_breakers: string[];
  search_terms: string[];
}

interface NormalisedListing {
  externalId: string;
  title: string;
  location?: string;
  url: string;
  descriptionText?: string;
  raw?: unknown;
}

interface Headline {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authenticateCron(req: Request): boolean {
  // In development allow direct calls for testing.
  if (process.env.NODE_ENV === "development") return true;
  // The Heartbeat platform sends a Bearer token in the Authorization header
  // matching the BUILT_IN_FORGE_API_KEY. Verify it.
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token.length > 0 && token === process.env.BUILT_IN_FORGE_API_KEY;
}

// ─── Stage 1: Profile → TargetSpec ───────────────────────────────────────────

/** Shared fake response that throws on error — used by all in-process stage wrappers. */
function makeFakeRes() {
  const fakeRes = {
    status: () => fakeRes,
    json: (body: unknown) => {
      if ((body as { error?: string }).error) throw new Error((body as { error: string }).error);
      return fakeRes;
    },
  } as unknown as Response;
  return fakeRes;
}
/** Fake request with cron auth header so authenticateCron passes in production. */
function makeFakeReq(clientId: number) {
  return {
    body: { clientId },
    headers: {
      authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY ?? ""}`,
    },
  } as unknown as Request;
}

/** Direct in-process call for Stage 1 — bypasses HTTP so no timeout risk. */
export async function runStage1(clientId: number): Promise<void> {
  await handleGenerateTargetSpec(makeFakeReq(clientId), makeFakeRes());
}
export async function runStage2(clientId: number): Promise<void> {
  await handleBuildMonitorList(makeFakeReq(clientId), makeFakeRes());
}
export async function runStage3(clientId: number): Promise<void> {
  await handleScanListings(makeFakeReq(clientId), makeFakeRes());
}
export async function runStage4(clientId: number): Promise<void> {
  await handleScanNewsSignals(makeFakeReq(clientId), makeFakeRes());
}
export async function runStage5(clientId: number): Promise<void> {
  await handleSendAlerts(makeFakeReq(clientId), makeFakeRes());
}

export async function handleGenerateTargetSpec(req: Request, res: Response) {
  if (!authenticateCron(req)) return res.status(403).json({ error: "cron-only" });
  const { clientId } = req.body as { clientId?: number };
  if (!clientId) return res.status(400).json({ error: "clientId required" });
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Load the client's WOW report and career history
    const [report] = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.clientId, clientId))
      .limit(1);

    if (!report?.canonicalStage1) {
      return res.json({ ok: true, skipped: "no canonical stage 1" });
    }

    const careers = await db
      .select()
      .from(careerHistory)
      .where(eq(careerHistory.clientId, clientId));

    const careerText = careers
      .map((c) => `${c.role} at ${c.organisation} (${c.yearFrom}–${c.yearTo ?? "present"})`)
      .join("\n");

    const wowJson = report.wowReportJson
      ? (() => { try { return JSON.parse(report.wowReportJson); } catch { return null; } })()
      : null;

    const reportText = [
      report.canonicalStage1,
      wowJson?.careerDirections ? `Career Directions:\n${JSON.stringify(wowJson.careerDirections)}` : "",
      careerText ? `Career History:\n${careerText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Load client constraints to get roleIntent if set
    const constraintRows = await db
      .select()
      .from(clientConstraints)
      .where(eq(clientConstraints.clientId, clientId))
      .limit(1);
    const roleIntent = constraintRows[0]?.roleIntent ?? null;

    const roleIntentSection = roleIntent
      ? `\n\nCLIENT'S OWN STATEMENT OF INTENT (highest priority — override any conflicting inference):\n"${roleIntent}"`
      : "";

    // Detect whether this is a graduate (student) client for Stage 1 prompt selection
    const isGraduateStage1 = report.wowReportType === "student";

    const seniorSystemPrompt = `You distil a LifeWorks career-coaching report into a structured career TARGET SPEC for use in a legal-market job search.

This platform serves lawyers and legal professionals seeking roles within or adjacent
to law firms and legal departments. The client may be a practising lawyer, a legal
operations professional, a legal technologist, a business services leader at a law
firm, or someone transitioning into the legal market from another sector.

The LifeWorks report is a reflective, narrative document (life history, character
strengths, personality, and 'career directions'). It contains NO company names and
often expresses direction as aspiration rather than job titles. Your job is to turn
it into concrete, searchable targets WITHIN THE LEGAL MARKET.

Rules:
- FOCUS on the legal market: law firms (Magic Circle, Silver Circle, US firms,
  boutiques), in-house legal teams, legal technology vendors, legal operations,
  and professional services firms serving the legal sector.
- If the client has stated a role intent (provided below), treat it as the
  PRIMARY signal and build the spec around it. Do not override it.
- Convert narrative directions + the client's actual career history into concrete,
  searchable ROLE TITLES and FUNCTIONS that a legal recruiter would actually post
  (e.g. "Legal Operations Director", "Head of Legal Technology", "Chief of Staff",
  "Director of Innovation", "AI Programme Manager", "Knowledge Management Counsel").
- Infer seniority from career history, not wishful thinking.
- Capture hard geographic/other constraints faithfully (they are deal-breakers).
- Be decisive and specific; this is a filter input, not prose.
- The sectors field should include "Law Firm" and/or "In-house Legal" unless the
  client's intent clearly points elsewhere.
- For quality_preferences: infer which organisational qualities the client would
  thrive in based on their personality, values, and career narrative. Choose from:
  autonomy, structured_learning, social_impact, commercial_intensity, collaboration,
  innovation, prestige, scale_and_stability. Select 2-4 that genuinely fit the
  client's character; do not select all of them.`;

    const graduateSystemPrompt = `You distil a LifeWorks career-coaching report into a structured career TARGET SPEC for a GRADUATE entering the job market for the first time.

This client is at the very start of their career. They have limited work history. Your job is to identify their TRANSFERABLE STRENGTHS and map them to graduate scheme opportunities across ALL sectors — not just the sector they studied or any sector mentioned in their report.

The LifeWorks report is a strengths-based, reflective document (life history, character, values, personality). It contains NO company names. Your job is to turn it into a graduate-appropriate target spec that a graduate recruiter would use to match them to schemes.

CRITICAL RULES:
- DO NOT default to the sector the client studied or any sector mentioned in passing in the report. A law student is not necessarily best suited to a law firm. A maths student is not necessarily best suited to finance. Start from their STRENGTHS, not their subject.
- FOCUS on WHAT THEY ARE LIKE (their strengths, values, working style, personality) — not WHAT THEY HAVE DONE (their degree subject or brief work experience).
- Identify 2-4 ROLE FAMILIES that match their strengths profile. Use role titles that actually appear in UK graduate scheme postings, e.g.: "Graduate Management Trainee", "Commercial Graduate Programme", "Technology Graduate Scheme", "Strategy & Operations Analyst", "Policy Analyst", "Marketing Graduate", "Finance Graduate Scheme", "HR Graduate Programme", "Engineering Graduate Scheme", "Consulting Analyst".
- For SECTORS: identify 3-5 sectors from the UK graduate scheme landscape where their strengths and values would genuinely thrive. Consider the full range: Consulting, Banking & Finance, Technology, Consumer Goods & Retail, Media & Publishing, Public Sector & Government, Charity & Social Enterprise, Engineering & Manufacturing, Property & Real Estate, Professional Services, Healthcare, Energy & Utilities, Retail & Hospitality, Logistics & Supply Chain. Weight sectors by genuine fit to the person's character — not by their academic background.
- Seniority is ALWAYS "Entry-Level / Graduate" — never infer anything higher.
- For differentiators: describe what makes this graduate stand out from other applicants — their distinctive strengths and character, not their CV facts.
- For search_terms: use terms that appear in actual UK graduate scheme job postings (e.g. "graduate scheme", "graduate programme", "management trainee", "analyst programme").
- Be decisive and specific. This spec will be used to filter 300 UK graduate employers across all sectors.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: isGraduateStage1 ? graduateSystemPrompt : seniorSystemPrompt,
        },
        {
          role: "user",
          content: `Here is the client's LifeWorks report and career history:${roleIntentSection}\n\n${reportText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "emit_target_spec",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              seniority_band: { type: "string" },
              role_families: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, why: { type: "string" } },
                  required: ["title", "why"],
                  additionalProperties: false,
                },
              },
              functions: { type: "array", items: { type: "string" } },
              sectors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sector: { type: "string" },
                    weight: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["sector", "weight"],
                  additionalProperties: false,
                },
              },
              organisation_archetypes: { type: "array", items: { type: "string" } },
              quality_preferences: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["autonomy", "structured_learning", "social_impact", "commercial_intensity", "collaboration", "innovation", "prestige", "scale_and_stability"],
                },
                description: "Organisational quality tags the client would thrive in, inferred from their WOW report",
              },
              geography: {
                type: "object",
                properties: {
                  base: { type: "string" },
                  acceptable: { type: "array", items: { type: "string" } },
                  hard_constraints: { type: "array", items: { type: "string" } },
                },
                required: ["base", "acceptable", "hard_constraints"],
                additionalProperties: false,
              },
              differentiators: { type: "array", items: { type: "string" } },
              deal_breakers: { type: "array", items: { type: "string" } },
              search_terms: { type: "array", items: { type: "string" } },
            },
            required: [
              "summary", "seniority_band", "role_families", "functions", "sectors",
              "organisation_archetypes", "quality_preferences", "geography", "differentiators", "deal_breakers", "search_terms",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const spec: TargetSpec = JSON.parse(stripFences(response.choices[0].message.content as string));

    // Upsert target spec (one per client — delete old, insert new)
    await db.delete(clientTargetSpec).where(eq(clientTargetSpec.clientId, clientId));
    await db.insert(clientTargetSpec).values({
      clientId,
      spec,
      reportVersion: report.wowReportGeneratedAt?.toISOString() ?? null,
    });

    console.log(`[jobs] Stage 1 complete for client ${clientId}`);
    return res.json({ ok: true, clientId });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[jobs] Stage 1 error for client ${clientId}:`, err);
    return res.status(500).json({ error, stack, context: { clientId }, timestamp: new Date().toISOString() });
  }
}

// ─── Stage 2: TargetSpec → Monitor List ──────────────────────────────────────

export async function handleBuildMonitorList(req: Request, res: Response) {
  if (!authenticateCron(req)) return res.status(403).json({ error: "cron-only" });

  const { clientId } = req.body as { clientId?: number };
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const [specRow] = await db
      .select()
      .from(clientTargetSpec)
      .where(eq(clientTargetSpec.clientId, clientId))
      .limit(1);

    if (!specRow) return res.json({ ok: true, skipped: "no target spec" });

    const spec = specRow.spec as TargetSpec;

    // Detect whether this is a graduate (student) client
    const [reportRow] = await db
      .select({ wowReportType: analysisReports.wowReportType })
      .from(analysisReports)
      .where(eq(analysisReports.clientId, clientId))
      .limit(1);
    const isGraduateClient = reportRow?.wowReportType === "student";
    console.log(`[jobs] Stage 2: client ${clientId} isGraduate=${isGraduateClient}`);

    // Load universe companies — graduate clients use the UK 300 graduate universe only;
    // senior clients use the non-graduate universe.
    const companies = await db
      .select()
      .from(companyUniverse)
      .where(
        isGraduateClient
          ? and(eq(companyUniverse.active, true), eq(companyUniverse.isGraduate, true))
          : and(eq(companyUniverse.active, true), eq(companyUniverse.isGraduate, false))
      );

    if (companies.length === 0) return res.json({ ok: true, skipped: "empty universe" });

    // 2a. Bucket weighting — get distinct (tier, sector) buckets
    const bucketSet = new Set<string>();
    for (const c of companies) {
      if (c.tier && c.sector) bucketSet.add(`${c.tier}|${c.sector}`);
    }
    // Human-readable label map so the LLM can connect raw tier/sector codes to the target spec vocabulary
    const TIER_LABELS: Record<string, string> = {
      law_firm: "Law Firm",
      ftse100: "FTSE 100",
      ftse250: "FTSE 250",
      ftse_small: "FTSE Small Cap",
      uk_private: "UK Private Company",
      global_tech: "Global Tech",
      tech_scaleup: "Tech Scaleup / Growth Stage",
      inhouse_legal: "In-house Legal Team",
      legal_tech: "Legal Technology",
      professional_services: "Professional Services",
      public_sector: "Public Sector",
    };
    const SECTOR_LABELS: Record<string, string> = {
      magic_circle: "Magic Circle (Clifford Chance, Freshfields, Linklaters, A&O Shearman, Slaughter and May)",
      silver_circle: "Silver Circle (Ashurst, Herbert Smith Freehills, Hogan Lovells, Norton Rose, Simmons & Simmons)",
      us_firm_london: "US Law Firm with London Office (e.g. Latham, Skadden, Kirkland, Sidley, Mayer Brown)",
      uk_intl: "UK International Law Firm (e.g. CMS, DLA Piper, Clyde & Co, Pinsent Masons, Eversheds)",
      uk_regional: "UK Regional Law Firm",
      "Law Firm": "Law Firm (general)",
    };
    const allBuckets = Array.from(bucketSet).map((b) => {
      const [tier, sector] = b.split("|");
      const label = `${TIER_LABELS[tier] ?? tier} — ${SECTOR_LABELS[sector] ?? sector}`;
      return { tier, sector, label };
    });

    // Pre-filter buckets to keep the LLM prompt small and prevent token-limit truncation.
    // For graduate clients: exclude law firm buckets unless the spec explicitly mentions legal sectors.
    // For all clients: hard-cap at 30 buckets (the LLM response grows linearly with bucket count).
    const specSectors: string[] = Array.isArray(spec?.sectors)
      ? spec.sectors.map((s: { sector?: string; name?: string }) =>
          (s.sector ?? s.name ?? "").toLowerCase()
        )
      : [];
    const specText = JSON.stringify(spec).toLowerCase();
    const wantsLegal = specSectors.some((s) =>
      s.includes("law") || s.includes("legal") || s.includes("barrister") || s.includes("solicitor")
    ) || specText.includes("law firm") || specText.includes("in-house legal");

    let buckets = allBuckets;
    if (isGraduateClient && !wantsLegal) {
      // Strip pure law-firm buckets for graduates who are not targeting legal roles
      buckets = buckets.filter((b) => b.tier !== "law_firm" && b.tier !== "inhouse_legal");
    }
    // Hard cap: send at most 30 buckets to the LLM to prevent response truncation
    const MAX_BUCKETS = 30;
    if (buckets.length > MAX_BUCKETS) {
      // Prioritise non-law buckets for graduates; otherwise take first N
      buckets = buckets.slice(0, MAX_BUCKETS);
    }
    console.log(`[jobs] Stage 2a: sending ${buckets.length} buckets to LLM (${allBuckets.length} total, isGraduate=${isGraduateClient}, wantsLegal=${wantsLegal})`);

    const weightResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You convert a client's career TARGET SPEC into a FILTER SPEC over a fixed company
universe. You are given every distinct (tier, sector) bucket that exists in the
universe. Weight EACH bucket 0-3 for how worth monitoring it is for THIS client:
  3 = core target (a seat here would be a bullseye)
  2 = worth monitoring (plausible, on-thesis)
  1 = weak / long-shot
  0 = irrelevant
Ground each weight in the spec's role families, functions, sectors and archetypes.
Be discriminating - most buckets should be 0 or 1; reserve 3 for genuine bullseyes.
Return a weight for every bucket you are given.`,
        },
        {
          role: "user",
          content: `TARGET SPEC:\n${JSON.stringify(spec, null, 2)}\n\nBUCKETS:\n${JSON.stringify(buckets, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "weight_buckets",
          strict: true,
          schema: {
            type: "object",
            properties: {
              buckets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tier: { type: "string" },
                    sector: { type: "string" },
                    weight: { type: "integer" },
                    reason: { type: "string" },
                  },
                  required: ["tier", "sector", "weight", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["buckets"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawWeightContent = weightResponse.choices[0].message.content as string;
    let weightedBuckets: { tier: string; sector: string; weight: number; reason: string }[] = [];
    // Helper: try multiple parse strategies to handle fenced, truncated, or partially-valid LLM output
    const tryParseWeights = (raw: string): typeof weightedBuckets | null => {
      // Strategy 1: standard stripFences + JSON.parse
      try {
        const p = JSON.parse(stripFences(raw));
        if (Array.isArray(p)) return p;
        if (Array.isArray(p?.buckets)) return p.buckets;
      } catch { /* fall through */ }
      // Strategy 2: extract the first [...] array from the raw string (handles missing outer braces)
      try {
        const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
          const p = JSON.parse(match[0]);
          if (Array.isArray(p)) return p;
        }
      } catch { /* fall through */ }
      // Strategy 3: wrap in braces if it looks like the content of a buckets property
      try {
        const stripped = stripFences(raw).trim();
        const wrapped = stripped.startsWith('[') ? stripped : `{${stripped}}`;
        const p = JSON.parse(wrapped);
        if (Array.isArray(p)) return p;
        if (Array.isArray(p?.buckets)) return p.buckets;
      } catch { /* fall through */ }
      return null;
    };
    const parsed = tryParseWeights(rawWeightContent);
    if (parsed) {
      weightedBuckets = parsed;
      console.log(`[jobs] Stage 2a: parsed ${weightedBuckets.length} bucket weights`);
    } else {
      console.warn(`[jobs] Stage 2a: failed to parse bucket weights (all strategies failed):`, rawWeightContent.slice(0, 300));
    }
    // Build lookup map
    const bucketWeightMap = new Map<string, number>();
    for (const b of weightedBuckets) {
      bucketWeightMap.set(`${b.tier}|${b.sector}`, b.weight);
    }

    // Gate companies to weight >= 2
    const gated = companies.filter((c) => {
      const w = bucketWeightMap.get(`${c.tier}|${c.sector}`) ?? 0;
      return w >= 2;
    });

    if (gated.length === 0) {
      console.log(`[jobs] Stage 2: no companies passed bucket gate for client ${clientId}`);
      return res.json({ ok: true, monitored: 0 });
    }

    // 2b. Company scoring — batch in groups of 30
    const BATCH = 30;
    const scored: { name: string; score: number; why: string }[] = [];

    // Quality preferences inferred from WOW report by Stage 1 — used for culture-fit scoring
    const qualityPreferences = spec.quality_preferences ?? [];

    for (let i = 0; i < gated.length; i += BATCH) {
      const batch = gated.slice(i, i + BATCH);
      const scoreResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You score individual companies as job-monitoring targets for one client, given
their career TARGET SPEC. A deterministic filter already gated the list to
plausible sectors — your job is to DISCRIMINATE within them.

Scoring criteria (weight each equally):
1. ROLE FIT: Does this company hire for the client's target role families and functions?
2. SECTOR FIT: Does the company's sector match the spec's priority sectors?
3. CULTURE FIT: Do the company's organisational qualities (provided per company) match
   the client's preferred working environment? Qualities are tags from this taxonomy:
   - autonomy: flat structure, self-directed, low bureaucracy
   - structured_learning: formal training, mentorship, clear progression
   - social_impact: mission-driven, public good, B-Corp
   - commercial_intensity: deal-driven, high-performance, strong commercial focus
   - collaboration: team-oriented, cross-functional, matrix structure
   - innovation: technology investment, experimentation, new business models
   - prestige: strong brand, selective, high reputational value for alumni
   - scale_and_stability: large, established, clear processes, job security

Reward companies where a senior seat would genuinely use this client's specific
blend (role families, differentiators, thesis) AND whose culture aligns with their
preferred working environment. Down-score generic names that only match the sector
label or whose culture is a poor fit.

Use what you know about each company. Score 1-10 and give a <=15-word reason
that mentions both fit dimensions. Score every company you are given.`,
          },
          {
            role: "user",
            content: `TARGET SPEC:\n${JSON.stringify(spec, null, 2)}${qualityPreferences.length > 0 ? `\n\nCLIENT QUALITY PREFERENCES: ${qualityPreferences.join(", ")}` : ""}\n\nCOMPANIES (with culture tags):\n${JSON.stringify(
              batch.map((c) => ({ name: c.name, tier: c.tier, sector: c.sector, qualities: c.qualities ?? [] })),
              null,
              2
            )}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "score_companies",
            strict: true,
            schema: {
              type: "object",
              properties: {
                scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      score: { type: "integer" },
                      why: { type: "string" },
                    },
                    required: ["name", "score", "why"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scores"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawScoreContent = scoreResponse.choices[0].message.content as string;
      let parsedScores: { name: string; score: number; why: string }[] = [];
      try {
        const parsed = JSON.parse(stripFences(rawScoreContent));
        // Handle both { scores: [...] } and bare [...]
        if (Array.isArray(parsed)) {
          parsedScores = parsed;
        } else if (Array.isArray(parsed?.scores)) {
          parsedScores = parsed.scores;
        } else if (Array.isArray(parsed?.companies)) {
          parsedScores = parsed.companies;
        } else {
          console.warn(`[jobs] Stage 2: unexpected scores shape for batch ${i}:`, JSON.stringify(parsed).slice(0, 200));
        }
      } catch (e) {
        console.warn(`[jobs] Stage 2: failed to parse scores for batch ${i}:`, rawScoreContent.slice(0, 200));
      }
      scored.push(...parsedScores);
    }

    // For graduate clients, cap the monitor list at the top 60 companies by score
    // to keep Stage 3 scraping to a manageable duration (~5 min vs 20+ min uncapped).
    const GRADUATE_MONITOR_CAP = 60;
    const finalScored = isGraduateClient
      ? scored.sort((a, b) => b.score - a.score).slice(0, GRADUATE_MONITOR_CAP)
      : scored;

    // Write monitor list
    await db.delete(clientMonitorList).where(eq(clientMonitorList.clientId, clientId));
    for (const s of finalScored) {
      const company = gated.find((c) => c.name.toLowerCase() === s.name.toLowerCase());
      if (!company) continue;
      const bw = bucketWeightMap.get(`${company.tier}|${company.sector}`) ?? 0;
      await db.insert(clientMonitorList).values({
        clientId,
        companyId: company.id,
        score: s.score,
        bucketWeight: bw,
        reason: s.why,
      });
    }

    console.log(`[jobs] Stage 2 complete for client ${clientId}: ${scored.length} companies monitored`);
    return res.json({ ok: true, clientId, monitored: scored.length });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[jobs] Stage 2 error for client ${clientId}:`, err);
    return res.status(500).json({ error, stack, context: { clientId }, timestamp: new Date().toISOString() });
  }
}

// ─── Stage 3: Live Listings Scan ─────────────────────────────────────────────

// MANUS: VacancySource adapters — implement fetch per ATS provider.
// Node fetch only (no Python/binaries). Returns NormalisedListing[].

async function fetchGreenhouseListings(slug: string): Promise<NormalisedListing[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { jobs?: { id: number; title: string; location?: { name?: string }; absolute_url?: string; content?: string }[] };
    return (data.jobs ?? []).map((j) => ({
      externalId: String(j.id),
      title: j.title,
      location: j.location?.name,
      url: j.absolute_url ?? "",
      descriptionText: j.content ? j.content.replace(/<[^>]+>/g, " ").slice(0, 500) : undefined,
      raw: j,
    }));
  } catch {
    return [];
  }
}

async function fetchLeverListings(slug: string): Promise<NormalisedListing[]> {
  try {
    const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { id?: string; text?: string; categories?: { location?: string }; hostedUrl?: string; descriptionPlain?: string }[];
    if (!Array.isArray(data)) return [];
    return data.map((j) => ({
      externalId: j.id ?? "",
      title: j.text ?? "",
      location: j.categories?.location,
      url: j.hostedUrl ?? "",
      descriptionText: j.descriptionPlain?.slice(0, 500),
      raw: j,
    }));
  } catch {
    return [];
  }
}

async function fetchAshbyListings(slug: string): Promise<NormalisedListing[]> {
  try {
    const url = `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "ApiJobBoardWithTeams",
        variables: { organizationHostedJobsPageName: slug },
        query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
            jobPostings { id title locationName jobRequisitionId isListed externalLink }
          }
        }`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { data?: { jobBoard?: { jobPostings?: { id: string; title: string; locationName?: string; externalLink?: string }[] } } };
    const postings = data?.data?.jobBoard?.jobPostings ?? [];
    return postings.map((j) => ({
      externalId: j.id,
      title: j.title,
      location: j.locationName,
      url: j.externalLink ?? `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      raw: j,
    }));
  } catch {
    return [];
  }
}

async function fetchWorkdayListings(slug: string): Promise<NormalisedListing[]> {
  // slug format: "tenant|site" e.g. "linklaters|Linklaters"
  const [tenant, site] = slug.split("|");
  if (!tenant || !site) return [];
  // Try wd3, wd1, and wd103 subdomains in order
  for (const subdomain of ["wd3", "wd1", "wd103"]) {
    try {
      const baseUrl = `https://${tenant}.${subdomain}.myworkdayjobs.com`;
      const url = `${baseUrl}/wday/cxs/${tenant}/${site}/jobs`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as { jobPostings?: { bulletFields?: string[]; title?: string; locationsText?: string; externalPath?: string }[] };
      return (data.jobPostings ?? []).map((j, idx) => ({
        externalId: j.externalPath ?? String(idx),
        title: j.title ?? "",
        location: j.locationsText,
        url: j.externalPath ? `${baseUrl}/${j.externalPath}` : "",
        raw: j,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

async function fetchIcimsListings(slug: string): Promise<NormalisedListing[]> {
  // slug format: "lw" (for careers-lw.icims.com) or "jobs-willkie" (for jobs-willkie.icims.com)
  // Try careers-SLUG, SLUG, and jobs-SLUG patterns
  const patterns = [
    `https://careers-${slug}.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1`,
    `https://${slug}.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1`,
    `https://jobs-${slug}.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1`,
  ];
  for (const baseUrl of patterns) {
    try {
      const resp = await fetch(baseUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LifeWorksBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      // iCIMS returns HTML with job listing links in the format /jobs/NNN/job
      const jobMatches = html.match(/href="\/jobs\/\d+\/[^"]+"/g) ?? [];
      const titleMatches = html.match(/class="[^"]*title[^"]*"[^>]*>([^<]{5,120})</gi) ?? [];
      if (jobMatches.length === 0 && titleMatches.length === 0) continue;
      const baseHost = new URL(baseUrl).origin;
      const seen = new Set<string>();
      const listings: NormalisedListing[] = [];
      jobMatches.forEach((m, idx) => {
        const href = m.replace(/href="/, "").replace(/"/, "");
        if (seen.has(href)) return;
        seen.add(href);
        const title = titleMatches[idx]?.replace(/<[^>]+>/g, "").trim() ?? `Position ${idx + 1}`;
        listings.push({
          externalId: href,
          title,
          url: `${baseHost}${href}`,
          raw: { source: "icims" },
        });
      });
      if (listings.length > 0) return listings;
    } catch {
      continue;
    }
  }
  return [];
}
async function fetchSmartRecruitersListings(slug: string): Promise<NormalisedListing[]> {
  try {
    const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=20`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { content?: { id?: string; name?: string; location?: { city?: string; country?: string }; ref?: string }[] };
    return (data.content ?? []).map((j) => ({
      externalId: j.id ?? "",
      title: j.name ?? "",
      location: [j.location?.city, j.location?.country].filter(Boolean).join(", "),
      url: j.ref ?? "",
      raw: j,
    }));
  } catch {
    return [];
  }
}

async function fetchGenericListings(_careersUrl: string): Promise<NormalisedListing[]> {
  // Generic scraping requires a headless browser (Playwright/Puppeteer) which is not
  // available in the Cloud Run production environment. Skip these companies rather than
  // waiting 15s per company for a timeout that returns nothing useful.
  // TODO: integrate a cloud scraping service (e.g. ScrapingBee, Apify) for generic pages.
  return [];
}

async function fetchListingsForCompany(company: typeof companyUniverse.$inferSelect): Promise<NormalisedListing[]> {
  const provider = company.atsProvider?.toLowerCase();
  const slug = company.atsSlug ?? "";
  const careersUrl = company.careersUrl ?? "";

  switch (provider) {
    case "greenhouse": return fetchGreenhouseListings(slug);
    case "lever": return fetchLeverListings(slug);
    case "ashby": return fetchAshbyListings(slug);
    case "workday": return fetchWorkdayListings(slug);
    case "icims": return fetchIcimsListings(slug);
    case "smartrecruiters": return fetchSmartRecruitersListings(slug);
    case "generic": return fetchGenericListings(careersUrl || slug); // returns [] in production
    default:
      // No ATS provider configured — skip to avoid long timeouts on unknown pages
      return [];
  }
}

/** Run tasks with a bounded concurrency limit (like p-limit but without the dependency). */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function handleScanListings(req: Request, res: Response) {
  if (!authenticateCron(req)) return res.status(403).json({ error: "cron-only" });

  // Scan listings for ALL clients with a monitor list
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Get all distinct clientIds that have a monitor list
    const monitorRows = await db.select().from(clientMonitorList);
    const clientIds = Array.from(new Set<number>(monitorRows.map((r) => r.clientId)));

    let totalListings = 0;
    let totalMatches = 0;

    for (const clientId of clientIds) {
      const [specRow] = await db
        .select()
        .from(clientTargetSpec)
        .where(eq(clientTargetSpec.clientId, clientId))
        .limit(1);

      if (!specRow) continue;
      const spec = specRow.spec as TargetSpec;

      const monitoredCompanyIds = monitorRows
        .filter((r) => r.clientId === clientId)
        .map((r) => r.companyId);

      const companies = await db
        .select()
        .from(companyUniverse)
        .where(inArray(companyUniverse.id, monitoredCompanyIds));

      const [constraints] = await db
        .select()
        .from(clientConstraints)
        .where(eq(clientConstraints.clientId, clientId))
        .limit(1);

            // ── Step A: Scrape all companies in parallel (12 concurrent) ─────────
      const SCRAPE_CONCURRENCY = 12;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const scrapeResults = await runWithConcurrency(
        companies.map((company) => async () => {
          const listings = await fetchListingsForCompany(company);
          return { company, listings };
        }),
        SCRAPE_CONCURRENCY
      );
      // Flatten all (company, listing) pairs
      const allPairs: { company: typeof companies[0]; listing: NormalisedListing }[] = [];
      for (const { company, listings } of scrapeResults) {
        for (const listing of listings) {
          allPairs.push({ company, listing });
        }
      }
      console.log(`[jobs] Stage 3: scraped ${allPairs.length} listings from ${companies.length} companies for client ${clientId}`);

      // ── Step B: Upsert listings into DB (sequential to avoid race conditions) ──
      const listingIds: { company: typeof companies[0]; listing: NormalisedListing; listingId: number; isNew: boolean }[] = [];
      for (const { company, listing } of allPairs) {
        const [existing] = await db
          .select()
          .from(jobListings)
          .where(and(eq(jobListings.companyId, company.id), eq(jobListings.externalId, listing.externalId)))
          .limit(1);
        let listingId: number;
        let isNew = false;
        if (existing) {
          listingId = existing.id;
          await db.update(jobListings).set({ fetchedAt: new Date(), expiresAt }).where(eq(jobListings.id, existing.id));
        } else {
          const inserted = await db.insert(jobListings).values({
            companyId: company.id,
            externalId: listing.externalId,
            title: listing.title,
            location: listing.location ?? null,
            url: listing.url,
            raw: listing.raw ?? null,
            expiresAt,
          });
          listingId = (inserted as unknown as { insertId: number }[])[0]?.insertId ?? 0;
          isNew = true;
          totalListings++;
        }
        if (listingId) listingIds.push({ company, listing, listingId, isNew });
      }

      // ── Step C: Score all listings in parallel (25 concurrent LLM calls) ──
      // Strategy: bulk-fetch all existing match IDs first (one query), then run all
      // LLM calls without touching the DB (no connections held open during LLM latency),
      // then bulk-insert all new matches in batches. This avoids ETIMEDOUT from TiDB's
      // server-side idle connection timeout during long-running parallel LLM batches.
      const SCORE_CONCURRENCY = 25;
      const specStr = JSON.stringify(spec, null, 2);
      const constraintsStr = JSON.stringify(constraints ?? {});

      // Bulk-fetch all existing match listingIds for this client in one query
      const allListingIds = listingIds.map((l) => l.listingId);
      const existingMatchRows = allListingIds.length > 0
        ? await db
            .select({ listingId: jobMatches.listingId })
            .from(jobMatches)
            .where(and(eq(jobMatches.clientId, clientId), inArray(jobMatches.listingId, allListingIds)))
        : [];
      const alreadyScoredSet = new Set(existingMatchRows.map((r) => r.listingId));

      // Filter to only unscored listings
      const toScore = listingIds.filter(({ listingId }) => !alreadyScoredSet.has(listingId));
      console.log(`[jobs] Stage 3: ${toScore.length} listings to score (${alreadyScoredSet.size} already scored) for client ${clientId}`);

      // Run all LLM scoring calls in parallel WITHOUT holding DB connections open
      type ScoredMatch = { listingId: number; score: number; rationale: string; constraintStatus: "ok" | "filtered" };
      const scoredResults = await runWithConcurrency(
        toScore.map(({ listing, listingId }) => async (): Promise<ScoredMatch | null> => {
          const scoreResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You score a single real job VACANCY as a fit for one client, given their career
TARGET SPEC and hard CONSTRAINTS. Reward roles that use the client's specific
blend (role families, functions, differentiators); down-score generic matches.
If the vacancy violates a hard constraint (below the salary floor, a fixed-term
contract when permanent-only, or in an excluded location), set constraint_status
= "filtered" with the reason. Score 1-10 and give a one-line rationale.`,
              },
              {
                role: "user",
                content: `TARGET SPEC:\n${specStr}\n\nCONSTRAINTS:\n${constraintsStr}\n\nVACANCY:\nTitle: ${listing.title}\nLocation: ${listing.location ?? "unknown"}\nURL: ${listing.url}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "score_vacancy",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    score: { type: "integer" },
                    rationale: { type: "string" },
                    constraint_status: { type: "string", enum: ["ok", "filtered"] },
                  },
                  required: ["score", "rationale", "constraint_status"],
                  additionalProperties: false,
                },
              },
            },
          });
          const rawScored = scoreResponse.choices[0].message.content as string;
          try {
            const scored = JSON.parse(stripFences(rawScored)) as { score: number; rationale: string; constraint_status: "ok" | "filtered" };
            return { listingId, score: scored.score, rationale: scored.rationale, constraintStatus: scored.constraint_status };
          } catch {
            console.warn(`[jobs] Stage 3: non-JSON score response for listing ${listingId}, skipping.`);
            return null;
          }
        }),
        SCORE_CONCURRENCY
      );

      // Bulk-insert all new matches in batches of 50 (fresh DB call, no long-held connections)
      const validScores = scoredResults.filter((r): r is ScoredMatch => r !== null);
      const INSERT_BATCH = 50;
      for (let i = 0; i < validScores.length; i += INSERT_BATCH) {
        const batch = validScores.slice(i, i + INSERT_BATCH);
        if (batch.length === 0) continue;
        await db.insert(jobMatches).values(
          batch.map((s) => ({
            clientId,
            listingId: s.listingId,
            score: s.score,
            rationale: s.rationale,
            constraintStatus: s.constraintStatus,
          }))
        );
        totalMatches += batch.length;
      }
    }

    console.log(`[jobs] Stage 3 complete: ${totalListings} new listings, ${totalMatches} new matches`);
    return res.json({ ok: true, totalListings, totalMatches });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[jobs] Stage 3 error:", err);
    return res.status(500).json({ error, stack, timestamp: new Date().toISOString() });
  }
}

// ─── Stage 4: News Signals ────────────────────────────────────────────────────

// MANUS: NewsSource — Google News RSS
async function searchNewsHeadlines(queries: string[]): Promise<Headline[]> {
  const headlines: Headline[] = [];
  for (const query of queries.slice(0, 5)) { // cap at 5 queries per run
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-GB&gl=GB&ceid=GB:en`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LifeWorksBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;
      const xml = await resp.text();
      // Parse RSS items
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      for (const item of items.slice(0, 10)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
          item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "";
        if (title) headlines.push({ title, url: link, source, publishedAt: pubDate });
      }
    } catch {
      // continue with next query
    }
  }
  return headlines;
}

export async function handleScanNewsSignals(req: Request, res: Response) {
  if (!authenticateCron(req)) return res.status(403).json({ error: "cron-only" });

  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const monitorRows = await db.select().from(clientMonitorList);
    const clientIds = Array.from(new Set<number>(monitorRows.map((r) => r.clientId)));

    let totalSignals = 0;

    for (const clientId of clientIds) {
      const [specRow] = await db
        .select()
        .from(clientTargetSpec)
        .where(eq(clientTargetSpec.clientId, clientId))
        .limit(1);

      if (!specRow) continue;
      const spec = specRow.spec as TargetSpec;

      // Build search queries from role families + top monitored companies
      const topCompanyIds = monitorRows
        .filter((r) => r.clientId === clientId && (r.score ?? 0) >= 7)
        .slice(0, 10)
        .map((r) => r.companyId);

      const topCompanies = topCompanyIds.length
        ? await db
            .select()
            .from(companyUniverse)
            .where(inArray(companyUniverse.id, topCompanyIds))
        : [];

      const queries: string[] = [];
      for (const rf of spec.role_families.slice(0, 3)) {
        queries.push(`${rf.title} departure UK law firm`);
        queries.push(`${rf.title} appointment senior UK`);
      }
      for (const c of topCompanies.slice(0, 3)) {
        queries.push(`${c.name} partner departure`);
      }

      const headlines = await searchNewsHeadlines(queries);
      if (headlines.length === 0) continue;

      // Classify headlines
      const roles = spec.role_families.map((r) => r.title).join(", ");
      const sen = spec.seniority_band;

      const classifyResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You triage legal/industry news headlines to find senior SEAT OPENINGS. Two
independent judgements per headline - keep them separate:

1) seat_opening: does a senior (partner / GC / Head of Legal / CLO / Head of
   Innovation / Chief Innovation / senior AI-governance) seat OPEN at a UK-relevant
   employer? A DEPARTURE or a newly-CREATED function opens a seat -> true. A person
   simply being appointed INTO an existing seat (a backfill) does NOT open one ->
   false. Marketing, rankings, deal news, junior moves -> false.
   ATTRIBUTION: if firm Y hires/recruits a person FROM firm X, or a person LEAVES X
   to join Y, the OPENING is at X. Set company=X, event="departure".
   Example: "Simpson Thacher hires Freshfields partner" -> company="Freshfields",
   event="departure" (the seat opens at Freshfields).

2) target_relevance (0-3): INDEPENDENTLY of whether it opens, how well would such a
   seat fit THIS client, whose target seats are: ${roles} (seniority: ${sen})?
   3=bullseye, 2=on-thesis, 1=plausible, 0=off-target. Judge the seat, not the
   headline's spin. Do NOT let low relevance suppress seat_opening - score both.

Return ONLY a JSON array, one object per input item in order:
{"i": <index>, "company": "<losing employer or null>", "person": "<name or null>",
"role": "<the opening seat's role or null>", "event": "departure|vacancy|appointment|other",
"uk_relevant": true|false, "seat_opening": true|false, "target_relevance": 0-3}`,
          },
          {
            role: "user",
            content: JSON.stringify(
              headlines.map((h, i) => ({ i, title: h.title, source: h.source, publishedAt: h.publishedAt }))
            ),
          },
        ],
      });

      let classified: {
        i: number;
        company: string | null;
        person: string | null;
        role: string | null;
        event: "departure" | "vacancy" | "appointment" | "other";
        uk_relevant: boolean;
        seat_opening: boolean;
        target_relevance: number;
      }[] = [];

      try {
        const content = classifyResponse.choices[0].message.content as string;
        // Extract JSON array from response
        const match = content.match(/\[[\s\S]*\]/);
        if (match) classified = JSON.parse(match[0]);
      } catch {
        continue;
      }

      // Recency window: 120 days
      const cutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

      for (const c of classified) {
        if (!c.seat_opening || !c.uk_relevant || c.target_relevance < 1) continue;

        const headline = headlines[c.i];
        if (!headline) continue;

        // Parse publishedAt
        let publishedAt: Date | null = null;
        if (headline.publishedAt) {
          const d = new Date(headline.publishedAt);
          if (!isNaN(d.getTime())) {
            if (d < cutoff) continue; // too old
            publishedAt = d;
          }
        }

        // Check if already stored (dedupe by clientId + url)
        const [existing] = await db
          .select()
          .from(latentSignals)
          .where(and(eq(latentSignals.clientId, clientId), eq(latentSignals.url, headline.url)))
          .limit(1);

        if (existing) continue;

        // Check if company is on monitor list
        const onMonitor = topCompanies.some(
          (co) => c.company && co.name.toLowerCase().includes(c.company!.toLowerCase())
        );

        await db.insert(latentSignals).values({
          clientId,
          company: c.company ?? null,
          onMonitorList: onMonitor,
          event: c.event,
          role: c.role ?? null,
          person: c.person ?? null,
          relevance: c.target_relevance,
          headline: headline.title,
          source: headline.source ?? null,
          url: headline.url,
          publishedAt,
        });
        totalSignals++;
      }
    }

    console.log(`[jobs] Stage 4 complete: ${totalSignals} new signals`);
    return res.json({ ok: true, totalSignals });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[jobs] Stage 4 error:", err);
    return res.status(500).json({ error, stack, timestamp: new Date().toISOString() });
  }
}

// ─── Stage 5: Alerts ──────────────────────────────────────────────────────────

export async function handleSendAlerts(req: Request, res: Response) {
  if (!authenticateCron(req)) return res.status(403).json({ error: "cron-only" });

  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const MATCH_THRESHOLD = 7;
    const SIGNAL_THRESHOLD = 2;

    let totalAlerts = 0;

    // Find high-scoring matches not yet alerted
    const newMatches = await db
      .select({ id: jobMatches.id, clientId: jobMatches.clientId, score: jobMatches.score })
      .from(jobMatches)
      .where(and(gte(jobMatches.score, MATCH_THRESHOLD), eq(jobMatches.constraintStatus, "ok")));

    for (const match of newMatches) {
      const [alerted] = await db
        .select()
        .from(jobAlerts)
        .where(eq(jobAlerts.matchId, match.id))
        .limit(1);

      if (alerted) continue;

      await db.insert(jobAlerts).values({ clientId: match.clientId, matchId: match.id });

      // In-app notification (notifyOwner notifies the platform owner — counsellor)
      await notifyOwner({
        title: "New job match",
        content: `Client ${match.clientId} has a new job match (score ${match.score}/10).`,
      });
      totalAlerts++;
    }

    // Find high-relevance signals not yet alerted
    const newSignals = await db
      .select({ id: latentSignals.id, clientId: latentSignals.clientId, relevance: latentSignals.relevance, company: latentSignals.company })
      .from(latentSignals)
      .where(gte(latentSignals.relevance, SIGNAL_THRESHOLD));

    for (const signal of newSignals) {
      const [alerted] = await db
        .select()
        .from(jobAlerts)
        .where(eq(jobAlerts.signalId, signal.id))
        .limit(1);

      if (alerted) continue;

      await db.insert(jobAlerts).values({ clientId: signal.clientId, signalId: signal.id });

      await notifyOwner({
        title: "New early signal",
        content: `Client ${signal.clientId} has a new early signal at ${signal.company ?? "unknown"} (relevance ${signal.relevance}/3).`,
      });
      totalAlerts++;
    }

    console.log(`[jobs] Stage 5 complete: ${totalAlerts} alerts sent`);
    return res.json({ ok: true, totalAlerts });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[jobs] Stage 5 error:", err);
    return res.status(500).json({ error, stack, timestamp: new Date().toISOString() });
  }
}
