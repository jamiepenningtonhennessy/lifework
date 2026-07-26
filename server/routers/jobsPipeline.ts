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
  // 1. Remove opening fence (```json, ```, ```JSON, etc.)
  let s = raw.trim().replace(/^```[a-zA-Z]*\s*/m, "");
  // 2. Remove closing fence
  s = s.replace(/\s*```\s*$/m, "").trim();
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

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You distil a LifeWorks career-coaching report into a structured career TARGET SPEC.

The LifeWorks report is a reflective, narrative document (life history, character
strengths, personality, and 'career directions'). It contains NO company names and
often expresses direction as aspiration rather than job titles. Your job is to turn
it into concrete, searchable targets.

Rules:
- GROUND every field in the report. Do not invent employers, facts, or ambitions
  the text does not support.
- Convert narrative directions + the client's actual career history into concrete,
  searchable ROLE TITLES and FUNCTIONS (this spec is snapped against a company
  universe and fed to a news/departure monitor downstream, so vague aspiration is
  useless - favour titles a recruiter would actually post).
- Infer seniority from career history, not wishful thinking.
- Capture hard geographic/other constraints faithfully (they are deal-breakers).
- Be decisive and specific; this is a filter input, not prose.`,
        },
        {
          role: "user",
          content: `Here is the client's LifeWorks report and career history:\n\n${reportText}`,
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
              "organisation_archetypes", "geography", "differentiators", "deal_breakers", "search_terms",
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

    // Load universe companies
    const companies = await db
      .select()
      .from(companyUniverse)
      .where(eq(companyUniverse.active, true));

    if (companies.length === 0) return res.json({ ok: true, skipped: "empty universe" });

    // 2a. Bucket weighting — get distinct (tier, sector) buckets
    const bucketSet = new Set<string>();
    for (const c of companies) {
      if (c.tier && c.sector) bucketSet.add(`${c.tier}|${c.sector}`);
    }
    const buckets = Array.from(bucketSet).map((b) => {
      const [tier, sector] = b.split("|");
      return { tier, sector };
    });

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
    try {
      const parsedW = JSON.parse(stripFences(rawWeightContent));
      if (Array.isArray(parsedW)) {
        weightedBuckets = parsedW;
      } else if (Array.isArray(parsedW?.buckets)) {
        weightedBuckets = parsedW.buckets;
      } else {
        console.warn(`[jobs] Stage 2a: unexpected bucket weights shape:`, JSON.stringify(parsedW).slice(0, 200));
      }
    } catch (e) {
      console.warn(`[jobs] Stage 2a: failed to parse bucket weights:`, rawWeightContent.slice(0, 200));
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

    for (let i = 0; i < gated.length; i += BATCH) {
      const batch = gated.slice(i, i + BATCH);
      const scoreResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You score individual companies as job-monitoring targets for one client, given
their career TARGET SPEC. A deterministic filter already gated the list to
plausible sectors - your job is to DISCRIMINATE within them: reward companies where
a senior seat would genuinely use this client's specific blend (role families,
differentiators, thesis); down-score generic names that only match the sector
label. Use what you know about each company. Score 1-10 and give a <=12-word
reason. Score every company you are given.`,
          },
          {
            role: "user",
            content: `TARGET SPEC:\n${JSON.stringify(spec, null, 2)}\n\nCOMPANIES:\n${JSON.stringify(
              batch.map((c) => ({ name: c.name, tier: c.tier, sector: c.sector })),
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

    // Write monitor list
    await db.delete(clientMonitorList).where(eq(clientMonitorList.clientId, clientId));

    for (const s of scored) {
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
  try {
    const url = `https://${tenant}.wd3.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { jobPostings?: { bulletFields?: string[]; title?: string; locationsText?: string; externalPath?: string }[] };
    return (data.jobPostings ?? []).map((j, idx) => ({
      externalId: j.externalPath ?? String(idx),
      title: j.title ?? "",
      location: j.locationsText,
      url: j.externalPath ? `https://${tenant}.wd3.myworkdayjobs.com/${j.externalPath}` : "",
      raw: j,
    }));
  } catch {
    return [];
  }
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

async function fetchGenericListings(careersUrl: string): Promise<NormalisedListing[]> {
  // MANUS: Generic careers page — fetch HTML and extract job titles.
  // This is a best-effort scrape; structured ATS adapters above are preferred.
  try {
    const resp = await fetch(careersUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LifeWorksBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    // Extract text between common job-title tags — heuristic, not guaranteed
    const titleMatches = html.match(/<h[23][^>]*>([^<]{10,120})<\/h[23]>/gi) ?? [];
    return titleMatches.slice(0, 10).map((m, idx) => {
      const title = m.replace(/<[^>]+>/g, "").trim();
      return {
        externalId: `generic-${idx}-${Date.now()}`,
        title,
        url: careersUrl,
        raw: { source: "generic_scrape" },
      };
    });
  } catch {
    return [];
  }
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
    case "smartrecruiters": return fetchSmartRecruitersListings(slug);
    case "generic": return fetchGenericListings(careersUrl || slug);
    default: return [];
  }
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

      for (const company of companies) {
        const listings = await fetchListingsForCompany(company);
        if (listings.length === 0) continue;

        // TTL: 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        for (const listing of listings) {
          // Upsert listing (dedupe by companyId + externalId)
          const [existing] = await db
            .select()
            .from(jobListings)
            .where(
              and(
                eq(jobListings.companyId, company.id),
                eq(jobListings.externalId, listing.externalId)
              )
            )
            .limit(1);

          let listingId: number;
          if (existing) {
            listingId = existing.id;
            await db
              .update(jobListings)
              .set({ fetchedAt: new Date(), expiresAt })
              .where(eq(jobListings.id, existing.id));
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
            totalListings++;
          }

          if (!listingId) continue;

          // Score listing against client's target spec
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
                content: `TARGET SPEC:\n${JSON.stringify(spec, null, 2)}\n\nCONSTRAINTS:\n${JSON.stringify(
                  constraints ?? {}
                )}\n\nVACANCY:\nTitle: ${listing.title}\nLocation: ${listing.location ?? "unknown"}\nURL: ${listing.url}`,
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

          const scored = JSON.parse(stripFences(scoreResponse.choices[0].message.content as string)) as {
            score: number;
            rationale: string;
            constraint_status: "ok" | "filtered";
          };

          // Upsert match
          const [existingMatch] = await db
            .select()
            .from(jobMatches)
            .where(and(eq(jobMatches.clientId, clientId), eq(jobMatches.listingId, listingId)))
            .limit(1);

          if (!existingMatch) {
            await db.insert(jobMatches).values({
              clientId,
              listingId,
              score: scored.score,
              rationale: scored.rationale,
              constraintStatus: scored.constraint_status,
            });
            totalMatches++;
          }
        }
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
