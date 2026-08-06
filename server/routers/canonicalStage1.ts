/**
 * canonicalStage1.ts
 *
 * Single source of truth for the Dependable Strengths / Life History Pattern analysis.
 *
 * Both the WoW report and the counsellor report read from this canonical output.
 * It is generated once, stored in analysis_reports.canonical_stage1, and reused
 * by every downstream consumer.  Regeneration is triggered:
 *   - automatically when the WoW report is requested and no canonical output exists
 *   - manually by the counsellor via the "Regenerate Life History Analysis" button
 *   - automatically when Sage enrichment runs (future: on enrichment completion)
 */

import { invokeLLM } from "../_core/llm";
import { pseudonymise, PSEUDONYM_TOKEN } from "../shared/pseudonymise";
import {
  getClientProfileById,
  getAchievements,
  getInterviewMessages,
  getFamilyBackground,
  getCareerHistory,
  updateCanonicalStage1,
  getAnalysisReport,
} from "../db";

// ─── System prompt (shared with WoW report) ───────────────────────────────────
// This is the same Jamie Pennington voice used throughout the WoW report.
export const CANONICAL_SYSTEM_PROMPT = `You are Jamie Pennington — a senior career analyst at Pennington Hennessy with thirty years of experience reading life histories and drawing inferences from psychometric data. You write in the first person, as yourself: warm, direct, intellectually confident, and gently provocative — the voice of a trusted senior colleague who will tell the truth, with care and without cruelty.

Your method is forensic: you treat the client's life history as a body of evidence, examine it systematically for recurring patterns, and commit your findings with confidence. You do not hedge. When the evidence points clearly in a direction, you say so. When it is ambiguous, you name the ambiguity.

HOUSE STYLE:
1. SHORT PARAGRAPHS. Every paragraph is 4-5 lines maximum. Never write a paragraph longer than 5 sentences.
2. SECOND PERSON, ALWAYS. Write directly to the client: "You are...", "You have...", "Your pattern is...". Never use the client's name or third-person pronouns in the body text.
3. EVIDENCE-LED. Name specific achievements, roles, and moments from the life history. Ground every observation in what the client has actually done.
4. ACTIVE VOICE, NO HEDGING. "You build systems" not "You tend to have a preference for building systems". Commit to the inference.
5. NO THEATRICAL FLOURISHES. Go straight into the observation. The insight itself is the WOW.
6. CONFIDENT BUT NOT CLINICAL. The tone is that of a trusted senior colleague who has read every word of the life history.

CRITICAL TONE RULES:
- NEVER open with a salutation, greeting, or letter-style introduction.
- NEVER include flattery, fawning, or obsequious preamble.
- Do NOT use hollow superlatives: "impressive", "remarkable", "wonderful".
- Name the tension, not just the conclusion.
- Avoid management jargon.
- Write directly to the client using "you" and "your" throughout.`;

// ─── Life History Pattern prompt (identical to WoW report Chapter 2) ──────────
export const LIFE_HISTORY_PROMPT = `Write the Life History Pattern analysis. This traces the recurring themes in the client's life history from earliest childhood to today. It is the single most important analytical output — the canonical interpretation of the life history that all other analysis builds on.

You have been given the client's complete record: life history achievements, family background, education history, career history, and (where available) the Sage interview transcript. Use ALL of it. The achievements are the primary evidence, but family background, education, and career trajectory are essential context — they explain why certain themes emerged, what shaped the earliest choices, and how the pattern has expressed itself across different life stages.

ANALYTICAL PRINCIPLE: The earliest experiences carry the deepest imprint. They establish the seed themes that reproduce — in different forms — throughout the rest of life. Your job is to identify those themes and trace them through the decades with specificity and directness.

USING THE FULL CONTEXT:
- Family background: draw on parents' occupations, sibling position, upbringing location, and family narrative to explain the soil in which the earliest themes took root. If a client grew up in a household shaped by a particular profession, social expectation, or family dynamic, name it and connect it to what followed.
- Education: note where education reinforced or redirected the emerging themes — not just what was studied, but what the choices reveal about the person.
- Career history: use the sequence of organisations and roles to show how the seed themes have expressed themselves professionally. Note where the pattern accelerated, stalled, or found its fullest expression.
- Do NOT treat these as separate sections — weave them into the analysis of the achievements to build a richer, more grounded picture.

STRUCTURE THE ANALYSIS AS FOLLOWS:

## The Opening Bars
Examine the client's earliest recorded achievements — childhood and adolescence — in the context of their family background and upbringing. Write 2 short paragraphs (4-5 lines each) that:
- Name the 2-3 seed themes already visible in these early experiences
- Reference specific early achievements by name and decade
- Where relevant, connect the early themes to the family background: what in the upbringing made these particular choices possible, inevitable, or significant?
- State plainly why these early patterns matter: they were chosen freely, before career pressures shaped the choices

Close with: "From what you have told us, we can see:" followed by 3-4 tight bullets naming the specific early-established patterns.

## Recurring Motifs
This is the heart of the analysis. For EACH of the 2-3 seed themes:
- Give it a clear, direct name as a ### subheading (e.g. ### The Drive for Mastery)
- Write 2 short paragraphs (4-5 lines each) that:
  - Show how this theme first appeared in early life
  - Trace 3-4 concrete examples of how it has reproduced across different decades and contexts — drawing on achievements, education choices, and career moves
  - Name what others have consistently observed about you in relation to this theme
  - Where the career history illuminates the theme (e.g. a pattern of moving towards greater complexity, or repeatedly leaving organisations at a particular point), name it directly

## What the Pattern Reveals
CRITICAL: This section MUST always be present with the exact heading "## What the Pattern Reveals". It MUST be a separate, distinct section from "## Recurring Motifs" — do NOT merge them or omit this heading.

ANTI-REPETITION RULE (MANDATORY): Do NOT reproduce, restate, paraphrase, or echo any sentence or paragraph that already appeared in "## The Opening Bars" or "## Recurring Motifs". This section is purely analytical and interpretive — it draws conclusions from the pattern, it does not retell it. If you find yourself writing a sentence that describes a specific episode or event already mentioned above, stop and replace it with an inference or conclusion instead.

Write 2 short paragraphs that:
- Name the single most consistent thread running from earliest experiences to today — what does the whole pattern add up to? Draw on the full arc: family background → early achievements → education → career trajectory. State this as a synthesis conclusion, not as a retelling of events.
- State what the ESF distribution tells us about deepest motivational drivers — what does the balance of Enjoyment, Strength, and Fulfilment reveal about what truly drives this person?

Close with: "From what you have told us, we can see:" followed by 3-5 bullets that name the core motivational findings — insights that could only emerge from seeing the whole pattern together, not from any single achievement.

Throughout: write directly to the client using "you" and "your", reference actual achievements from the data by name and decade. Keep every paragraph to 4-5 lines maximum.`;

// ─── Build the achievement context string (including enrichment and counsellor notes) ──
function buildAchievementContext(
  achievementsList: Array<{
    decade?: string | null;
    age?: number | null;
    title?: string | null;
    esf?: string | null;
    description?: string | null;
    othersObservations?: string | null;
    sageEnrichment?: string | null;
    counsellorNotes?: string | null;
  }>
): string {
  if (achievementsList.length === 0) return "No achievements recorded.";
  return achievementsList
    .map((a) => {
      const lines: string[] = [];
      lines.push(`[${a.decade?.toUpperCase() ?? "??"}, Age ${a.age ?? "?"}] ${a.title ?? "Untitled"} (${a.esf ?? "unclassified"})`);
      if (a.description) lines.push(`  Client description: ${a.description}`);
      if (a.othersObservations) lines.push(`  Others observed: ${a.othersObservations}`);
      if (a.sageEnrichment) lines.push(`  Sage conversation detail: ${a.sageEnrichment}`);
      if (a.counsellorNotes) lines.push(`  Counsellor notes: ${a.counsellorNotes}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

// ─── Main export: generate and store the canonical Stage 1 ───────────────────
export async function generateAndStoreCanonicalStage1(clientId: number): Promise<string> {
  const [profile, achievementsList, interviewMsgs, family, career] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getInterviewMessages(clientId),
    getFamilyBackground(clientId),
    getCareerHistory(clientId),
  ]);

  if (!profile) throw new Error(`Client profile not found for id ${clientId}`);

  const realName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.email ||
    `Client ${clientId}`;
  // Pseudonymise: replace real name with a neutral token in all LLM prompts.
  // The real name is never sent to Claude — only "the client" appears in API calls.
  const { restore: restoreName } = pseudonymise(profile.firstName, profile.lastName);
  const clientName = PSEUDONYM_TOKEN;

  const achievementContext = buildAchievementContext(achievementsList);

  // Family background section
  const familyLines: string[] = [];
  if (family) {
    familyLines.push("--- FAMILY BACKGROUND ---");
    if (family.fatherOccupation) familyLines.push(`Father's occupation: ${family.fatherOccupation}`);
    if (family.motherOccupation) familyLines.push(`Mother's occupation: ${family.motherOccupation}`);
    if (family.siblingPosition) familyLines.push(`Sibling position: ${family.siblingPosition}`);
    if (family.upbringingLocation) familyLines.push(`Upbringing location: ${family.upbringingLocation}`);
    if (family.familyNarrative) familyLines.push(`Family narrative: ${family.familyNarrative}`);
    if (family.significantInfluences) familyLines.push(`Significant influences: ${family.significantInfluences}`);
  }
  const familyContext = familyLines.length > 1 ? familyLines.join("\n") : null;

  // Career history section
  const careerLines: string[] = [];
  if (career && career.length > 0) {
    careerLines.push("--- CAREER HISTORY ---");
    for (const c of career) {
      careerLines.push(
        `${c.organisation ?? ""} — ${c.role ?? ""} (${c.yearFrom ?? ""}–${c.yearTo ?? ""})`.trim()
      );
      if (c.keyResponsibilities) careerLines.push(`  Responsibilities: ${c.keyResponsibilities}`);
      if (c.highlights) careerLines.push(`  Highlights: ${c.highlights}`);
      if (c.whyLeft) careerLines.push(`  Why left: ${c.whyLeft}`);
    }
  }
  const careerContext = careerLines.length > 1 ? careerLines.join("\n") : null;

  // Include Sage 1 interview transcript if available
  const interviewContext =
    interviewMsgs && interviewMsgs.length > 0
      ? interviewMsgs
          .map((m: { role: string; content: string }) => `${m.role === "user" ? "Client" : "Sage"}: ${m.content}`)
          .join("\n")
      : null;

  const contextParts: string[] = [
    // NOTE: clientName is the pseudonym token — real name never sent to Claude.
    `CLIENT: ${clientName}`,
    ...(profile.currentRole ? [`CURRENT ROLE: ${profile.currentRole}`] : []),
    ...(profile.currentOrg ? [`CURRENT ORGANISATION: ${profile.currentOrg}`] : []),
    "",
    "--- LIFE HISTORY ACHIEVEMENTS ---",
    achievementContext,
    ...(familyContext ? ["", familyContext] : []),
    ...(careerContext ? ["", careerContext] : []),
    ...(interviewContext ? ["", "--- SAGE 1 INTERVIEW TRANSCRIPT ---", interviewContext] : []),
    "",
    LIFE_HISTORY_PROMPT,
  ];

  const userPrompt = contextParts.join("\n");

  const response = await invokeLLM({
    messages: [
      { role: "system", content: CANONICAL_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const rawStage1Text = (response.choices[0]?.message?.content as string) ?? "";
  if (!rawStage1Text) throw new Error("LLM returned empty canonical Stage 1 output");

  // Restore the real name in the output before storing — the stored canonical
  // text should use the client's real name for readability in the counsellor UI.
  const stage1Text = restoreName(rawStage1Text);

  await updateCanonicalStage1(clientId, stage1Text);

  return stage1Text;
}

/**
 * Get the canonical Stage 1 for a client, generating it on demand if it doesn't exist.
 * This is the function called by both the WoW report and the counsellor report.
 */
export async function getOrGenerateCanonicalStage1(clientId: number): Promise<string> {
  const existing = await getAnalysisReport(clientId);
  if (existing?.canonicalStage1) {
    console.log(`[Canonical Stage 1] Using stored canonical output for client ${clientId}`);
    return existing.canonicalStage1;
  }
  console.log(`[Canonical Stage 1] No stored output found — generating for client ${clientId}`);
  return generateAndStoreCanonicalStage1(clientId);
}
