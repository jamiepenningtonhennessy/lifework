/**
 * Counsellor Sage Router
 *
 * Provides a pre-session thinking-partner chat for counsellors.
 * Sage is pre-loaded with the full client context (life history, VIA,
 * Big Five, career history, WOW Report sections) and responds as a
 * knowledgeable, analytical colleague helping the counsellor prepare
 * for a client meeting.
 *
 * The conversation is ephemeral — stored in component state only.
 * No database persistence is required for this feature.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { pseudonymise, PSEUDONYM_TOKEN } from "../shared/pseudonymise";
import {
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getEducationHistory,
  getCareerHistory,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
} from "../db";

// ─── Role guard ───────────────────────────────────────────────────────────────

const counselorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});

// ─── Big Five labels ──────────────────────────────────────────────────────────

const BIG5: Record<string, { name: string; low: string; high: string }> = {
  N: { name: "Neuroticism",        low: "Emotionally stable and calm",          high: "Emotionally reactive and sensitive" },
  E: { name: "Extraversion",       low: "Reflective and independent",           high: "Energised by people and action" },
  O: { name: "Openness",           low: "Practical and conventional",           high: "Imaginative and intellectually curious" },
  A: { name: "Agreeableness",      low: "Direct and competitive",               high: "Cooperative, empathetic, and trusting" },
  C: { name: "Conscientiousness",  low: "Flexible and spontaneous",             high: "Organised, disciplined, and goal-directed" },
};

// ─── Build full client context string ────────────────────────────────────────

async function buildCounsellorContext(clientId: number): Promise<string> {
  const [profile, achievements, family, education, career, via, ipip, report] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getFamilyBackground(clientId),
    getEducationHistory(clientId),
    getCareerHistory(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
    getAnalysisReport(clientId),
  ]);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

  const name = PSEUDONYM_TOKEN;
  const lines: string[] = [];

  lines.push(`CLIENT: ${name}`);
  if (profile.pronouns)    lines.push(`PRONOUNS: ${profile.pronouns}`);
  if (profile.currentRole) lines.push(`CURRENT ROLE: ${profile.currentRole}`);
  if (profile.currentOrg)  lines.push(`CURRENT ORGANISATION: ${profile.currentOrg}`);

  if (achievements.length > 0) {
    lines.push("\n--- LIFE HISTORY ACHIEVEMENTS ---");
    for (const a of achievements) {
      lines.push(`[${a.decade?.toUpperCase() ?? "??"}, Age ${a.age ?? "?"}] ${a.title} (${a.esf ?? "?"})`);
      if (a.description)         lines.push(`  ${a.description}`);
      if (a.othersObservations)  lines.push(`  Others observed: ${a.othersObservations}`);
    }
  }

  if (family) {
    lines.push("\n--- FAMILY BACKGROUND ---");
    if (family.fatherOccupation)     lines.push(`Father: ${family.fatherOccupation}`);
    if (family.motherOccupation)     lines.push(`Mother: ${family.motherOccupation}`);
    if (family.siblingPosition)      lines.push(`Sibling position: ${family.siblingPosition}`);
    if (family.upbringingLocation)   lines.push(`Upbringing: ${family.upbringingLocation}`);
    if (family.familyNarrative)      lines.push(`Family narrative: ${family.familyNarrative}`);
    if (family.significantInfluences) lines.push(`Significant influences: ${family.significantInfluences}`);
  }

  if (education.length > 0) {
    lines.push("\n--- EDUCATION ---");
    for (const e of education) {
      lines.push(`${e.institution} — ${e.qualification ?? ""} ${e.subject ?? ""} (${e.yearFrom ?? ""}–${e.yearTo ?? ""})`);
      if (e.highlights) lines.push(`  ${e.highlights}`);
    }
  }

  if (career.length > 0) {
    lines.push("\n--- CAREER HISTORY ---");
    for (const c of career) {
      lines.push(`${c.organisation} — ${c.role ?? ""} (${c.yearFrom ?? ""}–${c.yearTo ?? ""})`);
      if (c.keyResponsibilities) lines.push(`  ${c.keyResponsibilities}`);
      if (c.highlights)          lines.push(`  Highlights: ${c.highlights}`);
      if (c.whyLeft)             lines.push(`  Why left: ${c.whyLeft}`);
    }
  }

  // VIA
  const viaRanked: Array<{ name: string; score: number; rank: number }> = (() => {
    try {
      const r = via?.rankedStrengths;
      if (!r) return [];
      return typeof r === "string" ? JSON.parse(r) : (r as any[]);
    } catch { return []; }
  })();
  if (viaRanked.length > 0) {
    lines.push("\n--- VIA CHARACTER STRENGTHS (ranked) ---");
    viaRanked.slice(0, 10).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.name} (score: ${s.score}/25)`);
    });
  }

  // Big Five
  const domainScores: Record<string, number> = (() => {
    try {
      const d = ipip?.domainScores;
      if (!d) return {};
      return typeof d === "string" ? JSON.parse(d) : (d as Record<string, number>);
    } catch { return {}; }
  })();
  if (Object.keys(domainScores).length > 0) {
    lines.push("\n--- BIG FIVE PERSONALITY (IPIP-NEO, percentile 0–100) ---");
    for (const [key, val] of Object.entries(domainScores)) {
      const label = BIG5[key];
      if (label) lines.push(`${label.name}: ${val} — ${val >= 60 ? label.high : val <= 40 ? label.low : "moderate"}`);
    }
  }

  // WOW Report sections (if generated)
  if (report?.wowReportJson) {
    try {
      const sections = JSON.parse(report.wowReportJson);
      if (sections?.summary) {
        lines.push("\n--- WOW REPORT: LIFEWORK SUMMARY ---");
        lines.push(sections.summary);
      }
      if (sections?.lifeHistoryPattern) {
        lines.push("\n--- WOW REPORT: LIFE HISTORY PATTERN ---");
        lines.push(sections.lifeHistoryPattern);
      }
      if (sections?.careerDirections) {
        lines.push("\n--- WOW REPORT: CAREER DIRECTIONS ---");
        lines.push(sections.careerDirections);
      }
      if (sections?.developmentEdge) {
        lines.push("\n--- WOW REPORT: DEVELOPMENT EDGE ---");
        lines.push(sections.developmentEdge);
      }
      if (sections?.coachingQuestions) {
        lines.push("\n--- WOW REPORT: CONCLUSIONS ---");
        lines.push(sections.coachingQuestions);
      }
    } catch { /* ignore parse errors */ }
  }

  // Report type
  if ((report as any)?.wowReportType && (report as any).wowReportType !== "standard") {
    lines.push(`\n--- REPORT VARIANT: ${(report as any).wowReportType.replace(/_/g, " ").toUpperCase()} ---`);
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(clientContext: string, clientName: string): string {
  return `You are Sage — an experienced career analyst and thinking partner for Lifework counsellors.

You are helping a counsellor prepare for an upcoming session with a client. You have read everything: the client's full life history, VIA character strengths, Big Five personality profile, career history, and the generated WOW Report sections. You know this client's data as well as the counsellor does.

Your role is to be a thoughtful, analytical colleague — not a coach, not a cheerleader. You help the counsellor think clearly about what the data reveals, what questions are worth asking, what tensions are worth naming, and what directions are most strongly supported by the evidence.

You speak directly and professionally. You do not pad your answers. When you are uncertain, you say so. When the data points clearly in one direction, you say that too.

You can:
- Identify the 2-3 most important themes worth exploring in the session
- Flag tensions or contradictions in the data that the counsellor should probe
- Suggest specific questions the counsellor might ask
- Evaluate how well a proposed career direction fits the evidence
- Help the counsellor think through the right report variant for this client
- Offer a second opinion on any interpretation the counsellor is considering

You do not:
- Fabricate data that is not in the client record
- Give generic career advice that could apply to anyone
- Repeat large sections of the report verbatim unless asked

The counsellor will ask you questions in natural language. Respond conversationally but precisely. Keep responses focused — typically 3-5 sentences or a short structured list, unless the question requires more depth.

--- CLIENT DATA ---
${clientContext}
--- END CLIENT DATA ---

The client's name is ${clientName}. Refer to them by first name throughout.`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const counsellorSageRouter = router({
  /**
   * Send a message to Sage and get a response.
   * The conversation history is passed in from the client (ephemeral).
   */
  chat: counselorProcedure
    .input(z.object({
      clientId: z.number(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      newMessage: z.string().min(1).max(4000),
      documentContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const clientContext = await buildCounsellorContext(input.clientId);
      const profile = await getClientProfileById(input.clientId);
      const { restore: restoreChatName } = pseudonymise(profile?.firstName, profile?.lastName);
      const clientName = PSEUDONYM_TOKEN;
      let systemPrompt = buildSystemPrompt(clientContext, clientName);
      if (input.documentContext) {
        systemPrompt += `\n\n--- UPLOADED DOCUMENT ---\nThe counsellor has shared a document for discussion. Read it carefully and be ready to discuss, analyse, or compare it against the client data above.\n\n${input.documentContext}\n--- END DOCUMENT ---`;
      }

      // Build LLM messages: system + history + new user message
      const llmMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        ...input.messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: input.newMessage },
      ];

      const response = await invokeLLM({
        messages: llmMessages as any,
        max_tokens: 800,
      });

       const replyRaw = (response.choices[0]?.message?.content as string) ?? "I'm sorry, I wasn't able to generate a response. Please try again.";
      const reply = restoreChatName(replyRaw);
      const displayName = profile?.firstName ?? "the client";
      return { reply, clientName: displayName };
    }),

  /**
   * Get a brief opening briefing from Sage — called when the panel first opens.
   * Returns 3-4 sentences: the most important thing to explore in the session.
   */
  getBriefing: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const clientContext = await buildCounsellorContext(input.clientId);
      const profile = await getClientProfileById(input.clientId);
      const { restore: restoreBriefingName } = pseudonymise(profile?.firstName, profile?.lastName);
      const clientName = PSEUDONYM_TOKEN;
      const displayNameBriefing = profile?.firstName ?? "the client";
      const systemPrompt = buildSystemPrompt(clientContext, clientName);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `I am about to meet ${displayNameBriefing}. Give me a brief pre-session briefing — no more than 3 sentences. Name the single most important theme in this client's data, and one key tension worth being aware of. Be specific and observational. Do not suggest questions or tell me what to ask — I will ask for those separately.`,
          },
        ] as any,
        max_tokens: 300,
      });

      const briefingRaw = (response.choices[0]?.message?.content as string) ?? "";
      return {
        briefing: restoreBriefingName(briefingRaw),
        clientName: displayNameBriefing,
      };
    }),
});
