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
  getCognitiveScreenerResult,
  upsertCognitiveScreenerResult,
  getAllHistoricalClients,
  getParallelMatches,
  saveParallelMatches,
  updateMatchNotes,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { scoreVia, VIA_QUESTIONS, VIA_STRENGTHS } from "../shared/via-data";
import { scoreIpip, ipipCareerNarrative } from "../shared/ipip-data";
import { scoreScreener, SCREENER_ITEMS } from "../shared/cognitive-screener-data";

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
      const systemPrompt = `You are a warm, empathetic career counsellor conducting a structured life history interview based on the methodology of Peter Daws, a pioneering career analyst. Your role is to guide the client through a reflective journey of their life story.

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

    const prompt = `You are an expert career analyst using the narrative life history methodology pioneered by Peter Daws. You have been given a comprehensive set of data about a client. Your task is to produce a rich, insightful career analysis report.

## Client Data

### Life History Interview Conversation
${conversationText || "No interview data yet."}

### Structured Achievements (by decade, with ESF classification)
${achievementsText || "No achievements recorded yet."}

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
      const [profile, achievementsList, family, education, career, via, ipip, report, messages] =
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
        ]);
      return { profile, achievements: achievementsList, family, education, career, via, ipip, report, messages };
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

      const prompt = `You are an expert career analyst using the narrative life history methodology pioneered by Peter Daws. Produce a comprehensive career analysis report in Markdown for the following client data.

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

// ─── App Rout// ─── Cognitive Screener Router ───────────────────────────────────────────
const cognitiveRouter = router({
  getResults: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateClientProfile(ctx.user.id);
    return getCognitiveScreenerResult(profile.id);
  }),

  saveResults: protectedProcedure
    .input(
      z.object({
        // answers: { [itemId]: chosenOptionIndex }
        answers: z.record(z.string(), z.number()),
        timeTakenSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateClientProfile(ctx.user.id);
      // Convert string keys to number keys
      const numericAnswers: Record<number, number> = {};
      for (const [k, v] of Object.entries(input.answers)) {
        numericAnswers[parseInt(k)] = v;
      }
      const scores = scoreScreener(numericAnswers);
      await upsertCognitiveScreenerResult({
        clientId: profile.id,
        scores,
        rawAnswers: numericAnswers,
        timeTakenSeconds: input.timeTakenSeconds ?? null,
        completedAt: new Date(),
      });
      await updateClientProfile(profile.id, { cognitiveStatus: "completed" });
      return { success: true, scores };
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

      // 5. Save matches to database
      await saveParallelMatches(
        clientId,
        topMatches.map((m, i) => ({
          historicalClientId: m.hc.id,
          similarityScore: m.similarity.toFixed(4),
          rank: i + 1,
        }))
      );

      // 6. Return the matches with full data
      return {
        clientTags,
        matches: topMatches.map((m, i) => {
          const tags = typeof m.hc.embedding === "string"
            ? JSON.parse(m.hc.embedding)
            : m.hc.embedding;
          return {
            rank: i + 1,
            similarityScore: m.similarity,
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
  cognitive: cognitiveRouter,
  analysis: analysisRouter,
  counselor: counselorRouter,
  virtualPeter: virtualPeterRouter,
});

export type AppRouter = typeof appRouter;
