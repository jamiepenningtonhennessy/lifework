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
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { composeNavyFrame } from "../scripts/composeNavyFrame";

// Map post type + aspect to a category label for the bottom rail
function getCategoryLabel(postTypeId: string, aspectId: string): string {
  const aspectMap: Record<string, string> = {
    "reflective-process": "REFLECTIONS",
    "psychometric-underpinnings": "IN PRACTICE",
    "personal-feedback": "REFLECTIONS",
    "ai-in-process": "IN PRACTICE",
    "report-structure": "IN PRACTICE",
    "focus-on-strength": "STRENGTHS",
    "agreed-evidence": "STRENGTHS",
    "depth-of-analysis": "LIFELINE",
    "development-edge": "LIFELINE",
    "fundamental-drivers": "STRENGTHS",
    "career-directions": "IN PRACTICE",
  };
  const postTypeMap: Record<string, string> = {
    "personal-testimony": "REFLECTIONS",
    "personal-reflections": "REFLECTIONS",
    "comparison": "IN PRACTICE",
    "recent-experiences": "IN PRACTICE",
    "changed-worldview": "REFLECTIONS",
    "first-career-seeker": "IN PRACTICE",
    "work-returner": "IN PRACTICE",
    "made-redundant": "REFLECTIONS",
    "approaching-retirement": "LIFELINE",
  };
  return aspectMap[aspectId] ?? postTypeMap[postTypeId] ?? "LIFEWORK";
}

// ─── Taxonomy ────────────────────────────────────────────────────────────────

export const POST_TYPES = [
  { id: "personal-testimony", label: "Personal testimony" },
  { id: "personal-reflections", label: "Personal reflections" },
  { id: "comparison", label: "Comparison with other tools" },
  { id: "recent-experiences", label: "Recent experiences with clients or colleagues" },
  { id: "changed-worldview", label: "Changed world view" },
  { id: "first-career-seeker", label: "First career seeker" },
  { id: "work-returner", label: "Work returner" },
  { id: "made-redundant", label: "Made redundant" },
  { id: "approaching-retirement", label: "Approaching retirement" },
  { id: "process-explainer", label: "Process explainer" },
  { id: "myth-correction", label: "Myth correction" },
  { id: "report-insight", label: "Report insight" },
  { id: "human-and-ai", label: "Human and AI clarification" },
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


// ─── Lifework canon for marketing writing ───────────────────────────────────────

export const LIFEWORK_BLOG_CANON = `LIFEWORK CANON — mandatory source knowledge:

1. One-sentence definition:
Lifework is a Pennington Hennessy career-analysis journey that helps people discover the patterns of strength, motivation, value, and fit already visible in the life they have lived, then use those patterns as a compass for future work.

2. Intellectual root:
Lifework is rooted in Bernard Haldane's Dependable Strengths tradition. The core premise is that a person's most dependable strengths are revealed in real achievement stories — the moments where they were energised, effective, absorbed, useful, courageous, creative, or most fully themselves.

3. The governing distinction:
Lifework is not primarily a questionnaire, a job-matching algorithm, or a personality labelling exercise. It begins with lived evidence. Psychometrics are lenses, not labels. The report is a compass, not a prescription.

4. The journey:
- Past: a structured life-history interview explores achievements decade by decade. This is not a CV review. It looks for recurring patterns in Emotions, Skills, and Values.
- Present: VIA Character Strengths and Big Five/IPIP-NEO are used as validated lenses on the life-history evidence. They confirm, complicate, sharpen, or challenge what the story already shows.
- Future: Sage, the AI career coach, asks reflective questions that help the client notice the pattern. The counsellor then brings the evidence together in human synthesis.

5. The Wow Report:
The Lifework Wow Report is not a test result and not a computer-generated verdict. It is an interpretive synthesis of life-history evidence, achievement stories, recurring strengths, values, psychometric lenses, Sage reflections, and counsellor judgement. Its purpose is to offer working hypotheses, possible directions, useful conditions, and a clearer compass for future choices.

6. What every post must do:
Every post must be grounded in at least one concrete Lifework feature: life-history achievement work, Dependable Strengths, Emotions/Skills/Values, VIA Character Strengths, Big Five/IPIP-NEO, Sage's reflective questioning, counsellor synthesis, or the Wow Report. If a draft could have been written by a generic career coach without knowledge of Lifework, it has failed.

7. Preferred language:
Use words such as pattern, evidence, compass, thread, fit, energy, value, strengths, aliveness, congruence, next chapter, working hypotheses, choices, conditions, and direction.

8. Forbidden or weak language:
Avoid diagnosis, destiny, perfect job, guaranteed answer, algorithmic certainty, hidden passion, hack, unlock your dream career, test result, and any claim that AI tells the person what to do.

9. AI and human judgement:
Sage helps the client notice the pattern; the counsellor helps the client make sense of it. Never imply that AI replaces the counsellor or delivers an oracle-like answer.

10. Voice:
Write with reflective, humane, professional restraint. The voice should be precise, literate, quietly confident, and useful to thoughtful professionals. Avoid hype, motivational shouting, generic LinkedIn influencer language, and sales-funnel pressure.`;

const LIFEWORK_BLOG_QUALITY_CHECK = `FINAL QUALITY CHECK — silently revise before output if needed:
- Does the post clearly reflect Lifework's actual method, not generic career coaching?
- Does it use at least one real Lifework journey element?
- Does it treat lived achievement as evidence?
- Does it describe psychometrics as lenses rather than labels?
- Does it avoid claiming or implying that AI produces a deterministic answer?
- If the Wow Report is mentioned, is it described as synthesis and compass rather than a test result?
- Does it sound reflective, precise, humane, professional, and non-hyped?`;

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

  "first-career-seeker": `Frame this post for someone at the very start of their working life — a graduate, school leaver, or young professional who has not yet settled into a career direction. Write as a coach addressing the specific anxieties, pressures, and opportunities of this stage: the noise of external expectations, the difficulty of self-knowledge at 21, and the value of starting from what genuinely energises rather than what looks good on paper. The tone should be encouraging without being patronising.`,

  "work-returner": `Frame this post for someone returning to work after a significant break — whether for caring responsibilities, illness, redundancy, or a deliberate pause. Write as a coach who understands the particular challenges of this moment: the loss of professional identity, the fear of being out of date, and the opportunity to re-enter on different terms. Acknowledge the emotional reality of the transition before offering the analytical perspective.`,

  "made-redundant": `Frame this post for someone who has recently been made redundant. Write as a coach who takes the emotional weight of redundancy seriously — the shock, the identity disruption, the temptation to rush into the first available role — before making the case for using this moment to think more carefully about what they actually want. The tone should be honest and grounded, not relentlessly upbeat.`,

  "approaching-retirement": `Frame this post for someone in their late fifties or early sixties who is beginning to think about the transition out of full-time work. Write as a coach who understands that this transition is as much about identity and purpose as it is about finance or logistics. Address the question of what comes next — not as a wind-down but as a potential reorientation toward what has always mattered most. The tone should be thoughtful and unhurried.`,

  "process-explainer": `Explain one specific part of the Lifework journey in plain, accurate English — what it is, why it exists, and what it reveals. The aim is to demystify the process for someone who has not been through it. Choose one element: the life-history interview, the Emotions/Skills/Values frame, the VIA Character Strengths survey, the Big Five/IPIP-NEO profile, Sage's reflective questioning, or the counsellor synthesis. Do not try to explain everything at once. Be precise about what that element does and does not do. The tone should be clear, confident, and non-promotional.`,

  "myth-correction": `Challenge one common misconception about career change, career assessment, or career coaching — and use Lifework's actual method as the corrective. Name the myth clearly and fairly before dismantling it. The contrast should be specific: what most tools do versus what Lifework does differently. Avoid vague superiority claims. Ground the correction in a real feature of the Lifework process. The tone should be honest, direct, and intellectually confident without being dismissive.`,

  "report-insight": `Explain what the Lifework Wow Report is — and, just as importantly, what it is not. It is not a personality verdict, not a computer-generated job list, not a test result. It is an interpretive synthesis of life-history evidence, achievement stories, psychometric lenses, reflective dialogue, and counsellor judgement. Describe one specific element of the report — the life-history pattern, the character strengths analysis, the development edge, or the career directions — and explain what it offers the reader. The tone should be thoughtful and precise.`,

  "human-and-ai": `Clarify the relationship between Sage (the AI career coach) and the human counsellor in the Lifework process. Sage helps the client reflect, organise material, and notice the pattern; the counsellor performs the human work of synthesis, challenge, interpretation, and care. The post should be honest about what AI does well in this context and clear about what it cannot replace. Avoid both AI-scepticism and AI-hype. The tone should be measured, accurate, and reassuring to thoughtful professionals who may be uncertain about the role of AI in a coaching context.`,
};

// ─── Aspect context ───────────────────────────────────────────────────────────

const ASPECT_CONTEXT: Record<AspectId, string> = {
  "reflective-process": `The Lifework life-history interview is not a CV review. It explores moments of achievement and aliveness across the person's whole life — childhood, education, early work, later career, family life, community roles, creative pursuits, difficult transitions. The interpretive frame is Emotions, Skills, and Values: what the person felt, what they actually did, what skills appeared, what values were expressed, and what conditions allowed them to be at their best. These details become evidence for recurring patterns. The reflective work is unusual in career coaching and is central to the quality of everything that follows.`,

  "psychometric-underpinnings": `Lifework uses two validated psychometric frameworks as lenses, not labels. The VIA Character Strengths Survey (Martin Seligman and Christopher Peterson, positive psychology) and the Big Five personality model (OCEAN), using the IPIP-NEO instrument, are applied after the life-history work — not instead of it. They are supplementary views on the same underlying evidence: they may confirm, challenge, sharpen, or complicate the patterns already visible in the achievement stories. Questionnaires can be useful lenses; they are not the foundation.`,

  "personal-feedback": `One of the distinctive features of Lifework is that all psychometric results are withheld from the participant until they are presented in a live counselling session. This means the data is always contextualised by the counsellor, who can relate it to the participant's own life history and help them understand what the numbers actually mean for them specifically. The result is not a self-administered score but a counsellor-mediated conversation grounded in the person's own evidence.`,

  "ai-in-process": `Lifework uses AI in a specific and bounded way. Sage, the AI career coach, reads what the client has written and asks reflective questions that help the client notice the pattern in their own evidence. Sage does not deliver a verdict. It helps the client reflect, organise material, and surface questions. The counsellor then performs the human work of synthesis, challenge, interpretation, and care — bringing the evidence together in the Wow Report and the live session. AI helps ask better questions; human judgement brings the pattern together.`,

  "report-structure": `The Lifework Wow Report is not a personality report, not a computer-generated assessment, and not a list of suggested jobs. It is an interpretive synthesis that draws together the person's life-history evidence, recurring strengths, Emotions/Skills/Values patterns, psychometric lenses, Sage reflections, and counsellor judgement. Its chapters address who the person is, the pattern of their life history, their character strengths, their personality profile, their behavioural style, their development edge (where the pattern may have worked against them), and career directions grounded in the evidence. The report is a compass, not a prescription.`,

  "focus-on-strength": `Lifework begins from what the person has found genuinely enjoyable, satisfying, and fulfilling — not from what they are merely competent at, or what the job market currently rewards. The distinction between competence and energising strength is central: being good at something does not mean it gives life. Bernard Haldane's Dependable Strengths tradition holds that motivated strengths — things a person does well and loves doing — are the most reliable predictor of future success and satisfaction. Your most dependable strengths often appear in the stories where you were most alive and effective.`,

  "agreed-evidence": `A key feature of Lifework is that the life-history analysis is built from evidence the participant themselves has provided and confirmed. The process asks what the person felt, what they actually did, what skills appeared, and what values were expressed — then builds the analysis from those agreed facts. The final report is therefore grounded in agreed evidence, not in the counsellor's interpretation of a questionnaire. The report starts from what you have actually done, not from who a test says you are.`,

  "depth-of-analysis": `The Lifework report analyses not just psychometric scores but the pattern of a whole life — what the person has consistently found rewarding across very different contexts, from childhood to the present day. Most career assessments work from a single instrument administered on a single day. Lifework combines life-history achievement work, the Emotions/Skills/Values frame, VIA Character Strengths, Big Five personality facets (not just domain scores), Sage reflections, and counsellor synthesis. The result is a multi-layered picture that looks for the threads that keep reappearing when the person is at their best.`,

  "development-edge": `The development edge section of the Lifework report addresses something most career tools avoid: the ways in which the participant's own strengths and patterns may have worked against them at times. This is not a deficit model. It is an honest account of how a strength, over-applied or applied in the wrong context, can become a limitation. Understanding the development edge is not about fixing a weakness; it is about seeing the full shape of the pattern — including where it has occasionally created friction, blind spots, or unintended consequences.`,

  "fundamental-drivers": `The Lifework analysis identifies the fundamental drivers that have shaped the participant's choices and satisfactions across their whole life — the underlying motivations that persist across very different roles and contexts. These are not personality labels or trait scores. They are patterns extracted from real achievement stories: the recurring conditions under which the person has been most energised, most effective, and most fully themselves. Understanding these drivers helps the participant make better decisions about what to pursue and what to avoid.`,

  "career-directions": `The career directions section of the Lifework report translates the analysis into specific, evidence-grounded hypotheses about roles, sectors, and working environments that are likely to suit the participant. These are not generic suggestions derived from a questionnaire. They are working hypotheses — possible directions to test, not orders to obey — derived directly from the participant's own life history pattern, character strengths, personality profile, and the conditions under which they have consistently done their best work.`,
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

${LIFEWORK_BLOG_CANON}

VOICE:
${voicePrompt}

LIFEWORK TOPIC CONTEXT — use this as the specific angle for this post:
${aspectContext}

POST FRAMING:
${postTypeInstruction}

LINKEDIN FORMAT RULES:
- Length: 280–320 words. No more, no less.
- No hashtags.
- No emojis.
- No bullet points unless they carry genuinely distinct information that would be clumsy in prose.
- Write primarily in the first person where the selected post type is personal or reflective; otherwise write from the coach's considered point of view.
- You may name Lifework, the Wow Report, Sage, VIA Character Strengths, Big Five/IPIP-NEO, or Dependable Strengths when doing so makes the post more accurate and concrete. Do not force all of them into one post.
- Do not use the phrase "game-changer" or any similar cliché.
- Do not end with a call to action ("DM me", "link in bio", etc.).
- End with a single short sentence that lands the point cleanly.

${LIFEWORK_BLOG_QUALITY_CHECK}

No preamble in your response — output only the post text.`;

      const userPrompt = `Write a LinkedIn post about: ${aspectLabel}
Post type: ${postTypeLabel}
Voice: ${voiceLabel}

Before drafting, silently work through these steps:
1. Select one audience: graduate/school leaver; mid-career professional; returner; approaching retirement; thoughtful professional (lawyer, consultant, etc.); or general reflective reader.
2. Select one message pillar: life already lived; strength versus competence; lenses not labels; returner's strength; retirement as expression; counsellor synthesis; compass not prescription.
3. Select one Lifework journey element as the concrete anchor: life-history interview; Emotions/Skills/Values; VIA Character Strengths; Big Five/IPIP-NEO; Sage's reflective questioning; counsellor synthesis; or the Wow Report.
4. Draft the post so it would not make sense without that specific Lifework knowledge.
5. Check: does it overclaim, use deterministic language, or invent examples? If so, revise.
6. Check: does it sound like Pennington Hennessy — reflective, precise, humane, quietly confident — rather than a generic LinkedIn influencer? If not, revise.
Then write the post now.`;

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

  generateImages: protectedProcedure
    .input(z.object({
      postText: z.string().min(50),
      postType: z.enum(POST_TYPES.map(p => p.id) as [PostTypeId, ...PostTypeId[]]),
      aspect: z.enum(LIFEWORK_ASPECTS.map(a => a.id) as [AspectId, ...AspectId[]]),
      register: z.enum(["A", "B"]).default("A"),
    }))
    .mutation(async ({ input }) => {
      const postTypeLabel = POST_TYPES.find(p => p.id === input.postType)!.label;
      const aspectLabel = LIFEWORK_ASPECTS.find(a => a.id === input.aspect)!.label;
      const categoryLabel = getCategoryLabel(input.postType, input.aspect);
      const register = input.register ?? "A";

      const registerSpec = register === "A" ? `
## Register A — Warm Cinematic
Subject: a real person in their environment (at a workbench, in a doorway, near a window), or hands mid-activity (writing, holding, making), or an everyday environment loaded with personal meaning. Never: laptops on desks, handshakes, conference rooms, stock-business clichés.
Light: natural, warm, directional. Window or golden-hour. Side-lit or back-lit. Shadow is welcomed.
Colour grade: warm, slightly faded film stock (Kodak Portra register). Deep blacks, warm highlights, true skin tones. Light vignette.
Composition: loose, observational, asymmetric. Negative space welcomed.
References: Gregory Heisler, Joey L, mid-period Annie Leibovitz editorial portraiture. (For guidance, not imitation.)` : `
## Register B — Painterly Quiet
Subject: observed, not staged. A person half-glimpsed through window or doorway. A hand resting on something. Light falling across an object. The kind of moment you'd usually walk past.
Light: soft, diffuse, slightly cool. Overcast, fogged glass, shade, dawn. Not dramatic.
Colour grade: muted, gentle contrast, slightly cool. Colour present but quiet — a faded blue, soft green, the suggestion of warmth rather than warmth itself.
Composition: fragmentary, partial. A corner, a slice, an edge. Feels caught, not shown.
References: Saul Leiter, Rinko Kawauchi (austere), Wolfgang Tillmans.`;

      const universalNegative = `Avoid: AI tells (extra fingers, extra teeth, plastic skin, glowing edges, garbled letterforms, broken hands); saturated tropical colour palettes; gradient backgrounds; emojis or graphic overlays inside the photo; corporate stock clichés (handshakes, conference rooms, laptops on desks, headshots against grey backdrops); heavy Instagram filter looks; lens flares as decoration; AI watermarks or signatures.`;

      // Step 1: Ask the LLM to generate 3 distinct PHOTO-ONLY prompts (960×890 inner photo)
      // Each prompt is assigned a MANDATORY archetype to prevent the LLM defaulting to
      // the same three clichés (body part / person / notebook) every time.
      const promptResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a creative director and cinematographer writing image generation prompts for a branded LinkedIn editorial series called Lifework.

The final image will be a 1080×1080 square with a navy blue frame and branded footer. You are writing ONLY the inner photograph prompt (960×890px) — no text, logos, or overlays appear inside the photo.

You must generate exactly 3 prompts. Each is assigned a MANDATORY visual archetype. The archetypes force genuine variety — you cannot deviate, swap, or blend them.

---

HOW TO WRITE A GREAT PROMPT:
Bad prompts are vague and generic: "a man sitting at a table", "an empty corridor", "a hand on a surface".
Great prompts are specific, sensory, and cinematic. They name the exact light, the precise moment, the specific texture. They read like a film director's shot note.

Examples of great prompts:
- "Late afternoon light cuts across a worn oak workbench in a small joinery workshop. Sawdust still in the air. A half-finished chair leg rests at the edge of frame. No people. Shot on 35mm, shallow depth of field, warm amber shadows."
- "A woman in her late 40s stands at the far end of a long hospital corridor, back to camera, pausing at a window. Fluorescent light above, daylight ahead. The corridor is empty. She is not moving. Observed, not posed."
- "Close detail of a pair of well-worn leather walking boots on a wooden floor, one lace undone, mud still on the sole. Morning light from the left. The boots have history. Shot tight, slightly low angle."

Notice: specific materials, specific light direction and quality, specific moment in time, specific emotional register. No vague gestures.

---

CRITICAL RULES:
- Each prompt MUST use its assigned archetype.
- Every prompt must be anchored in a SPECIFIC idea, image, or metaphor from the post — not a generic representation of the topic.
- BANNED subjects (in any prompt): notebooks, journals, diaries, open books being written in, hands on keyboards, laptops, phones, coffee cups alone, handshakes, conference rooms, stock-business clichés, motivational-poster aesthetics, ladders into clouds, people standing at crossroads, puzzle pieces, glowing brains, corporate headshots against grey backdrops.
- PREFERRED Lifework visual motifs (use when they fit the post): a compass on warm paper or cream cloth; fine threads or lines connecting documents or moments; a quiet study or counselling room with warm light; a bridge or threshold between spaces; an annotated map or document with handwritten marks; warm paper, navy ink, restrained gold accents; editorial composition with generous negative space. These motifs should feel earned by the post, not forced.
- No two prompts may share the same primary subject.
- Each prompt should be 3–5 sentences. Specific. Sensory. Cinematic.

---

ARCHETYPE ASSIGNMENTS:

Prompt 1 — ENVIRONMENT / PLACE
A specific place or space that embodies the emotional or conceptual core of the post. No people required — the location itself carries the meaning. Choose a place because of something specific in the post: a threshold, a workshop, a garden at a particular hour, a room with significant light, a landscape detail, a domestic space with history. Describe the exact light, the time of day, what is in the frame and what is not.

Prompt 2 — PERSON IN CONTEXT
A real person in their environment — not posed, not looking at camera, caught in a moment of activity or stillness that reflects the post's theme. The activity or setting must come from something specific in the post. The person should feel observed, not performed. Describe their age range, what they are doing, the setting, the light, the emotional register. Avoid: headshots, direct-to-camera, corporate or office settings.

Prompt 3 — OBJECT OR DETAIL WITH NARRATIVE WEIGHT
A close or medium-close photograph of a single object, material, or physical detail that carries symbolic resonance with the post. The object must be chosen because of something specific in the post — not a generic prop. Describe the object precisely: its material, age, condition, the light falling on it, what surrounds it. Banned: notebooks, journals, pens writing, coffee cups alone.

${registerSpec}

${universalNegative}

Respond with JSON only (no markdown fences): { "prompts": ["prompt1", "prompt2", "prompt3"] }`,
          },
          {
            role: "user",
            content: `Post topic: ${postTypeLabel} — ${aspectLabel}

Post text:
${input.postText}

Step 1: Read the post carefully. Identify the three most vivid, specific, concrete ideas or images in the post — moments, metaphors, or details that could anchor a photograph.
Step 2: For each archetype, write a specific, cinematic, sensory prompt (3–5 sentences) grounded in one of those ideas. Name the exact light, the precise moment, the specific material. Make each prompt feel like a film director's shot note, not a stock photo brief.
Use Register ${register}.`,
          },
        ],
      });

      const rawContent = (promptResponse.choices[0]?.message?.content as string ?? "").trim();
      console.log("[blogWriter.generateImages] LLM raw:", rawContent.substring(0, 400));
      const jsonContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      let parsed: { prompts: string[] };
      try {
        parsed = JSON.parse(jsonContent) as { prompts: string[] };
      } catch (parseErr) {
        console.error("[blogWriter.generateImages] JSON parse failed:", parseErr);
        throw new Error(`Image prompt generation failed: could not parse LLM response`);
      }
      const photoPrompts = parsed.prompts.slice(0, 3);
      console.log("[blogWriter.generateImages] Photo prompts:", photoPrompts);

      // Step 2: Generate photos sequentially to avoid timeout and reduce peak load
      console.log("[blogWriter.generateImages] Step 2: generating photos sequentially");
      const compositeResults: PromiseSettledResult<string>[] = [];
      for (let i = 0; i < photoPrompts.length; i++) {
        try {
          console.log(`[blogWriter.generateImages] Generating photo ${i+1}/3...`);
          const photoResult = await generateImage({ prompt: photoPrompts[i] });
          const photoUrl = photoResult.url;
          if (!photoUrl) throw new Error(`Photo ${i+1} returned no URL`);
          console.log(`[blogWriter.generateImages] Photo ${i+1} generated: ${photoUrl.substring(0,60)}`);

          // Download the photo to a temp file
          const photoResp = await fetch(photoUrl);
          if (!photoResp.ok) throw new Error(`Failed to download photo ${i+1}: ${photoResp.status}`);
          const photoBuffer = Buffer.from(await photoResp.arrayBuffer());
          console.log(`[blogWriter.generateImages] Photo ${i+1} downloaded (${photoBuffer.length} bytes)`);

          // Run the Node.js sharp compositor
          console.log(`[blogWriter.generateImages] Running compositor for photo ${i+1}...`);
          const compositeBuffer = await composeNavyFrame(photoBuffer, categoryLabel);
          console.log(`[blogWriter.generateImages] Uploading composite ${i+1} (${compositeBuffer.length} bytes)...`);
          const { url } = await storagePut(
            `blog-images/${Date.now()}-${i+1}.png`,
            compositeBuffer,
            "image/png"
          );
          console.log(`[blogWriter.generateImages] Composite ${i+1} uploaded: ${url?.substring(0,60)}`);
          compositeResults.push({ status: "fulfilled", value: url });
        } catch (err) {
          console.error(`[blogWriter.generateImages] Image ${i+1} failed:`, err);
          compositeResults.push({ status: "rejected", reason: err });
        }
      }

      // (no temp files to clean up — compositor works in memory)

      const images = compositeResults.map((result, i) => ({
        index: i + 1,
        prompt: photoPrompts[i],
        url: result.status === "fulfilled" ? result.value ?? null : null,
        error: result.status === "rejected" ? String((result as PromiseRejectedResult).reason) : null,
      }));

      if (images.every(img => img.url === null)) {
        throw new Error("All image generations failed");
      }

      return { images, categoryLabel };
    }),

  // Expose the taxonomy to the frontend
  getTaxonomy: protectedProcedure.query(() => ({
    postTypes: POST_TYPES,
    aspects: LIFEWORK_ASPECTS,
    voices: BLOG_VOICES,
  })),
});
