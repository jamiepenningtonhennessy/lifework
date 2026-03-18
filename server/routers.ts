import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getOrCreateClientProfile,
  getClientProfileByUserId,
  getClientProfileById,
  updateClientProfile,
  getAllClientProfiles,
  getAchievements,
  upsertAchievement,
  deleteAchievement,
  getFamilyBackground,
  upsertFamilyBackground,
  getEducationHistory,
  upsertEducation,
  deleteEducation,
  getCareerHistory,
  upsertCareer,
  deleteCareer,
  getViaResults,
  upsertViaResults,
  getIpipResults,
  upsertIpipResults,
  getInterviewMessages,
  addInterviewMessage,
  getAnalysisReport,
  upsertAnalysisReport,
  getAllHistoricalClients,
  getParallelMatches,
  saveParallelMatches,
  updateMatchNotes,
  getOrCreateChatSession,
  appendChatMessage,
  saveChatSummary,
  getChatSessionsByClient,
  getChatSessionById,
  resetChatSession,
  type ChatMessage,
  getOrCreateCareerExplorerSession,
  appendCareerExplorerMessage,
  getCareerExplorerSession,
  clearCareerExplorerSession,
  type CareerExplorerMessage,
  getCoachingAnnex,
  upsertCoachingAnnex,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { scoreVia, VIA_QUESTIONS, VIA_STRENGTHS } from "../shared/via-data";
import { scoreIpip, ipipCareerNarrative } from "../shared/ipip-data";

// ─── Helper: require counselor/admin role ────────────────────────────────────
const counselorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});

// ─── Client Profile Router ───────────────────────────────────────────────────
const profileRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreateClientProfile(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        dateOfBirth: z.string().optional(),
        currentRole: z.string().optional(),
        currentOrg: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      await updateClientProfile(profile.id, input);
      return { success: true };
    }),
});

// ─── Interview Router ────────────────────────────────────────────────────────
const interviewRouter = router({
  getMessages: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getInterviewMessages(profile.id);
  }),

  sendMessage: protectedProcedure
    .input(z.object({ content: z.string(), phase: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);

      // Save user message
      await addInterviewMessage({
        clientId: profile.id,
        role: "user",
        content: input.content,
        phase: input.phase,
      });

      // Get conversation history for context
      const history = await getInterviewMessages(profile.id);
      const messages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Build system prompt
      const systemPrompt = `You are a warm, empathetic career counsellor conducting a structured life history interview based on the Dependable Strengths methodology of Bernard Haldane, as practised by Pennington Hennessy. Your role is to guide the client through a reflective journey of their life story.

Your approach:
- Ask one question at a time. Never ask multiple questions at once.
- Be genuinely curious and encouraging. Reflect back what you hear.
- Focus on achievements, enjoyable experiences, and moments of fulfillment.
- Gently probe for the underlying skills, motivations, and feelings behind each story.
- Move through life decades naturally: childhood → teens → twenties → thirties → forties → fifties+
- Also cover: family background, education, and career history.
- When a client shares an achievement, ask them to classify it: was it primarily Enjoyable (fun, playful), Satisfying (a job well done), or Fulfilling (deeply meaningful)?
- Look for recurring patterns and themes across their stories.
- Keep responses concise (2-4 sentences) and end with a single, open question.
- Be professional and friendly. This is a safe, confidential space.

Current phase: ${input.phase ?? "life history"}

Start by warmly welcoming the client if this is the first message, then begin with childhood memories.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      });

      const assistantContent =
        (response.choices[0]?.message?.content as string) ?? "I'm here to listen. Please continue.";

      // Save assistant response
      await addInterviewMessage({
        clientId: profile.id,
        role: "assistant",
        content: assistantContent,
        phase: input.phase,
      });

      // Update interview status
      if (profile.interviewStatus === "not_started") {
        await updateClientProfile(profile.id, { interviewStatus: "in_progress" });
      }

      return { content: assistantContent };
    }),

  completeInterview: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    await updateClientProfile(profile.id, { interviewStatus: "completed" });
    return { success: true };
  }),
});

// ─── Achievements Router ─────────────────────────────────────────────────────
const achievementsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getAchievements(profile.id);
  }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        decade: z.enum(["childhood", "teens", "twenties", "thirties", "forties", "fifties", "sixties_plus"]),
        title: z.string(),
        age: z.number().optional(),
        description: z.string().optional(),
        esf: z.enum(["enjoyable", "satisfying", "fulfilling"]).optional(),
        skills: z.string().optional(),
        othersObservations: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const id = await upsertAchievement({ ...input, clientId: profile.id });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAchievement(input.id);
      return { success: true };
    }),
});

// ─── Background Router ────────────────────────────────────────────────────────
const backgroundRouter = router({
  getFamily: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getFamilyBackground(profile.id);
  }),

  saveFamily: protectedProcedure
    .input(
      z.object({
        fatherOccupation: z.string().optional(),
        motherOccupation: z.string().optional(),
        siblingPosition: z.string().optional(),
        upbringingLocation: z.string().optional(),
        familyNarrative: z.string().optional(),
        significantInfluences: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      await upsertFamilyBackground({ ...input, clientId: profile.id });
      return { success: true };
    }),

  getEducation: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getEducationHistory(profile.id);
  }),

  saveEducation: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        institution: z.string(),
        qualification: z.string().optional(),
        subject: z.string().optional(),
        yearFrom: z.string().optional(),
        yearTo: z.string().optional(),
        highlights: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const id = await upsertEducation({ ...input, clientId: profile.id });
      return { id };
    }),

  deleteEducation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteEducation(input.id);
      return { success: true };
    }),

  getCareer: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getCareerHistory(profile.id);
  }),

  saveCareer: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        organisation: z.string(),
        role: z.string().optional(),
        yearFrom: z.string().optional(),
        yearTo: z.string().optional(),
        keyResponsibilities: z.string().optional(),
        whyLeft: z.string().optional(),
        highlights: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const id = await upsertCareer({ ...input, clientId: profile.id });
      return { id };
    }),

  deleteCareer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCareer(input.id);
      return { success: true };
    }),
});

// ─── VIA Router ──────────────────────────────────────────────────────────────
const viaRouter = router({
  getQuestions: publicProcedure.query(() => {
    return { questions: VIA_QUESTIONS, strengths: VIA_STRENGTHS };
  }),

  getMyResults: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getViaResults(profile.id);
  }),

  submitSurvey: protectedProcedure
    .input(z.object({ answers: z.record(z.string(), z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      // Convert string keys to numbers
      const numericAnswers: Record<number, number> = {};
      for (const [k, v] of Object.entries(input.answers)) {
        numericAnswers[parseInt(k)] = v;
      }
      const ranked = scoreVia(numericAnswers);
      const rawScores: Record<string, number> = {};
      for (const item of ranked) {
        rawScores[item.strengthId] = item.score;
      }
      await upsertViaResults({
        clientId: profile.id,
        rankedStrengths: ranked as any,
        rawScores: rawScores as any,
        completedAt: new Date(),
      });
      await updateClientProfile(profile.id, { viaStatus: "completed" });
      return { success: true, ranked };
    }),
});

// ─── IPIP Router ──────────────────────────────────────────────────────────────
const ipipRouter = router({
  getMyResults: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getIpipResults(profile.id);
  }),

  submit: protectedProcedure
    .input(z.object({ answers: z.record(z.string(), z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const numericAnswers: Record<number, number> = {};
      for (const [k, v] of Object.entries(input.answers)) {
        numericAnswers[parseInt(k)] = v;
      }
      const scores = scoreIpip(numericAnswers);
      await upsertIpipResults({
        clientId: profile.id,
        domainScores: scores.domainScores as any,
        facetScores: scores.facetScores as any,
        rawAnswers: numericAnswers as any,
        completedAt: new Date(),
      });
      await updateClientProfile(profile.id, { ipipStatus: "completed" });
      return { success: true, scores };
    }),
});

// ─── Analysis Router ─────────────────────────────────────────────────────────
const analysisRouter = router({
  getMyReport: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getAnalysisReport(profile.id);
  }),

  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    await updateClientProfile(profile.id, { analysisStatus: "in_progress" });

    // Gather all data
    const [messages, achievementsList, family, education, career, via, ipip, chatSessions] =
      await Promise.all([
        getInterviewMessages(profile.id),
        getAchievements(profile.id),
        getFamilyBackground(profile.id),
        getEducationHistory(profile.id),
        getCareerHistory(profile.id),
        getViaResults(profile.id),
        getIpipResults(profile.id),
        getChatSessionsByClient(profile.id),
      ]);

    const conversationText = messages
      .map((m) => `${m.role === "user" ? "Client" : "Counsellor"}: ${m.content}`)
      .join("\n");

    const achievementsText = achievementsList
      .map(
        (a) =>
          `[${a.decade}] ${a.title} (${a.esf ?? "unclassified"}): ${a.description ?? ""}`
      )
      .join("\n");

    const viaText =
      via && via.rankedStrengths
        ? (via.rankedStrengths as any[])
            .slice(0, 10)
            .map((s: any) => `${s.rank}. ${s.name} (score: ${s.score})`)
            .join("\n")
        : "No VIA data available";

    const ipipText = ipip && ipip.domainScores && ipip.facetScores
      ? ipipCareerNarrative({ domainScores: ipip.domainScores as any, facetScores: ipip.facetScores as any })
      : "No IPIP-NEO personality data available";

    const careerText = career
      .map((c) => `${c.yearFrom ?? "?"}-${c.yearTo ?? "present"}: ${c.role} at ${c.organisation}`)
      .join("\n");

    const educationText = education
      .map((e) => `${e.yearFrom ?? "?"}-${e.yearTo ?? "?"}: ${e.qualification ?? ""} ${e.subject ?? ""} at ${e.institution}`)
      .join("\n");

    // Build chat session summaries for injection into the prompt
    const lifeHistoryChat = chatSessions
      .filter(s => s.section === "life_history" && s.summary)
      .map(s => s.summary!)
      .join("\n\n");

    const careerEducationChat = chatSessions
      .filter(s => s.section === "career_education" && s.summary)
      .map(s => s.summary!)
      .join("\n\n");

    const prompt = `You are an expert career analyst using the narrative life history methodology of Bernard Haldane, as practised by Pennington Hennessy. You have been given a comprehensive set of data about a client. Your task is to produce a rich, insightful career analysis report.

## Client Data

### Life History Interview Conversation
${conversationText || "No interview data yet."}

### Structured Achievements (by decade, with ESF classification)
${achievementsText || "No achievements recorded yet."}

${lifeHistoryChat ? `### Chat with Sage: Life History Insights\n${lifeHistoryChat}\n` : ""}
${careerEducationChat ? `### Chat with Sage: Career & Education Insights\n${careerEducationChat}\n` : ""}
### Family Background
Father's occupation: ${family?.fatherOccupation ?? "Unknown"}
Mother's occupation: ${family?.motherOccupation ?? "Unknown"}
Sibling position: ${family?.siblingPosition ?? "Unknown"}
Upbringing: ${family?.upbringingLocation ?? "Unknown"}
Family narrative: ${family?.familyNarrative ?? "None"}
Significant influences: ${family?.significantInfluences ?? "None"}

### Education History
${educationText || "None recorded."}

### Career History
${careerText || "None recorded."}

### VIA Character Strengths (Top 10)
${viaText}

### IPIP-NEO-120 Personality Profile
${ipipText}

## Your Task

Produce a comprehensive career analysis report in Markdown format with the following sections:

1. **Executive Summary** — A 2-3 paragraph narrative portrait of this person.
2. **Core Strengths & Skills** — The recurring capabilities that appear across their life story.
3. **Driving Motivations** — What consistently energizes and fulfills them (not just what they are good at).
4. **Preferred Environments** — The conditions, cultures, and contexts in which they thrive.
5. **Career Themes** — The deeper patterns and threads running through their life and work.
6. **VIA Character Strengths Correlation** — How their top VIA strengths connect to and reinforce the patterns found in their life story.
7. **Personality Profile Interpretation (IPIP-NEO-120)** — Interpret the Big Five personality scores in the context of this person's career story. Note where personality traits reinforce or create tension with their life history patterns. This replaces the 16PF analysis used in traditional career counselling.
8. **Career Directions & Possibilities** — 3-5 specific career archetypes or directions that align with all the above, with a brief rationale for each.
9. **If this is true, these things will also be true...** — A set of bold, specific predictions about what this person needs, values, and will find meaningful in their next chapter.
10. **Questions for the Feedback Session** — 5 powerful questions the counsellor might explore with the client.

Write in a warm, insightful, and direct style. Be specific — use examples from their actual story. Avoid generic career advice.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert career analyst. Produce detailed, insightful, and specific reports." },
        { role: "user", content: prompt },
      ],
    });

    const reportMarkdown =
      (response.choices[0]?.message?.content as string) ?? "Analysis could not be generated.";

    // Parse sections from markdown
    const extractSection = (md: string, heading: string): string => {
      const regex = new RegExp(`##\\s*\\d*\\.?\\s*\\*?\\*?${heading}\\*?\\*?[^\n]*\n([\\s\\S]*?)(?=\n##|$)`, "i");
      const match = md.match(regex);
      return match ? match[1].trim() : "";
    };

    await upsertAnalysisReport({
      clientId: profile.id,
      fullReportMarkdown: reportMarkdown,
      coreStrengths: extractSection(reportMarkdown, "Core Strengths"),
      drivingMotivations: extractSection(reportMarkdown, "Driving Motivations"),
      preferredEnvironments: extractSection(reportMarkdown, "Preferred Environments"),
      keySkills: extractSection(reportMarkdown, "Core Strengths"),
      careerThemes: extractSection(reportMarkdown, "Career Themes"),
      viaCorrelation: extractSection(reportMarkdown, "VIA Character Strengths"),
      careerSuggestions: extractSection(reportMarkdown, "Career Directions"),
      generatedAt: new Date(),
    });

    await updateClientProfile(profile.id, { analysisStatus: "completed" });
    return { success: true };
  }),
});

// ─── Counselor Router ─────────────────────────────────────────────────────────
const counselorRouter = router({
  listClients: counselorProcedure.query(async () => {
    return getAllClientProfiles();
  }),

  getClientProfile: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const [profile, achievementsList, family, education, career, via, ipip, report, messages, chatSessions] =
        await Promise.all([
          getClientProfileById(input.clientId),
          getAchievements(input.clientId),
          getFamilyBackground(input.clientId),
          getEducationHistory(input.clientId),
          getCareerHistory(input.clientId),
          getViaResults(input.clientId),
          getIpipResults(input.clientId),
          getAnalysisReport(input.clientId),
          getInterviewMessages(input.clientId),
          getChatSessionsByClient(input.clientId),
        ]);
      return { profile, achievements: achievementsList, family, education, career, via, ipip, report, messages, chatSessions };
    }),

  saveNotes: counselorProcedure
    .input(z.object({ clientId: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await getAnalysisReport(input.clientId);
      if (existing) {
        await upsertAnalysisReport({
          clientId: input.clientId,
          counselorNotes: input.notes,
          generatedAt: existing.generatedAt,
        });
      }
      return { success: true };
    }),

  unlockCareerExplorer: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const profile = await getClientProfileById(input.clientId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      await updateClientProfile(input.clientId, { careerExplorerUnlocked: true });
      return { success: true };
    }),

  lockCareerExplorer: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const profile = await getClientProfileById(input.clientId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      await updateClientProfile(input.clientId, { careerExplorerUnlocked: false });
      return { success: true };
    }),

  generateCoachingSummary: counselorProcedure
    .input(z.object({ clientId: z.number(), forceRegenerate: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const profile = await getClientProfileById(input.clientId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      // Return cached version unless forced
      const existing = await getAnalysisReport(input.clientId);
      if (existing?.coachingSummaryJson && !input.forceRegenerate) {
        return { summary: JSON.parse(existing.coachingSummaryJson) };
      }

      const [achievementsList, family, education, career, via, ipip] = await Promise.all([
        getAchievements(input.clientId),
        getFamilyBackground(input.clientId),
        getEducationHistory(input.clientId),
        getCareerHistory(input.clientId),
        getViaResults(input.clientId),
        getIpipResults(input.clientId),
      ]);

      const clientName = profile.firstName ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "the client";

      const achievementsCtx = achievementsList.map(a => {
        const base = `[${a.decade}] ${a.title} (${a.esf ?? "?"}): ${a.description ?? ""}`;
        const others = (a as any).othersObservations?.trim();
        return others ? `${base}\n  Others said: ${others}` : base;
      }).join("\n") || "None recorded.";

      const careerCtx = career.map(c =>
        `${c.yearFrom ?? "?"}–${c.yearTo ?? "present"}: ${c.role ?? ""} at ${c.organisation ?? ""}`
      ).join("\n") || "None recorded.";

      const educationCtx = education.map(e =>
        `${e.yearFrom ?? "?"}–${e.yearTo ?? "?"}: ${e.qualification ?? ""} at ${e.institution}`
      ).join("\n") || "None recorded.";

      const viaCtx = via?.rankedStrengths
        ? (via.rankedStrengths as any[]).slice(0, 10).map((s: any, i: number) => `${i + 1}. ${s.strength}`).join("\n")
        : "VIA not completed.";

      const DOMAINS = ["N", "E", "O", "A", "C"] as const;
      const DOMAIN_NAMES: Record<string, string> = { N: "Neuroticism", E: "Extraversion", O: "Openness", A: "Agreeableness", C: "Conscientiousness" };
      const ipipCtx = ipip?.domainScores
        ? DOMAINS.map(d => `${DOMAIN_NAMES[d]}: ${Math.round(((ipip.domainScores as any)[d] ?? 0) * 100)}%`).join("\n")
        : "IPIP not completed.";


      const familyCtx = family
        ? `Father: ${family.fatherOccupation ?? "unknown"}; Mother: ${family.motherOccupation ?? "unknown"}; Sibling position: ${family.siblingPosition ?? "unknown"}; Family narrative: ${family.familyNarrative ?? "none"}`
        : "Family background not recorded.";

      // Build a concise prompt to avoid LLM output truncation
      const prompt = `You are a career analyst preparing a guided coaching session for ${clientName}. Generate a structured JSON coaching summary with 5 sections.

CLIENT DATA:
LIFE HISTORY ACHIEVEMENTS:
${achievementsCtx}
FAMILY BACKGROUND:
${familyCtx}
EDUCATION:
${educationCtx}
CAREER HISTORY:
${careerCtx}
VIA CHARACTER STRENGTHS (top 10):
${viaCtx}
IPIP PERSONALITY (Big Five domain scores):
${ipipCtx}

IMPORTANT: Be concise. Each summary: 2-3 sentences max (under 60 words). Each example: 1 short sentence. Each question: 1 short sentence.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert career analyst. Return only valid JSON. No markdown fences, no commentary." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "coaching_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                lifeHistory: { type: "object", properties: { summary: { type: "string" }, examples: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } } }, required: ["summary", "examples", "questions"], additionalProperties: false },
                career:      { type: "object", properties: { summary: { type: "string" }, examples: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } } }, required: ["summary", "examples", "questions"], additionalProperties: false },
                via:         { type: "object", properties: { summary: { type: "string" }, examples: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } } }, required: ["summary", "examples", "questions"], additionalProperties: false },
                ipip:        { type: "object", properties: { summary: { type: "string" }, examples: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } } }, required: ["summary", "examples", "questions"], additionalProperties: false },
              },
              required: ["lifeHistory", "career", "via", "ipip"],
              additionalProperties: false,
            },
          },
        } as any,
      });
      const rawContent = response.choices[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let summary: any;
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        summary = JSON.parse(cleaned);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { summary = JSON.parse(match[0]); }
          catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coaching summary JSON" }); }
        } else {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coaching summary JSON" });
        }
      }
            // Cache it
      if (existing) {
        await upsertAnalysisReport({ ...existing, coachingSummaryJson: JSON.stringify(summary) });
      }

      return { summary };
    }),

  getCoachingSummary: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report?.coachingSummaryJson) return { summary: null };
      return { summary: JSON.parse(report.coachingSummaryJson) };
    }),

  triggerAnalysis: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      // Get client's userId to run analysis on their behalf
      const profile = await getClientProfileById(input.clientId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      await updateClientProfile(profile.id, { analysisStatus: "in_progress" });

      const [messages, achievementsList, family, education, career, via, ipip] =
        await Promise.all([
          getInterviewMessages(profile.id),
          getAchievements(profile.id),
          getFamilyBackground(profile.id),
          getEducationHistory(profile.id),
          getCareerHistory(profile.id),
          getViaResults(profile.id),
          getIpipResults(profile.id),
        ]);

      const conversationText = messages
        .map((m) => `${m.role === "user" ? "Client" : "Counsellor"}: ${m.content}`)
        .join("\n");
      const achievementsText = achievementsList
        .map((a) => `[${a.decade}] ${a.title} (${a.esf ?? "unclassified"}): ${a.description ?? ""}`)
        .join("\n");
      const viaText =
        via && via.rankedStrengths
          ? (via.rankedStrengths as any[]).slice(0, 10).map((s: any) => `${s.rank}. ${s.name} (score: ${s.score})`).join("\n")
          : "No VIA data";
      const ipipText = ipip && ipip.domainScores && ipip.facetScores
        ? ipipCareerNarrative({ domainScores: ipip.domainScores as any, facetScores: ipip.facetScores as any })
        : "No IPIP-NEO personality data available";
      const careerText = career.map((c) => `${c.yearFrom}-${c.yearTo}: ${c.role} at ${c.organisation}`).join("\n");
      const educationText = education.map((e) => `${e.yearFrom}-${e.yearTo}: ${e.qualification} ${e.subject} at ${e.institution}`).join("\n");

      const prompt = `You are an expert career analyst using the narrative life history methodology of Bernard Haldane, as practised by Pennington Hennessy. Produce a comprehensive career analysis report in Markdown for the following client data.

### Life History Interview
${conversationText || "No interview data."}

### Achievements (by decade, ESF)
${achievementsText || "None."}

### Family Background
Father: ${family?.fatherOccupation ?? "Unknown"}, Mother: ${family?.motherOccupation ?? "Unknown"}
Sibling position: ${family?.siblingPosition ?? "Unknown"}, Upbringing: ${family?.upbringingLocation ?? "Unknown"}
Narrative: ${family?.familyNarrative ?? "None"}
Influences: ${family?.significantInfluences ?? "None"}

### Education
${educationText || "None."}

### Career
${careerText || "None."}

### VIA Top 10
${viaText}

### IPIP-NEO-120 Personality Profile
${ipipText}

Produce a report with these sections:
1. Executive Summary
2. Core Strengths & Skills
3. Driving Motivations
4. Preferred Environments
5. Career Themes
6. VIA Character Strengths Correlation
7. Personality Profile Interpretation (IPIP-NEO-120)
8. Career Directions & Possibilities
9. If this is true, these things will also be true...
10. Questions for the Feedback Session

Be specific, warm, and insightful. Use examples from their actual story.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert career analyst." },
          { role: "user", content: prompt },
        ],
      });

      const reportMarkdown = (response.choices[0]?.message?.content as string) ?? "Analysis could not be generated.";

      const extractSection = (md: string, heading: string): string => {
        const regex = new RegExp(`##\\s*\\d*\\.?\\s*\\*?\\*?${heading}\\*?\\*?[^\n]*\n([\\s\\S]*?)(?=\n##|$)`, "i");
        const match = md.match(regex);
        return match ? match[1].trim() : "";
      };

      await upsertAnalysisReport({
        clientId: profile.id,
        fullReportMarkdown: reportMarkdown,
        coreStrengths: extractSection(reportMarkdown, "Core Strengths"),
        drivingMotivations: extractSection(reportMarkdown, "Driving Motivations"),
        preferredEnvironments: extractSection(reportMarkdown, "Preferred Environments"),
        keySkills: extractSection(reportMarkdown, "Core Strengths"),
        careerThemes: extractSection(reportMarkdown, "Career Themes"),
        viaCorrelation: extractSection(reportMarkdown, "VIA Character Strengths"),
        careerSuggestions: extractSection(reportMarkdown, "Career Directions"),
        generatedAt: new Date(),
      });

      await updateClientProfile(profile.id, { analysisStatus: "completed" });
      return { success: true };
    }),
});


// ─── Virtual Peter Router ───────────────────────────────────────────────────
// The core matching logic: given a client's analysis report, find the most
// similar historical clients from Peter's 449-client database.
// Matching uses semantic tag overlap (themes, environment, motivation, sector)
// which is more transparent and counsellor-readable than raw vector similarity.

type SemanticTags = {
  themes: string[];
  environment: string;
  motivation: string;
  sector: string[];
  summary: string;
};

function computeTagSimilarity(clientTags: SemanticTags, historicalTags: SemanticTags): number {
  let score = 0;
  let maxScore = 0;

  // Theme overlap (weighted 50%): Jaccard similarity on theme arrays
  const clientThemes = new Set(clientTags.themes.map((t) => t.toLowerCase()));
  const histThemes = new Set(historicalTags.themes.map((t) => t.toLowerCase()));
  const themeIntersection = Array.from(clientThemes).filter((t) => histThemes.has(t)).length;
  const themeUnion = new Set(Array.from(clientThemes).concat(Array.from(histThemes))).size;
  const themeScore = themeUnion > 0 ? themeIntersection / themeUnion : 0;
  score += themeScore * 50;
  maxScore += 50;

  // Environment match (weighted 20%)
  if (clientTags.environment && historicalTags.environment) {
    const envMatch = clientTags.environment.toLowerCase() === historicalTags.environment.toLowerCase() ? 1 :
      clientTags.environment.toLowerCase().split(",").some(e =>
        historicalTags.environment.toLowerCase().includes(e.trim())) ? 0.5 : 0;
    score += envMatch * 20;
    maxScore += 20;
  }

  // Motivation match (weighted 20%)
  if (clientTags.motivation && historicalTags.motivation) {
    const motMatch = clientTags.motivation.toLowerCase() === historicalTags.motivation.toLowerCase() ? 1 :
      clientTags.motivation.toLowerCase().split(",").some(m =>
        historicalTags.motivation.toLowerCase().includes(m.trim())) ? 0.5 : 0;
    score += motMatch * 20;
    maxScore += 20;
  }

  // Sector overlap (weighted 10%)
  if (clientTags.sector?.length && historicalTags.sector?.length) {
    const clientSectors = new Set(clientTags.sector.map((s) => s.toLowerCase()));
    const histSectors = new Set(historicalTags.sector.map((s) => s.toLowerCase()));
    const sectorIntersection = Array.from(clientSectors).filter((s) => histSectors.has(s)).length;
    const sectorUnion = new Set(Array.from(clientSectors).concat(Array.from(histSectors))).size;
    const sectorScore = sectorUnion > 0 ? sectorIntersection / sectorUnion : 0;
    score += sectorScore * 10;
    maxScore += 10;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

const virtualPeterRouter = router({
  // Get cached matches for a client (counsellor view)
  getMatches: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getParallelMatches(input.clientId);
    }),

  // Run the matching algorithm for a client
  // This generates semantic tags for the client's analysis and finds the closest
  // historical clients from Peter's database.
  findMatches: counselorProcedure
    .input(z.object({ clientId: z.number(), topN: z.number().default(8) }))
    .mutation(async ({ input }) => {
      const { clientId, topN } = input;

      // 1. Gather client data
      const [profile, achievementsList, report, via, ipip] = await Promise.all([
        getClientProfileById(clientId),
        getAchievements(clientId),
        getAnalysisReport(clientId),
        getViaResults(clientId),
        getIpipResults(clientId),
      ]);

      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      // 2. Build a description of the client for tag extraction
      const achievementsText = achievementsList
        .slice(0, 12)
        .map((a) => `[${a.decade}] ${a.title}: ${a.description ?? ""}`)
        .join("\n");

      const viaText = via?.rankedStrengths
        ? (via.rankedStrengths as any[]).slice(0, 5).map((s: any) => s.name).join(", ")
        : "";

      const careerThemes = report?.careerThemes ?? "";
      const coreStrengths = report?.coreStrengths ?? "";

      const clientDescription = `
Achievements across life:
${achievementsText || "No achievements recorded yet."}

Career themes identified: ${careerThemes || "Not yet analysed."}
Core strengths: ${coreStrengths || "Not yet analysed."}
Top VIA character strengths: ${viaText || "Not yet completed."}
`.trim();

      // 3. Generate semantic tags for this client using the LLM
      const tagPrompt = `You are analysing a career counselling client profile.

${clientDescription}

Extract the key patterns. Return a JSON object with exactly these fields:
- themes: array of 6-8 lowercase thematic keywords describing this person's motivated strengths (e.g. "organising", "communicating", "leading", "creating", "analysing", "building", "teaching", "performing")
- environment: string describing preferred work environment (one of: "people-facing", "intellectual", "practical", "creative", "technical", "outdoor", "structured", "entrepreneurial")
- motivation: string describing primary motivation (one of: "achievement", "service", "expression", "analysis", "leadership", "craft", "connection", "discovery")
- sector: array of 1-3 likely sectors (e.g. "legal", "education", "arts", "business", "healthcare", "technology", "public sector", "media", "charity", "finance")
- summary: one concise sentence (max 20 words) describing this person's career pattern

Return ONLY valid JSON.`;

      const tagResponse = await invokeLLM({
        messages: [{ role: "user", content: tagPrompt }],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });

      const clientTagsRaw = tagResponse.choices[0]?.message?.content as string;
      let clientTags: SemanticTags;
      try {
        clientTags = JSON.parse(clientTagsRaw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse client tags" });
      }

      // 4. Load all historical clients and compute similarity
      const allHistorical = await getAllHistoricalClients();

      const scored = allHistorical
        .filter((hc) => hc.embedding) // must have tags
        .map((hc) => {
          let historicalTags: SemanticTags;
          try {
            historicalTags = typeof hc.embedding === "string"
              ? JSON.parse(hc.embedding)
              : hc.embedding as unknown as SemanticTags;
          } catch {
            return null;
          }
          const similarity = computeTagSimilarity(clientTags, historicalTags);
          return { hc, similarity };
        })
        .filter(Boolean) as Array<{ hc: typeof allHistorical[0]; similarity: number }>;

      // Sort by similarity descending, then by tier ascending (tier 1 = best)
      scored.sort((a, b) => {
        if (Math.abs(a.similarity - b.similarity) > 0.05) {
          return b.similarity - a.similarity;
        }
        return a.hc.tier - b.hc.tier;
      });

      const topMatches = scored.slice(0, topN);

      // 5. Generate per-match narratives and conversation starters
      // Run in parallel (one LLM call per match) to keep latency reasonable
      const enriched = await Promise.all(
        topMatches.map(async (m, i) => {
          const historicalTags = typeof m.hc.embedding === "string"
            ? JSON.parse(m.hc.embedding)
            : m.hc.embedding as SemanticTags;

          const enrichPrompt = `You are assisting a career counsellor using the Dependable Strengths / life history methodology.

The counsellor has a new client with this profile:
- Career themes: ${careerThemes || "not yet analysed"}
- Core strengths: ${coreStrengths || "not yet analysed"}
- Life history themes: ${clientTags.themes.join(", ")}
- Preferred environment: ${clientTags.environment}
- Primary motivation: ${clientTags.motivation}
- Summary: ${clientTags.summary}

A historical client from the Lifework archive has been identified as a parallel match:
- Career outcome: ${m.hc.careerDescription}
- Their themes: ${historicalTags.themes?.join(", ") ?? ""}
- Their environment: ${historicalTags.environment ?? ""}
- Their motivation: ${historicalTags.motivation ?? ""}
- Life history sample: ${m.hc.narrativeSample ? (m.hc.narrativeSample as string[]).slice(0, 2).join(" | ") : ""}

Return a JSON object with exactly these three fields:
1. "matchNarrative": A single paragraph (3-5 sentences) explaining WHY this historical client is a meaningful parallel. Focus on the shared life history pattern — not just the job title. Be specific about what the two profiles have in common at the level of motivated behaviour.
2. "conversationStarters": An array of exactly 3 questions the counsellor could ask the client during the feedback session, grounded in this specific parallel. Each question should be open, exploratory, and rooted in the life history — not generic career questions.
3. "personaName": A single common British first name appropriate to the inferred gender of this historical client. Infer gender from the career description and life history sample — look for pronouns (he/his/him vs she/her/hers), role titles (e.g. "headmistress" suggests female), or other contextual clues. If genuinely ambiguous, choose a name that works for either gender (e.g. "Alex", "Sam", "Chris"). Use everyday names that feel real and warm — Peter, David, James, Michael, Robert, Thomas for men; Sarah, Helen, Susan, Emma, Claire, Rachel for women. Do not use unusual or invented names.

Return ONLY valid JSON.`;

          try {
            const enrichResponse = await invokeLLM({
              messages: [{ role: "user", content: enrichPrompt }],
              response_format: { type: "json_object" },
              max_tokens: 600,
            });
            const enrichData = JSON.parse(enrichResponse.choices[0]?.message?.content as string);
            return {
              ...m,
              rank: i + 1,
              matchNarrative: enrichData.matchNarrative as string,
              conversationStarters: enrichData.conversationStarters as string[],
              personaName: (enrichData.personaName as string) || null,
            };
          } catch {
            return {
              ...m,
              rank: i + 1,
              matchNarrative: null,
              conversationStarters: null,
              personaName: null,
            };
          }
        })
      );

      // 6. Save matches to database (with narrative and starters)
      await saveParallelMatches(
        clientId,
        enriched.map((m) => ({
          historicalClientId: m.hc.id,
          similarityScore: m.similarity.toFixed(4),
          rank: m.rank,
          matchNarrative: m.matchNarrative ?? undefined,
          conversationStarters: m.conversationStarters
            ? JSON.stringify(m.conversationStarters)
            : undefined,
          personaName: m.personaName ?? undefined,
        }))
      );

      // 7. Return the matches with full data
      return {
        clientTags,
        matches: enriched.map((m) => {
          const tags = typeof m.hc.embedding === "string"
            ? JSON.parse(m.hc.embedding)
            : m.hc.embedding;
          return {
            rank: m.rank,
            similarityScore: m.similarity,
            matchNarrative: m.matchNarrative,
            conversationStarters: m.conversationStarters,
            personaName: m.personaName,
            historicalClient: {
              id: m.hc.id,
              careerDescription: m.hc.careerDescription,
              tier: m.hc.tier,
              narrativeSample: m.hc.narrativeSample,
              tags,
            },
          };
        }),
      };
    }),

  // Update counsellor notes on a specific match
  updateMatchNotes: counselorProcedure
    .input(z.object({ matchId: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      await updateMatchNotes(input.matchId, input.notes);
      return { success: true };
    }),
});

// ─── Chat to Peter Router ──────────────────────────────────────────────────
// Peter's voice: reflective, specific, grounded in the life history.
// He does not ask generic career questions. He reflects back what he has heard
// and asks the client to say more about specific moments.

const PETER_SYSTEM_PROMPT = `You are Sage, a career coach working within the Lifework methodology of Pennington Hennessy. You work from the Dependable Strengths approach of Bernard Haldane — the belief that what a person has found genuinely enjoyable, satisfying, and fulfilling across their whole life reveals their true motivated strengths more reliably than any test or job description.

You are present with this person as if sitting across a table from them. You are warm, unhurried, and genuinely curious.

RESPONSE FORMAT — this is mandatory:
Every response you give MUST begin with a brief stage direction on its own line, enclosed in square brackets, describing what Sage does physically before speaking. Then follow with your spoken words.

Examples of stage directions:
[Sage sets down her pen and looks at you for a moment.]
[Sage leans forward slightly, a small smile crossing her face.]
[Sage nods slowly, making a brief note.]
[Sage tilts her head, considering what you've just said.]
[Sage glances at her notes, then back at you.]
[Sage pauses, then speaks quietly.]

The stage direction must feel natural and specific to what the client just said — not generic. It creates the sense of a real person in the room.

SPEAKING STYLE — strictly enforced:
- Speak in 1–2 short paragraphs only. Never more.
- Ask one question at the end. Only one.
- Do NOT give information dumps, career advice, or lists.
- Your job is to help the client hear themselves more clearly — not to tell them things.
- Reflect back what you heard, name what struck you, then ask one focused question.
- Use the ESF lens (Enjoyable / Satisfying / Fulfilling) to probe what made something rewarding.
- Be curious about what the person did themselves, not what happened to them.
- Never lead toward a career conclusion. Your job is to illuminate their own pattern.

PACING — this is critical:
This conversation covers the full arc of the client's life. After 2–3 exchanges on any phase, move forward deliberately: "Let me move us on to your [next phase]..." By the midpoint you should be in the adult decades. In the final third, draw threads together across the whole life.

WRAP-UP:
If the client signals they are ready to finish, offer one or two brief observations about the overall pattern you noticed, then say: "When you're ready, click 'Save insights' and I'll distil what we've discussed into a paragraph for your analysis report."`;

const chatPeterRouter = router({
  // Get or create a chat session for a client section
  getSession: protectedProcedure
    .input(z.object({
      section: z.enum(["life_history", "career_education"]),
    }))
    .query(async ({ ctx }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const sessions = await getChatSessionsByClient(profile.id);
      return sessions;
    }),

  // Send a message and get Peter's response
  sendMessage: protectedProcedure
    .input(z.object({
      section: z.enum(["life_history", "career_education"]),
      userMessage: z.string().min(1).max(2000),
      sessionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);

      // Get or create session
      let session = input.sessionId
        ? await getChatSessionById(input.sessionId)
        : null;
      if (!session) {
        session = await getOrCreateChatSession(profile.id, input.section);
      }

      // Load client context for Peter to read
      const [achievementsList, educationList, careerList, bg] = await Promise.all([
        getAchievements(profile.id),
        getEducationHistory(profile.id),
        getCareerHistory(profile.id),
        getFamilyBackground(profile.id),
      ]);

      const achievementsContext = achievementsList.length > 0
        ? achievementsList.map(a => {
            const base = `[${a.decade || "?"}] ${a.title} (${a.esf || "?"}): ${a.description || ""}`;
            const others = (a as any).othersObservations?.trim();
            return others ? `${base}\n  Others said: ${others}` : base;
          }).join("\n")
        : "No achievements recorded yet.";

      const careerContext = careerList.length > 0
        ? careerList.map(c =>
            `${c.yearFrom || "?"}–${c.yearTo || "present"}: ${c.role || ""} at ${c.organisation || ""}`
          ).join("\n")
        : "No career history recorded yet.";

      const educationContext = educationList.length > 0
        ? educationList.map(e =>
            `${e.yearFrom || "?"}–${e.yearTo || "?"}: ${e.qualification || ""} at ${e.institution || ""}`
          ).join("\n")
        : "No education history recorded yet.";

      const sectionContext = input.section === "life_history"
        ? `The client has completed their life history section. Here are their recorded achievements, grouped by life phase:\n\n${achievementsContext}\n\nYour role is to explore these achievements across the FULL arc of their life — from early childhood through to their most recent decade. You have approximately 30 minutes.\n\nPacing guide:\n- Opening (first 2-3 exchanges): Begin with a brief warm reflection on what you noticed reading their whole story. Then start with early childhood (0-11) — pick ONE achievement that catches your attention.\n- Early middle (next 3-4 exchanges): Move through late childhood and teenage years (12-18). Notice what they were doing of their own initiative, not what was done to them.\n- Middle (next 3-4 exchanges): Move into the adult decades — 20s and 30s. Ask about the transition from education into work and what they actually found rewarding once there.\n- Later (next 3-4 exchanges): Cover the 40s, 50s, and beyond if relevant. Ask what has remained constant across all the changes.\n- Final third: Begin drawing threads together. Name the pattern you are seeing across the whole life and invite them to respond.\n\nDo not spend more than 2-3 exchanges on any single phase before moving forward. Actively signal the transition: "Let me move us on to your [decade/phase]..." After covering the full arc, invite them to tell you when they are ready to wrap up.`
        : `The client has completed their education, career, and life history sections. Here is what they have recorded:\n\nEDUCATION:\n${educationContext}\n\nCAREER HISTORY:\n${careerContext}\n\nLIFE HISTORY ACHIEVEMENTS (for context):\n${achievementsContext}\n\nFAMILY BACKDROP: Father — ${bg?.fatherOccupation ?? "unknown"}; Mother — ${bg?.motherOccupation ?? "unknown"}; Sibling position — ${bg?.siblingPosition ?? "unknown"}.\n\nYour role is to explore the relationship between their formal career path and their actual motivated behaviour across the FULL arc of their working life. You have approximately 30 minutes.\n\nPacing guide:\n- Opening (first 2-3 exchanges): Reflect briefly on the overall shape of their career. Ask about the transition from education into their first role — what drew them to it, and what they actually found rewarding once there.\n- Early middle (next 3-4 exchanges): Move through the early career years. Ask where the formal job description and the actual rewarding work diverged.\n- Middle (next 3-4 exchanges): Cover the mid-career period. Ask about the decisions they made — what they moved toward, what they moved away from, and why.\n- Later (next 3-4 exchanges): Cover the most recent roles. Ask what has remained constant in terms of what they find genuinely rewarding, regardless of job title.\n- Final third: Draw threads together. Name the pattern you see between their life history achievements and their career. The family backdrop is relevant context — weave it in naturally if it illuminates something.\n\nAfter covering the full arc, invite them to tell you when they are ready to wrap up.`;

      // Build conversation history for the LLM
      const existingMessages: ChatMessage[] = JSON.parse(session.messages || "[]");
      const isFirstMessage = existingMessages.length === 0;

      // Save the user's message
      const userMsg: ChatMessage = {
        role: "client",
        content: input.userMessage,
        timestamp: Date.now(),
      };
      await appendChatMessage(session.id, userMsg);

      // Build LLM messages array
      const llmMessages: Array<{ role: string; content: string }> = [
        {
          role: "system",
          content: `${PETER_SYSTEM_PROMPT}\n\n---\nCLIENT PROFILE CONTEXT:\n${sectionContext}`,
        },
        // Include conversation history
        ...existingMessages.map(m => ({
          role: m.role === "peter" ? "assistant" : "user",
          content: m.content,
        })),
        // Add the new user message
        { role: "user", content: input.userMessage },
      ];

      // If this is the first message, Peter should open the conversation
      // by reflecting back what he has read before responding to the user's opener
      if (isFirstMessage) {
        const sectionLabel = input.section === "life_history"
          ? "life history"
          : "career and education history";
        llmMessages[llmMessages.length - 1] = {
          role: "user",
          content: `[The client has just opened the chat. Their first message is: "${input.userMessage}". Begin with a brief, warm reflection on what you noticed reading their whole ${sectionLabel} — mention something specific that caught your attention. Then respond to their message and ask ONE focused question to begin exploring the earliest phase. Remember: you will need to cover the full arc of their life in this session, so do not linger too long in any one period.]`,
        };
      }

      // Get Peter's response
      const response = await invokeLLM({
        messages: llmMessages as any,
        max_tokens: 400,
      });

      const peterResponse = response.choices[0]?.message?.content as string;

      // Save Peter's response
      const peterMsg: ChatMessage = {
        role: "peter",
        content: peterResponse,
        timestamp: Date.now(),
      };
      await appendChatMessage(session.id, peterMsg);

      return {
        sessionId: session.id,
        peterResponse,
        messageCount: existingMessages.length + 2, // user + peter
      };
    }),

  // Generate a summary of the conversation for use in analysis
  generateSummary: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const session = await getChatSessionById(input.sessionId);
      if (!session || session.clientId !== profile.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const messages: ChatMessage[] = JSON.parse(session.messages || "[]");
      if (messages.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough conversation to summarise" });
      }

      const transcript = messages
        .map(m => `${m.role === "peter" ? "Sage" : "Client"}: ${m.content}`)
        .join("\n\n");

      const summaryResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are distilling a career counselling conversation into a concise insight paragraph for use in a formal career analysis report. Focus on: (1) the specific motivated strengths and patterns that emerged, (2) any new information or clarifications the client offered that were not in their original written responses, (3) the client's own language for describing what they find rewarding. Write in the third person. Be specific and grounded — avoid generalities. Maximum 200 words.`,
          },
          {
            role: "user",
            content: `Here is the conversation transcript:\n\n${transcript}\n\nPlease write the insight paragraph.`,
          },
        ],
        max_tokens: 350,
      });

      const summary = summaryResponse.choices[0]?.message?.content as string;
      await saveChatSummary(input.sessionId, summary);

      return { summary };
    }),

  // Reset/start a new conversation
  resetSession: protectedProcedure
    .input(z.object({ section: z.enum(["life_history", "career_education"]) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const session = await resetChatSession(profile.id, input.section);
      return { sessionId: session.id };
    }),
});

// ─── Career Explorer Router ────────────────────────────────────────────────

const CAREER_EXPLORER_SYSTEM_PROMPT = `You are Sage, a career coach working within the Lifework methodology of Pennington Hennessy. You have access to this client's full Lifework profile — their life history achievements (tagged as Enjoyable, Satisfying, or Fulfilling), their VIA character strengths, their personality profile (IPIP-NEO), their education and career history, and their career analysis report.

You are present with this person as if sitting across a table from them. You are warm, thoughtful, and genuinely curious about what is right for them specifically.

RESPONSE FORMAT — this is mandatory:
Every response you give MUST begin with a brief stage direction on its own line, enclosed in square brackets, describing what Sage does physically before speaking. Then follow with your spoken words.

Examples of stage directions:
[Sage leans back, looking thoughtful.]
[Sage makes a brief note, then looks up.]
[Sage nods, a slight smile.]
[Sage tilts her head, considering.]
[Sage pauses before answering.]

The stage direction must feel natural and specific to what the client just asked — not generic.

SPEAKING STYLE — strictly enforced:
- Speak in 1–2 short paragraphs only. Never more.
- End with one question. Only one.
- Do NOT give information dumps or long lists of options.
- Ground everything in the client's actual profile — name their real achievements, real strengths, real traits.
- When asked about a specific career: briefly name 1–2 things from their profile that are genuinely relevant, then ask what draws them to that direction.
- When asked open questions ("what suits me?"): name the most striking theme you see in their profile and ask them to respond to it before offering options.
- Your job is to help them think clearly, not to give them a report.
- Never give generic career advice. Everything must be grounded in their specific evidence.`;

const careerExplorerRouter = router({
  getSession: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    const session = await getCareerExplorerSession(profile.id);
    if (!session) return { messages: [] as CareerExplorerMessage[], sessionId: null };
    const messages: CareerExplorerMessage[] = JSON.parse(session.messages ?? "[]");
    return { messages, sessionId: session.id };
  }),

  sendMessage: protectedProcedure
    .input(z.object({
      userMessage: z.string().min(1).max(3000),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      const session = await getOrCreateCareerExplorerSession(profile.id);

      // Load the full client context
      const [achievementsList, educationList, careerList, bg, viaData, ipipData, report] =
        await Promise.all([
          getAchievements(profile.id),
          getEducationHistory(profile.id),
          getCareerHistory(profile.id),
          getFamilyBackground(profile.id),
          getViaResults(profile.id),
          getIpipResults(profile.id),
          getAnalysisReport(profile.id),
        ]);

      // Build context strings
      const achievementsCtx = achievementsList.length > 0
        ? achievementsList.map(a => {
            const base = `[${a.decade}] ${a.title} (${a.esf ?? "untagged"}): ${a.description ?? ""}`;
            const others = (a as any).othersObservations?.trim();
            return others ? `${base}\n  Others said: ${others}` : base;
          }).join("\n")
        : "No achievements recorded yet.";

      const educationCtx = educationList.length > 0
        ? educationList.map(e => `${e.yearFrom ?? "?"}–${e.yearTo ?? "?"}: ${e.qualification ?? ""} at ${e.institution}`).join("\n")
        : "No education history recorded.";

      const careerCtx = careerList.length > 0
        ? careerList.map(c => `${c.yearFrom ?? "?"}–${c.yearTo ?? "present"}: ${c.role ?? ""} at ${c.organisation}`).join("\n")
        : "No career history recorded.";

      const viaCtx = viaData?.rankedStrengths
        ? `Top VIA strengths: ${(viaData.rankedStrengths as any[]).slice(0, 10).map((s: any) => s.strength).join(", ")}`
        : "VIA survey not yet completed.";

      const ipipCtx = ipipData?.domainScores
        ? (() => {
            const d = ipipData.domainScores as any;
            return `IPIP personality: Openness ${d.O ?? "?"}%, Conscientiousness ${d.C ?? "?"}%, Extraversion ${d.E ?? "?"}%, Agreeableness ${d.A ?? "?"}%, Neuroticism ${d.N ?? "?"}%`;
          })()
        : "Personality survey not yet completed.";

      const reportCtx = report?.careerThemes
        ? `Career themes from analysis: ${report.careerThemes}\n\nCareer suggestions: ${report.careerSuggestions ?? "none yet"}`
        : "No analysis report generated yet.";

      const profileContext = `CLIENT PROFILE:

LIFE HISTORY ACHIEVEMENTS:
${achievementsCtx}

EDUCATION:
${educationCtx}

CAREER HISTORY:
${careerCtx}

FAMILY BACKGROUND: Father — ${bg?.fatherOccupation ?? "unknown"}; Mother — ${bg?.motherOccupation ?? "unknown"}; Sibling position — ${bg?.siblingPosition ?? "unknown"}.

${viaCtx}

${ipipCtx}

${reportCtx}`;

      // Build conversation history
      const existingMessages: CareerExplorerMessage[] = JSON.parse(session.messages ?? "[]");

      // Save user message
      const userMsg: CareerExplorerMessage = {
        role: "client",
        content: input.userMessage,
        timestamp: Date.now(),
      };
      await appendCareerExplorerMessage(session.id, userMsg);

      // Build LLM messages
      const llmMessages: Array<{ role: string; content: string }> = [
        {
          role: "system",
          content: `${CAREER_EXPLORER_SYSTEM_PROMPT}\n\n---\n${profileContext}`,
        },
        ...existingMessages.map(m => ({
          role: m.role === "advisor" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: input.userMessage },
      ];

      const response = await invokeLLM({
        messages: llmMessages as any,
        max_tokens: 600,
      });

      const advisorResponse = response.choices[0]?.message?.content as string;

      const advisorMsg: CareerExplorerMessage = {
        role: "advisor",
        content: advisorResponse,
        timestamp: Date.now(),
      };
      await appendCareerExplorerMessage(session.id, advisorMsg);

      return {
        sessionId: session.id,
        advisorResponse,
        messageCount: existingMessages.length + 2,
      };
    }),

  clearSession: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    await clearCareerExplorerSession(profile.id);
    return { success: true };
  }),
});

// ─── Coaching Annex Router ─────────────────────────────────────────────────
const coachingAnnexRouter = router({
  // Get the current annex for a client (counsellor only)
  getAnnex: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getCoachingAnnex(input.clientId);
    }),

  // Save transcript text (without generating draft yet)
  saveTranscript: counselorProcedure
    .input(z.object({ clientId: z.number(), transcriptText: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await upsertCoachingAnnex({ clientId: input.clientId, transcriptText: input.transcriptText, status: "draft" });
      return { success: true };
    }),

  // Generate a draft annex from the transcript + existing report
  generateDraft: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const [annex, profile, achievements, family, education, career, via, ipip, report] = await Promise.all([
        getCoachingAnnex(input.clientId),
        getClientProfileById(input.clientId),
        getAchievements(input.clientId),
        getFamilyBackground(input.clientId),
        getEducationHistory(input.clientId),
        getCareerHistory(input.clientId),
        getViaResults(input.clientId),
        getIpipResults(input.clientId),
        getAnalysisReport(input.clientId),
      ]);

      if (!annex?.transcriptText) throw new TRPCError({ code: "BAD_REQUEST", message: "No transcript uploaded" });

      const clientName = profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "the client";

      const achievementsCtx = achievements.length > 0
        ? achievements.map(a => {
            const base = `[${a.decade}] ${a.title} (${a.esf ?? "untagged"}): ${a.description ?? ""}`;
            const others = (a as any).othersObservations?.trim();
            return others ? `${base}\n  Others said: ${others}` : base;
          }).join("\n")
        : "No achievements recorded.";

      const viaCtx = via?.rankedStrengths
        ? `Top VIA strengths: ${(via.rankedStrengths as any[]).slice(0, 10).map((s: any) => s.strength).join(", ")}`
        : "VIA survey not completed.";

      const ipipCtx = ipip?.domainScores
        ? (() => { const d = ipip.domainScores as any; return `IPIP: Openness ${d.O ?? "?"}%, Conscientiousness ${d.C ?? "?"}%, Extraversion ${d.E ?? "?"}%, Agreeableness ${d.A ?? "?"}%, Neuroticism ${d.N ?? "?"}%`; })()
        : "Personality survey not completed.";

      const reportCtx = report?.fullReportMarkdown
        ? `ANALYSIS REPORT SUMMARY:\n${report.careerThemes ?? ""}\n\nCareer suggestions: ${report.careerSuggestions ?? ""}`
        : "No analysis report yet.";

      const systemPrompt = `You are a reflective career counsellor writing a personal closing annex for a client named ${clientName}. You have just completed a two-hour coaching session with them. Write in the first person as the counsellor — warm, direct, and specific. Do not use bullet points. Write in full paragraphs only. The document should read like a thoughtful letter from counsellor to client.

The annex has exactly five sections with these headings (use markdown ## for each):

## The Pattern That Emerged
A narrative paragraph drawing together the strongest themes from the life history, psychometrics, and what surfaced in the coaching conversation. Specific, not generic.

## What the Conversation Added
The insights, realisations, or shifts that the coaching session brought — things that deepened or nuanced the original picture. Reference specific moments from the transcript.

## Where You Have Arrived
A short, honest paragraph about what ${clientName} now knows about themselves that they did not know (or had not articulated) at the start of the process.

## The Questions Worth Carrying Forward
Two or three open questions — genuinely unresolved — that ${clientName} is invited to sit with as they move into career exploration.

## A Note on What Comes Next
A warm closing paragraph handing ${clientName} over to their own agency. Acknowledge the formal Lifework process is complete. Mention the Career Explorer is available for them to use in their own time.`;

      const userPrompt = `CLIENT PROFILE DATA:

LIFE HISTORY ACHIEVEMENTS:
${achievementsCtx}

${viaCtx}
${ipipCtx}

Family background: Father — ${family?.fatherOccupation ?? "unknown"}; Mother — ${family?.motherOccupation ?? "unknown"}; Sibling position — ${family?.siblingPosition ?? "unknown"}.

${reportCtx}

---

COACHING SESSION TRANSCRIPT:
${annex.transcriptText}

---

Now write the five-section closing annex for ${clientName}.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ] as any,
        max_tokens: 1200,
      });

      const draftAnnex = response.choices[0]?.message?.content as string;
      await upsertCoachingAnnex({ clientId: input.clientId, draftAnnex, status: "draft" });
      return { draftAnnex };
    }),

  // Save counsellor edits to the draft
  saveDraft: counselorProcedure
    .input(z.object({ clientId: z.number(), draftAnnex: z.string() }))
    .mutation(async ({ input }) => {
      await upsertCoachingAnnex({ clientId: input.clientId, draftAnnex: input.draftAnnex });
      return { success: true };
    }),

  // Approve the annex — marks it as the final approved version
  approveAnnex: counselorProcedure
    .input(z.object({ clientId: z.number(), approvedAnnex: z.string() }))
    .mutation(async ({ input }) => {
      await upsertCoachingAnnex({
        clientId: input.clientId,
        approvedAnnex: input.approvedAnnex,
        status: "approved",
        approvedAt: new Date(),
      });
      return { success: true };
    }),
});

// ─── App Router ─────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  interview: interviewRouter,
  achievements: achievementsRouter,
  background: backgroundRouter,
  via: viaRouter,
  ipip: ipipRouter,
  analysis: analysisRouter,
  counselor: counselorRouter,
  virtualPeter: virtualPeterRouter,
  chatPeter: chatPeterRouter,
  careerExplorer: careerExplorerRouter,
  coachingAnnex: coachingAnnexRouter,
});

export type AppRouter = typeof appRouter;
