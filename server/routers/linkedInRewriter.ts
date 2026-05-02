/**
 * linkedInRewriter.ts
 *
 * Counsellor-only tRPC router that generates a LinkedIn profile rewrite
 * from the client's Lifework data.
 *
 * Outputs:
 *   headline         — 220-char positioning statement
 *   aboutSection     — 3-paragraph About narrative
 *   experienceGuide  — Per-role framing notes (up to 5 most recent roles)
 *
 * Optional input: existingProfile (raw LinkedIn text) for a polish pass.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getClientProfileById,
  getAchievements,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
  getCareerHistory,
} from "../db";

// ─── System prompt ────────────────────────────────────────────────────────────

const LINKEDIN_REWRITER_SYSTEM = `You are a senior career counsellor and editor working within the Lifework methodology developed by Pennington Hennessy. Your task is to write or rewrite a client's LinkedIn profile so that it expresses who they genuinely are — as revealed by their life history and Lifework analysis — rather than a generic professional summary.

THE LIFEWORK PRINCIPLE
Most LinkedIn profiles describe what a person has done. A Lifework-informed profile describes who they are: the underlying pattern that has been present across every role, and the specific combination of strengths that makes them effective. This is more distinctive, more memorable, and more honest than a list of job titles.

YOUR OUTPUT FORMAT
Return a JSON object with exactly three fields:

{
  "headline": "...",
  "aboutSection": "...",
  "experienceGuide": "..."
}

FIELD SPECIFICATIONS

headline
A single line of 220 characters or fewer. This is the positioning statement that appears beneath the client's name. It should:
- Name the client's functional identity (what they actually do, not just their job title)
- Hint at the underlying pattern or quality that makes them distinctive
- Be specific enough to be interesting, not so specific it excludes relevant opportunities
- Sound like a person, not a job description
- NOT use clichés: "passionate about", "results-driven", "dynamic", "strategic thinker", "thought leader"
Format: plain text, no markdown, no line breaks.

aboutSection
Three short paragraphs in first person ("I"), warm, direct, professional. No bullet points. No subheadings. No padding. Every sentence must earn its place.

STRICT WORD COUNTS — these are hard limits, not targets:
- Paragraph 1 (The Hook): 40–50 words. This is what LinkedIn shows before "see more" — it must earn the click. Open with a single specific observation about the thread that runs through this person's work. Make it feel like a person speaking honestly, not a corporate bio.
- Paragraph 2 (The Strengths): 60–70 words. Name the specific combination of qualities that makes this person effective. Use evidence from the life history — not abstract competency language. Ground every claim in something real.
- Paragraph 3 (The Direction): 60–70 words. Where are they headed and why? Connect the pattern to the kind of work they are now looking for or building toward. End with one sentence that makes the reader want to speak with them.

Total target: 160–190 words. If you exceed 200 words, cut — do not add.

Format: three paragraphs separated by a blank line. No markdown. Plain text.

experienceGuide
A structured guide for rewriting the client's most recent roles. For each role provided, write:
- A one-sentence "framing note" that names which aspect of the client's pattern this role most clearly demonstrates
- Two or three specific bullet-point starters (beginning with a strong past-tense verb) that the client could adapt for their own Experience section
- A one-sentence note on what NOT to lead with in this role (the thing that sounds impressive but misrepresents the pattern)

Format: use markdown. For each role, use a ## heading with the role title and organisation. Then: **Framing note:** [sentence]. **Lead bullets:** [bullet list]. **Avoid leading with:** [sentence].

If no career history is provided, write a brief note explaining that the Experience Guide requires career history data and offer three general principles for rewriting Experience entries in line with the Lifework pattern.

TONE
Direct, warm, specific. Write as a thoughtful senior editor who knows this person well. Avoid corporate language. Avoid hedging. The output should sound like the client at their most articulate and self-aware — not like a recruitment consultant wrote it.

If an existing LinkedIn profile is provided, use it as raw material: preserve any specific achievements or facts that are accurate, but reframe the language to express the pattern rather than just the responsibilities.`;

// ─── Build context ────────────────────────────────────────────────────────────

async function buildLinkedInContext(clientId: number): Promise<{
  clientFullName: string;
  contextText: string;
}> {
  const [profile, achievements, via, ipip, report, careerHistoryRows] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
    getAnalysisReport(clientId),
    getCareerHistory(clientId),
  ]);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

  const clientFullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "the client";

  // ── Parse VIA ──
  const viaRanked: Array<{ name: string; score: number; rank: number }> = (() => {
    try {
      const r = via?.rankedStrengths;
      if (!r) return [];
      return typeof r === "string" ? JSON.parse(r) : (r as Array<{ name: string; score: number; rank: number }>);
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

  // ── WOW report sections ──
  let wowSummary: string | null = null;
  let wowLifeHistoryPattern: string | null = null;
  let wowCareerDirections: string | null = null;
  let wowConclusions: string | null = null;

  if (report?.wowReportJson) {
    try {
      const wow = JSON.parse(report.wowReportJson) as Record<string, string>;
      wowSummary            = wow.summary            ?? null;
      wowLifeHistoryPattern = wow.lifeHistoryPattern  ?? null;
      wowCareerDirections   = wow.careerDirections    ?? null;
      wowConclusions        = wow.conclusions         ?? null;
    } catch { /* ignore */ }
  }

  const canonicalStage1 = report?.canonicalStage1 ?? null;

  const lines: string[] = [];
  lines.push(`CLIENT: ${clientFullName}`);
  if (profile.currentRole) lines.push(`CURRENT ROLE: ${profile.currentRole}`);
  if (profile.currentOrg)  lines.push(`CURRENT ORGANISATION: ${profile.currentOrg}`);

  if (wowSummary) {
    lines.push("\n--- LIFEWORK SUMMARY (Tell Me About Yourself) ---");
    lines.push(wowSummary);
  }

  if (wowLifeHistoryPattern) {
    lines.push("\n--- LIFE HISTORY PATTERN ---");
    lines.push(wowLifeHistoryPattern);
  } else if (canonicalStage1) {
    lines.push("\n--- LIFE HISTORY PATTERN (Canonical Stage 1) ---");
    lines.push(canonicalStage1);
  }

  if (wowCareerDirections) {
    lines.push("\n--- CAREER DIRECTIONS ---");
    lines.push(wowCareerDirections);
  }

  if (wowConclusions) {
    lines.push("\n--- CONCLUSIONS (including Tell Me About Yourself interview answer) ---");
    lines.push(wowConclusions);
  }

  // Key achievements (grounding data)
  if (achievements.length > 0) {
    lines.push("\n--- KEY ACHIEVEMENTS FROM LIFE HISTORY ---");
    for (const a of achievements) {
      lines.push(`[${a.decade?.toUpperCase() ?? "??"}, Age ${a.age ?? "?"}] ${a.title}`);
      if (a.description) lines.push(`  ${a.description}`);
    }
  }

  // VIA top 7
  if (viaRanked.length > 0) {
    lines.push("\n--- VIA CHARACTER STRENGTHS (top 7) ---");
    viaRanked.slice(0, 7).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.name}`);
    });
  }

  // Big Five
  const BIG5_LABELS: Record<string, { name: string; low: string; high: string }> = {
    N: { name: "Neuroticism",       low: "Emotionally stable and calm",         high: "Emotionally reactive and sensitive" },
    E: { name: "Extraversion",      low: "Reflective and independent",          high: "Energised by people and action" },
    O: { name: "Openness",          low: "Practical and conventional",          high: "Imaginative and intellectually curious" },
    A: { name: "Agreeableness",     low: "Direct and task-focused",             high: "Collaborative and relationship-oriented" },
    C: { name: "Conscientiousness", low: "Flexible and spontaneous",            high: "Organised, disciplined, and goal-driven" },
  };
  if (Object.keys(domainScores).length > 0) {
    lines.push("\n--- PERSONALITY PROFILE (Big Five, percentile 0-100) ---");
    for (const [key, val] of Object.entries(domainScores)) {
      const label = BIG5_LABELS[key];
      if (label) {
        const descriptor = val >= 60 ? label.high : val <= 40 ? label.low : `moderate ${label.name.toLowerCase()}`;
        lines.push(`${label.name}: ${val} — ${descriptor}`);
      }
    }
  }

  // Career history (most recent 5 roles)
  if (careerHistoryRows.length > 0) {
    lines.push("\n--- CAREER HISTORY (most recent roles) ---");
    const recent = [...careerHistoryRows].slice(0, 5);
    for (const r of recent) {
      const period = [r.yearFrom, r.yearTo].filter(Boolean).join("–") || "dates unknown";
      lines.push(`${r.role ?? "Role unknown"} at ${r.organisation} (${period})`);
      if (r.keyResponsibilities) lines.push(`  Responsibilities: ${r.keyResponsibilities}`);
      if (r.highlights)          lines.push(`  Highlights: ${r.highlights}`);
    }
  }

  return { clientFullName, contextText: lines.join("\n") };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const linkedInRewriterRouter = router({
  /**
   * generate
   *
   * Input:  { clientId: number, existingProfile?: string }
   * Output: { headline: string, aboutSection: string, experienceGuide: string }
   *
   * Counsellor-only (admin role required).
   */
  generate: protectedProcedure
    .input(
      z.object({
        clientId:        z.number().int().positive(),
        existingProfile: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "LinkedIn Rewriter is available to counsellors only." });
      }

      const { clientId, existingProfile } = input;
      const { clientFullName, contextText } = await buildLinkedInContext(clientId);

      const existingSection = existingProfile?.trim()
        ? `\n\nEXISTING LINKEDIN PROFILE (rewrite and improve this using the Lifework data above)\n${existingProfile.trim()}`
        : "";

      const userPrompt = `Generate a LinkedIn profile rewrite for ${clientFullName}.

CLIENT LIFEWORK DATA
${contextText}${existingSection}

Return the three-field JSON object as specified in your system prompt.`;

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
            { role: "system", content: LINKEDIN_REWRITER_SYSTEM },
            { role: "user",   content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name:   "linkedin_rewrite_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  headline:        { type: "string", description: "220-char LinkedIn headline" },
                  aboutSection:    { type: "string", description: "Three-paragraph About section in first person" },
                  experienceGuide: { type: "string", description: "Per-role framing guide in markdown" },
                },
                required:             ["headline", "aboutSection", "experienceGuide"],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 4000,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: `LLM request failed: ${resp.status} ${errText.slice(0, 200)}`,
        });
      }

      const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
      const raw  = json.choices?.[0]?.message?.content ?? "";

      let parsed: { headline: string; aboutSection: string; experienceGuide: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: "The LLM returned an unexpected response format. Please try again.",
        });
      }

      if (!parsed.headline || !parsed.aboutSection || !parsed.experienceGuide) {
        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: "The LLM response was incomplete. Please try again.",
        });
      }

      return {
        headline:        parsed.headline,
        aboutSection:    parsed.aboutSection,
        experienceGuide: parsed.experienceGuide,
      };
    }),
});

export type LinkedInRewriterRouter = typeof linkedInRewriterRouter;
