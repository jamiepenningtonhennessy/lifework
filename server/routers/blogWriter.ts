/**
 * Blog Writing Machine
 *
 * Generates a ~300-word LinkedIn post for Lifework coaches.
 * The user picks:
 *   - postType   — the framing/genre of the post
 *   - aspect     — the Lifework topic to write about
 *   - voice      — one of the five writing voices (or House Style)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// ─── Taxonomy ────────────────────────────────────────────────────────────────

export const POST_TYPES = [
  { id: "personal-testimony", label: "Personal testimony" },
  { id: "personal-reflections", label: "Personal reflections" },
  { id: "comparison", label: "Comparison with other tools" },
  { id: "recent-experiences", label: "Recent experiences with clients or colleagues" },
  { id: "changed-worldview", label: "Changed world view" },
] as const;

export const LIFEWORK_ASPECTS = [
  { id: "reflective-process", label: "The reflective process required" },
  { id: "psychometric-underpinnings", label: "History of psychometric underpinnings" },
  { id: "personal-feedback", label: "The value of personal feedback" },
  { id: "ai-in-process", label: "The usefulness of AI within the process" },
  { id: "report-structure", label: "The structure of the reports" },
  { id: "focus-on-strength", label: "The focus on strength" },
  { id: "agreed-evidence", label: "The production of agreed evidence" },
  { id: "depth-of-analysis", label: "The depth of analysis" },
  { id: "development-edge", label: "The development edge — seeing where your life history pattern may not have helped" },
  { id: "fundamental-drivers", label: "Analysis of fundamental drivers" },
  { id: "career-directions", label: "Career directions" },
] as const;

export const BLOG_VOICES = [
  { id: "house", label: "House Style" },
  { id: "mark", label: "Mark Brandon" },
  { id: "oliver-sacks", label: "Oliver Sacks" },
  { id: "william-zinsser", label: "William Zinsser" },
  { id: "clive-james", label: "Clive James" },
  { id: "michael-lewis", label: "Michael Lewis" },
] as const;

export type PostTypeId = typeof POST_TYPES[number]["id"];
export type AspectId = typeof LIFEWORK_ASPECTS[number]["id"];
export type BlogVoiceId = typeof BLOG_VOICES[number]["id"];

// ─── Voice system prompts ─────────────────────────────────────────────────────

const VOICE_PROMPTS: Record<BlogVoiceId, string> = {
  house: `You write in a clear, warm, professional British voice — the house style of Pennington Hennessy. Your sentences are precise and well-structured. You use plain English, avoid jargon, and write with quiet authority. You do not over-explain. You do not use exclamation marks. You write to be read, not to impress.`,

  mark: `You write in the style of Mark Brandon — a British writer, journalist, and legal sector consultant. Your voice is direct, economical, and occasionally wry. You cut ruthlessly: every sentence earns its place. You use short declarative sentences for emphasis after longer analytical ones. You use parenthetical asides sparingly for dry wit. You use British spellings. You do not flatter. You do not use exclamation marks. You write to be remembered.`,

  "oliver-sacks": `You write in the style of Oliver Sacks — a physician-writer who combined clinical precision with deep human curiosity. Your voice is warm, unhurried, and intellectually generous. You ground abstract ideas in specific human stories. You use precise vocabulary without condescension. You are genuinely fascinated by what makes each person singular. You write with the patience of someone who believes that understanding a single case fully is more valuable than a thousand generalisations.`,

  "william-zinsser": `You write in the style of William Zinsser — the author of On Writing Well. Your voice is clear, direct, and stripped of clutter. You apply the Zinsser Test to every sentence: cut every word that doesn't earn its place, make every passive construction active, replace every long word with its short equivalent, remove every qualifier that weakens without adding precision. You write for the reader, not for yourself. Clarity is the highest virtue.`,

  "clive-james": `You write in the style of Clive James — the Australian critic, essayist, and broadcaster who spent his career in Britain. Your voice is erudite, witty, and warmly human. You carry your learning lightly. You use analogy and cultural reference with precision, never to show off. Your sentences have rhythm. You can be funny without being flippant, and serious without being solemn. You write as if the reader is intelligent and deserves to be entertained as well as informed.`,

  "michael-lewis": `You write in the style of Michael Lewis — the American narrative non-fiction writer. Your voice is propulsive, character-driven, and built on specific detail. You make the abstract concrete by finding the human story inside it. You use the present tense to create urgency. You build scenes. You find the counterintuitive angle and make it feel inevitable in retrospect. You write as if every idea has a story, and every story has a person at its centre.`,
};

// ─── Post type framing instructions ──────────────────────────────────────────

const POST_TYPE_INSTRUCTIONS: Record<PostTypeId, string> = {
  "personal-testimony": `Frame this as a first-person account — the writer sharing what they personally discovered or experienced through Lifework. Use "I" throughout. Ground it in a specific moment or realisation. Make it feel like a genuine confession, not a sales pitch.`,

  "personal-reflections": `Frame this as a thoughtful first-person reflection — the writer stepping back to consider what they have learned or observed over time. Use "I" throughout. The tone should be contemplative and honest, not promotional.`,

  "comparison": `Frame this as a comparison between Lifework and other career tools, assessments, or coaching approaches the writer has encountered. Be fair and specific — name what other tools do well, then explain what Lifework does differently or better. Avoid vague superiority claims.`,

  "recent-experiences": `Frame this as a brief account of something the writer observed recently — with a client, a colleague, or in a coaching conversation. Protect client confidentiality (no names, no identifying details). The story should illustrate a specific insight about the Lifework process.`,

  "changed-worldview": `Frame this as a before-and-after account — how the writer's understanding of careers, strengths, or human potential shifted as a result of working with or through Lifework. Be specific about what changed and why.`,
};

// ─── Aspect context ───────────────────────────────────────────────────────────

const ASPECT_CONTEXT: Record<AspectId, string> = {
  "reflective-process": `The Lifework process requires the participant to reflect carefully on their whole life — not just their career — and to revisit experiences they may not have thought about for years. This reflective work is unusual in career coaching and is central to the quality of the analysis that follows.`,

  "psychometric-underpinnings": `Lifework draws on two well-established psychometric frameworks: the VIA Character Strengths Survey (developed by Martin Seligman and Christopher Peterson as part of positive psychology) and the Big Five personality model (OCEAN), using the IPIP-NEO instrument. These are combined with a structured life history analysis rooted in Bernard Haldane's Dependable Strengths methodology.`,

  "personal-feedback": `One of the distinctive features of Lifework is that all psychometric results are held back from the participant until they are presented in a live coaching session. This means the data is always contextualised by the counsellor, who can relate it to the participant's own life history and help them understand what the numbers actually mean for them specifically.`,

  "ai-in-process": `Lifework uses AI — specifically a large language model — to conduct the initial life history interview (through a tool called Sage) and to generate the first draft of the analysis report. The AI works from the participant's own words and the psychometric data, and the counsellor then reviews, edits, and presents the report in a live session.`,

  "report-structure": `The Lifework WOW Report is structured around several analytical chapters: a portrait of who the person is, a life history pattern analysis, a character strengths analysis, a personality profile, a behavioural style assessment, a development edge section (where the pattern may have worked against the person), and a set of career directions grounded in the evidence.`,

  "focus-on-strength": `Lifework is explicitly strength-based: it starts from what the person has found genuinely enjoyable, satisfying, and fulfilling — not from what they are merely competent at, or what the job market currently rewards. The underlying belief, from Bernard Haldane's work, is that motivated strengths — things a person does well and loves doing — are the most reliable predictor of future success and satisfaction.`,

  "agreed-evidence": `A key feature of the Lifework process is that the life history analysis is built from evidence that the participant themselves has provided and confirmed. The AI summarises what it has heard; the participant confirms or corrects it. The final analysis is therefore grounded in agreed evidence, not in the counsellor's interpretation of a questionnaire.`,

  "depth-of-analysis": `The Lifework report goes considerably deeper than most career assessments. It analyses not just psychometric scores but the pattern of a whole life — what the person has consistently found rewarding across very different contexts, from childhood to the present day. The combination of life history, character strengths, personality facets (not just domain scores), and behavioural style produces a multi-layered picture that most single-instrument tools cannot match.`,

  "development-edge": `The development edge section of the Lifework report addresses something most career tools avoid: the ways in which the participant's own strengths and patterns may have worked against them at times. This is not a deficit model — it is an honest account of how a strength, over-applied or applied in the wrong context, can become a limitation.`,

  "fundamental-drivers": `The Lifework analysis identifies the fundamental drivers that have shaped the participant's choices and satisfactions across their whole life — the underlying motivations that persist across very different roles and contexts. Understanding these drivers helps the participant make better decisions about what to pursue and what to avoid.`,

  "career-directions": `The career directions section of the Lifework report translates the analysis into specific, evidence-grounded recommendations about roles, sectors, and working environments that are likely to suit the participant. These are not generic suggestions — they are derived directly from the participant's own life history pattern, character strengths, and personality profile.`,
};

// ─── Router ───────────────────────────────────────────────────────────────────

export const blogWriterRouter = router({
  generate: protectedProcedure
    .input(z.object({
      postType: z.enum(POST_TYPES.map(p => p.id) as [PostTypeId, ...PostTypeId[]]),
      aspect: z.enum(LIFEWORK_ASPECTS.map(a => a.id) as [AspectId, ...AspectId[]]),
      voice: z.enum(BLOG_VOICES.map(v => v.id) as [BlogVoiceId, ...BlogVoiceId[]]),
    }))
    .mutation(async ({ input }) => {
      const postTypeLabel = POST_TYPES.find(p => p.id === input.postType)!.label;
      const aspectLabel = LIFEWORK_ASPECTS.find(a => a.id === input.aspect)!.label;
      const voiceLabel = BLOG_VOICES.find(v => v.id === input.voice)!.label;

      const voicePrompt = VOICE_PROMPTS[input.voice];
      const postTypeInstruction = POST_TYPE_INSTRUCTIONS[input.postType];
      const aspectContext = ASPECT_CONTEXT[input.aspect];

      const systemPrompt = `You are writing a LinkedIn post for a career coach who uses the Lifework methodology developed by Pennington Hennessy.

VOICE:
${voicePrompt}

LIFEWORK CONTEXT — what you know about the topic:
${aspectContext}

POST FRAMING:
${postTypeInstruction}

LINKEDIN FORMAT RULES:
- Length: 280–320 words. No more, no less.
- No hashtags.
- No emojis.
- No bullet points unless they carry genuinely distinct information that would be clumsy in prose.
- Write in the first person throughout.
- Do not name Pennington Hennessy, Lifework, or any specific tool by name — write as if describing your own practice and experience.
- Do not use the phrase "game-changer" or any similar cliché.
- Do not end with a call to action ("DM me", "link in bio", etc.).
- End with a single short sentence that lands the point cleanly.
- No preamble in your response — output only the post text.`;

      const userPrompt = `Write a LinkedIn post about: ${aspectLabel}
Post type: ${postTypeLabel}
Voice: ${voiceLabel}

Write the post now.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
      });

      const post = response.choices[0]?.message?.content as string;
      if (!post) throw new Error("No content returned from LLM");

      return {
        post: post.trim(),
        postTypeLabel,
        aspectLabel,
        voiceLabel,
      };
    }),

  // Expose the taxonomy to the frontend
  getTaxonomy: protectedProcedure.query(() => ({
    postTypes: POST_TYPES,
    aspects: LIFEWORK_ASPECTS,
    voices: BLOG_VOICES,
  })),
});
