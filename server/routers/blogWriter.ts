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

  "first-career-seeker": `Frame this post for someone at the very start of their working life — a graduate, school leaver, or young professional who has not yet settled into a career direction. Write as a coach addressing the specific anxieties, pressures, and opportunities of this stage: the noise of external expectations, the difficulty of self-knowledge at 21, and the value of starting from what genuinely energises rather than what looks good on paper. The tone should be encouraging without being patronising.`,

  "work-returner": `Frame this post for someone returning to work after a significant break — whether for caring responsibilities, illness, redundancy, or a deliberate pause. Write as a coach who understands the particular challenges of this moment: the loss of professional identity, the fear of being out of date, and the opportunity to re-enter on different terms. Acknowledge the emotional reality of the transition before offering the analytical perspective.`,

  "made-redundant": `Frame this post for someone who has recently been made redundant. Write as a coach who takes the emotional weight of redundancy seriously — the shock, the identity disruption, the temptation to rush into the first available role — before making the case for using this moment to think more carefully about what they actually want. The tone should be honest and grounded, not relentlessly upbeat.`,

  "approaching-retirement": `Frame this post for someone in their late fifties or early sixties who is beginning to think about the transition out of full-time work. Write as a coach who understands that this transition is as much about identity and purpose as it is about finance or logistics. Address the question of what comes next — not as a wind-down but as a potential reorientation toward what has always mattered most. The tone should be thoughtful and unhurried.`,
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
      const promptResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a creative director generating inner photograph prompts for a branded LinkedIn image template called Lifework.

The final image will be a 1080×1080 square with a navy blue (#1a2744) frame and a branded footer strip. You are generating ONLY the inner photograph (960×890px) — no text, no logos, no overlays will appear inside the photo itself.

Generate exactly 3 distinct photograph prompts following the register specification below. Each prompt must:
- Be 2–3 sentences long and specific enough to guide image generation
- Differ meaningfully from the other two in subject and composition
- Follow the register style precisely
- Produce an image that reads clearly inside a navy frame

${registerSpec}

${universalNegative}

Respond with JSON only (no markdown fences): { "prompts": ["prompt1", "prompt2", "prompt3"] }`,
          },
          {
            role: "user",
            content: `Post topic: ${postTypeLabel} — ${aspectLabel}

Post text:
${input.postText}

Generate 3 photograph prompts for the inner photo area using Register ${register}.`,
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
