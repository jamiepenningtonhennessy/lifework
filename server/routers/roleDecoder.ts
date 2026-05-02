/**
 * Role Decoder Router
 *
 * Counsellor-only tool. The counsellor pastes a job description for a specific
 * client; the system decodes the role against the client's alive pattern and
 * returns a three-section narrative:
 *
 *   1. roleCore          — what the role is actually asking for beneath the JD language
 *   2. patternConnection — where the client's pattern connects to that
 *   3. interviewLanguage — what the client needs to say to make the connection visible
 *
 * No new database tables are required — the client profile data already exists.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
} from "../db";

// ─── Big Five labels (mirrors wowReport.ts) ───────────────────────────────────
const BIG5_LABELS: Record<string, { name: string; low: string; high: string }> = {
  N: { name: "Neuroticism",    low: "Emotionally stable and calm",          high: "Emotionally reactive and sensitive" },
  E: { name: "Extraversion",   low: "Reflective and independent",           high: "Energised by people and action" },
  O: { name: "Openness",       low: "Practical and conventional",           high: "Imaginative and intellectually curious" },
  A: { name: "Agreeableness",  low: "Direct and task-focused",              high: "Collaborative and relationship-oriented" },
  C: { name: "Conscientiousness", low: "Flexible and spontaneous",          high: "Organised, disciplined, and goal-driven" },
};

// ─── Insights colour derivation (mirrors wowReport.ts logic) ─────────────────
function deriveInsightsColour(e: number, a: number): string {
  if (e >= 55 && a >= 55) return "Sunshine Yellow";
  if (e >= 55 && a < 55)  return "Fiery Red";
  if (e < 55  && a >= 55) return "Earth Green";
  return "Cool Blue";
}

// ─── Build a rich client profile context string for the LLM ──────────────────
async function buildRoleDecoderContext(clientId: number): Promise<{
  clientName: string;
  clientFullName: string;
  contextText: string;
  tellMeAboutYourself: string | null;
  lifeHistoryPattern: string | null;
}> {
  const [profile, achievementsList, family, via, ipip, report] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getFamilyBackground(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
    getAnalysisReport(clientId),
  ]);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

  const clientName     = profile.firstName ?? "the client";
  const clientFullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "the client";

  // ── Parse VIA ──
  const viaRanked: Array<{ name: string; score: number; rank: number }> = (() => {
    try {
      const r = via?.rankedStrengths;
      if (!r) return [];
      return typeof r === "string" ? JSON.parse(r) : (r as any[]);
    } catch { return []; }
  })();

  // ── Parse IPIP ──
  const domainScores: Record<string, number> = (() => {
    try {
      const d = ipip?.domainScores;
      if (!d) return {};
      return typeof d === "string" ? JSON.parse(d) : (d as Record<string, number>);
    } catch { return {}; }
  })();

  // ── Insights colour ──
  const eScore = domainScores["E"] ?? 50;
  const aScore = domainScores["A"] ?? 50;
  const insightsColour = Object.keys(domainScores).length > 0
    ? deriveInsightsColour(eScore, aScore)
    : null;

  // ── WOW report sections (if generated) ──
  let wowSummary: string | null = null;
  let wowLifeHistoryPattern: string | null = null;
  if (report?.wowReportJson) {
    try {
      const wow = JSON.parse(report.wowReportJson) as Record<string, string>;
      wowSummary           = wow.summary           ?? null;
      wowLifeHistoryPattern = wow.lifeHistoryPattern ?? null;
    } catch { /* ignore */ }
  }

  // ── Canonical Stage 1 (life history analysis) ──
  const canonicalStage1 = report?.canonicalStage1 ?? null;

  // ── Build the context string ──
  const lines: string[] = [];

  lines.push(`CLIENT: ${clientFullName}`);
  if (profile.currentRole) lines.push(`CURRENT ROLE: ${profile.currentRole}`);
  if (profile.currentOrg)  lines.push(`CURRENT ORGANISATION: ${profile.currentOrg}`);

  // The richest single source: the WOW report summary ("Tell Me About Yourself")
  if (wowSummary) {
    lines.push("\n--- LIFEWORK SUMMARY (Tell Me About Yourself) ---");
    lines.push(wowSummary);
  }

  // Life history pattern from WOW report
  if (wowLifeHistoryPattern) {
    lines.push("\n--- LIFE HISTORY PATTERN ---");
    lines.push(wowLifeHistoryPattern);
  } else if (canonicalStage1) {
    lines.push("\n--- LIFE HISTORY PATTERN (Canonical Stage 1) ---");
    lines.push(canonicalStage1);
  }

  // Life history achievements (raw data — always include as grounding)
  if (achievementsList.length > 0) {
    lines.push("\n--- LIFE HISTORY ACHIEVEMENTS ---");
    for (const a of achievementsList) {
      lines.push(`[${a.decade?.toUpperCase() ?? "??"}, Age ${a.age ?? "?"}] ${a.title} (${a.esf ?? "?"})`);
      if (a.description)         lines.push(`  ${a.description}`);
      if (a.othersObservations)  lines.push(`  Others observed: ${a.othersObservations}`);
      if (a.sageEnrichment)      lines.push(`  Sage detail: ${a.sageEnrichment}`);
      if (a.counsellorNotes)     lines.push(`  Counsellor notes: ${a.counsellorNotes}`);
    }
  }

  // Family background
  if (family) {
    lines.push("\n--- FAMILY BACKGROUND ---");
    if (family.fatherOccupation)     lines.push(`Father: ${family.fatherOccupation}`);
    if (family.motherOccupation)     lines.push(`Mother: ${family.motherOccupation}`);
    if (family.siblingPosition)      lines.push(`Sibling position: ${family.siblingPosition}`);
    if (family.upbringingLocation)   lines.push(`Upbringing: ${family.upbringingLocation}`);
    if (family.familyNarrative)      lines.push(`Family narrative: ${family.familyNarrative}`);
    if (family.significantInfluences) lines.push(`Significant influences: ${family.significantInfluences}`);
  }

  // VIA top 7 strengths
  if (viaRanked.length > 0) {
    lines.push("\n--- VIA CHARACTER STRENGTHS (top 7) ---");
    viaRanked.slice(0, 7).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.name}`);
    });
  }

  // Big Five personality
  if (Object.keys(domainScores).length > 0) {
    lines.push("\n--- PERSONALITY PROFILE (Big Five, percentile 0-100) ---");
    for (const [key, val] of Object.entries(domainScores)) {
      const label = BIG5_LABELS[key];
      if (label) {
        const descriptor = val >= 60 ? label.high : val <= 40 ? label.low : `moderate ${label.name.toLowerCase()}`;
        lines.push(`${label.name}: ${val} — ${descriptor}`);
      }
    }
    if (insightsColour) lines.push(`Insights colour energy: ${insightsColour}`);
  }

  return {
    clientName,
    clientFullName,
    contextText: lines.join("\n"),
    tellMeAboutYourself: wowSummary,
    lifeHistoryPattern: wowLifeHistoryPattern ?? canonicalStage1,
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────
const ROLE_DECODER_SYSTEM = `You are a senior career counsellor working within the Lifework methodology developed by Pennington Hennessy. Your role is to help counsellors show their clients the connection between who they genuinely are — as revealed by their life history — and what a specific job is actually asking for.

THE LIFEWORK PRINCIPLE
A job description is written in the language of responsibilities, qualifications, and sector experience. Beneath that language is a set of underlying problems the role exists to solve, and a set of human qualities that would make someone genuinely good at solving them. These are rarely stated explicitly. Your job is to decode them — and then to show where the client's alive pattern connects.

YOUR OUTPUT FORMAT
You must return a JSON object with exactly three fields:

{
  "roleCore": "...",
  "patternConnection": "...",
  "interviewLanguage": "..."
}

FIELD DEFINITIONS

roleCore (3-4 paragraphs)
Strip away the HR language and surface what this role is actually asking for. What problems does it exist to solve? What kind of person would thrive in it — not in terms of qualifications, but in terms of how they think, what energises them, what environment they need? Be specific and direct. Do not summarise the JD — decode it.

patternConnection (3-4 paragraphs)
Show where the client's alive pattern — as revealed by their life history, character strengths, and personality profile — connects to what the role is actually asking for. Be specific: name actual achievements, actual strengths, actual patterns from their history. Do not make generic claims. The connection must be grounded in the client's real data. Where the fit is genuine, say so clearly. Where there are tensions or gaps, name them honestly — this is useful information for the counsellor.

interviewLanguage (3-4 paragraphs)
Give the client the specific language they would need to use in an interview to make this connection visible to a hiring manager. Not generic interview advice — specific sentences, framings, and examples drawn from their actual history that would allow a hiring manager to see the fit. Write this as if coaching the client directly: "You might say something like..." or "When they ask about X, the honest answer from your history is...". The goal is to help the client speak about themselves in a way that is both true and legible to the employer.

TONE
Professional, warm, direct. Not corporate. Not HR. Write as a thoughtful senior counsellor who has read the client's file carefully and is speaking to a colleague. Avoid jargon. Avoid hedging. If the fit is strong, say so. If it is partial, say so. If there is a specific gap the client would need to address, name it.`;

// ─── Router ───────────────────────────────────────────────────────────────────
export const roleDecoderRouter = router({
  /**
   * decode
   *
   * Input:  { clientId: number, jobDescription: string }
   * Output: { roleCore: string, patternConnection: string, interviewLanguage: string }
   *
   * Counsellor-only (protectedProcedure — admin role checked in the procedure body).
   */
  decode: protectedProcedure
    .input(
      z.object({
        clientId:       z.number().int().positive(),
        jobDescription: z.string().min(50, "Please paste at least 50 characters of the job description"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Gate: counsellors only
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Role Decoder is available to counsellors only." });
      }

      const { clientId, jobDescription } = input;

      // Assemble client profile context
      const { clientFullName, contextText } = await buildRoleDecoderContext(clientId);

      // Build the user prompt
      const userPrompt = `You are decoding a job description for ${clientFullName}.

CLIENT PROFILE
${contextText}

JOB DESCRIPTION
${jobDescription}

Decode this role against ${clientFullName}'s alive pattern. Return the three-section JSON object as specified.`;

      // Call the LLM
      const apiUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "https://forge.manus.im").replace(/\/$/, "");
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";

      const resp = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          messages: [
            { role: "system", content: ROLE_DECODER_SYSTEM },
            { role: "user",   content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name:   "role_decoder_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  roleCore:          { type: "string", description: "What the role is actually asking for beneath the JD language" },
                  patternConnection: { type: "string", description: "Where the client's alive pattern connects to that" },
                  interviewLanguage: { type: "string", description: "What the client needs to say to make the connection visible" },
                },
                required:             ["roleCore", "patternConnection", "interviewLanguage"],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 3000,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: `LLM request failed: ${resp.status} ${errText.slice(0, 200)}`,
        });
      }

      const json = await resp.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const raw = json.choices?.[0]?.message?.content ?? "";

      let parsed: { roleCore: string; patternConnection: string; interviewLanguage: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: "The LLM returned an unexpected response format. Please try again.",
        });
      }

      if (!parsed.roleCore || !parsed.patternConnection || !parsed.interviewLanguage) {
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: "The LLM response was incomplete. Please try again.",
        });
      }

      return {
        roleCore:          parsed.roleCore,
        patternConnection: parsed.patternConnection,
        interviewLanguage: parsed.interviewLanguage,
      };
    }),
});

export type RoleDecoderRouter = typeof roleDecoderRouter;
