/**
 * coachingSlides.ts
 *
 * Generates a branded PowerPoint coaching session deck from stored WOW report
 * sections. Uses pptxgenjs to produce a .pptx buffer that is uploaded to S3
 * and returned as a download URL.
 *
 * Slide structure:
 *   1. Title slide — client name + date
 *   2. Who You Are — 3-4 bullet summary (LLM-extracted from summary section)
 *   3. Life History — key themes (LLM-extracted from lifeHistoryPattern)
 *   4. Character Strengths (VIA) — top 5 strengths with one-line descriptors
 *   5. Personality Profile (OCEAN) — 5 domain bars + key insight
 *   6. Behavioural Style — colour energies + Jungian type
 *   7. The Pattern — cross-instrument synthesis (LLM-extracted)
 *   8. So What? — career directions / client question (LLM-extracted)
 *
 * Theme: Lifework navy (#1a2744) + gold (#c9973a) + cream (#f5f0e8)
 */

import PptxGenJS from "pptxgenjs";
import { storagePut } from "../storage.js";
import { invokeLLM } from "../_core/llm.js";
import { LIFEWORK_LOGO_BASE64 } from "./lifeworkLogoBase64.js";

// ─── Brand colours ────────────────────────────────────────────────────────────
const NAVY  = "1a2744";
const GOLD  = "c9973a";
const CREAM = "f5f0e8";
const WHITE = "FFFFFF";
const LIGHT_NAVY = "2a3a5e";
const MUTED = "8a9bbf";

// ─── Slide dimensions (widescreen 13.33 × 7.5 inches) ────────────────────────
const W = 13.33;
const H = 7.5;

// ─── Colour energy colours ────────────────────────────────────────────────────
const COLOUR_HEX: Record<string, string> = {
  "Fiery Red":        "C0392B",
  "Sunshine Yellow":  "D4AC0D",
  "Earth Green":      "27AE60",
  "Cool Blue":        "2980B9",
};

// ─── OCEAN domain labels ──────────────────────────────────────────────────────
const OCEAN_LABELS: Record<string, string> = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

// ─── LLM helper: extract slide bullets from a markdown section ────────────────
async function extractBullets(
  section: string,
  instruction: string,
  count: number
): Promise<string[]> {
  const sys = `You extract concise bullet points from career analysis report sections for use in coaching slides.
Each bullet must be:
- Maximum 12 words
- A complete, standalone insight
- Written in second person ("You…" or "Your…")
- Free of markdown formatting, asterisks, or special characters
Return ONLY a JSON array of strings, nothing else. Example: ["You thrive when building something new.", "Your creativity is structural, not decorative."]`;

  const user = `${instruction}\n\nExtract exactly ${count} bullets from this section:\n\n${section.slice(0, 3000)}`;

  try {
    const raw = await invokeLLM({ messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ]});
    const rawContent = raw.choices[0]?.message?.content ?? "[]";
    const content = typeof rawContent === "string" ? rawContent : "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, count).map(String);
  } catch {
    // fall through to fallback
  }
  return Array(count).fill("—");
}

// ─── Helper: add branded footer to every slide ───────────────────────────────
function addFooter(slide: PptxGenJS.Slide, clientName: string, slideNum: number, total: number) {
  // Gold rule line
  slide.addShape("rect", { x: 0.4, y: H - 0.45, w: W - 0.8, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });
  // Client name left
  slide.addText(clientName, {
    x: 0.4, y: H - 0.42, w: 5, h: 0.3,
    fontSize: 7, color: MUTED, fontFace: "Calibri",
  });
  // Slide number right
  slide.addText(`${slideNum} / ${total}`, {
    x: W - 1.5, y: H - 0.42, w: 1.1, h: 0.3,
    fontSize: 7, color: MUTED, fontFace: "Calibri", align: "right",
  });
}

// ─── Helper: add logo top-right ───────────────────────────────────────────────
function addLogo(slide: PptxGenJS.Slide) {
  try {
    slide.addImage({ data: LIFEWORK_LOGO_BASE64, x: W - 1.4, y: 0.2, w: 1.0, h: 0.5 });
  } catch {
    // logo embed failed — skip silently
  }
}

// ─── Helper: section eyebrow label ───────────────────────────────────────────
function addEyebrow(slide: PptxGenJS.Slide, text: string, x = 0.55, y = 0.28) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 8, h: 0.25,
    fontSize: 7.5, color: GOLD, bold: true, fontFace: "Calibri",
    charSpacing: 2,
  });
}

// ─── Helper: section heading ──────────────────────────────────────────────────
function addHeading(slide: PptxGenJS.Slide, text: string, x = 0.55, y = 0.55, w = 8) {
  slide.addText(text, {
    x, y, w, h: 0.7,
    fontSize: 26, color: WHITE, bold: true, fontFace: "Georgia",
  });
}

// ─── Helper: gold accent bar ──────────────────────────────────────────────────
function addAccentBar(slide: PptxGenJS.Slide, x = 0.55, y = 1.25, w = 1.2) {
  slide.addShape("rect", { x, y, w, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
}

// ─── Helper: bullet list ──────────────────────────────────────────────────────
function addBullets(
  slide: PptxGenJS.Slide,
  bullets: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize = 14
) {
  const items = bullets.map((b) => ({
    text: b,
    options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize, fontFace: "Calibri", paraSpaceAfter: 6 },
  }));
  slide.addText(items, { x, y, w, h, valign: "top" });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface SlideSections {
  clientName: string;
  summary: string;
  lifeHistoryPattern: string;
  viaSection: string;
  viaRanked: Array<{ name: string; score: number; rank: number }>;
  personalitySection: string;
  domainScores: Record<string, number>;
  behaviouralStyle: string;
  primaryColour: string;
  secondaryColour: string;
  jungianType: string;
  careerDirections: string;
  reportType: string;
}

export async function generateCoachingSlides(data: SlideSections): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5

  const TOTAL = 8;
  const name = data.clientName || "Client";

  // ── Extract LLM bullets (run in parallel) ─────────────────────────────────
  const [
    summaryBullets,
    lifeBullets,
    patternBullets,
    soWhatBullets,
  ] = await Promise.all([
    extractBullets(data.summary, "Extract 4 key insights that describe who this person is at their core.", 4),
    extractBullets(data.lifeHistoryPattern, "Extract 4 recurring themes or patterns from this person's life history.", 4),
    extractBullets(
      [data.summary, data.lifeHistoryPattern, data.viaSection, data.personalitySection].join("\n\n"),
      "Extract 4 insights that emerge ONLY when you look across ALL instruments together — patterns that no single instrument reveals alone.",
      4
    ),
    extractBullets(data.careerDirections, "Extract 4 concrete career direction insights or role suggestions for this person.", 4),
  ]);

  // ── SLIDE 1: Title ─────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    // Full navy background
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    // Gold left accent stripe
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });
    // Cream right panel
    slide.addShape("rect", { x: W * 0.62, y: 0, w: W * 0.38, h: H, fill: { color: CREAM }, line: { color: CREAM } });

    addLogo(slide);

    slide.addText("LIFEWORK", {
      x: 0.55, y: 1.6, w: 6, h: 0.4,
      fontSize: 10, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 4,
    });
    slide.addText("Coaching Session", {
      x: 0.55, y: 2.1, w: 7.5, h: 1.0,
      fontSize: 44, color: WHITE, bold: true, fontFace: "Georgia",
    });
    slide.addText(name, {
      x: 0.55, y: 3.2, w: 7, h: 0.6,
      fontSize: 22, color: GOLD, fontFace: "Georgia", italic: true,
    });
    slide.addShape("rect", { x: 0.55, y: 3.9, w: 2.0, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
    slide.addText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), {
      x: 0.55, y: 4.05, w: 6, h: 0.35,
      fontSize: 11, color: MUTED, fontFace: "Calibri",
    });

    // Right panel content
    slide.addText("Today's session", {
      x: W * 0.64, y: 1.5, w: W * 0.34, h: 0.35,
      fontSize: 9, color: NAVY, bold: true, fontFace: "Calibri", charSpacing: 1.5,
    });
    const agenda = [
      "Who you are",
      "Life history pattern",
      "Character strengths (VIA)",
      "Personality profile (OCEAN)",
      "Behavioural style",
      "The pattern across all instruments",
      "So what? — your next steps",
    ];
    agenda.forEach((item, i) => {
      slide.addText(`${i + 1}.  ${item}`, {
        x: W * 0.64, y: 1.95 + i * 0.52, w: W * 0.33, h: 0.45,
        fontSize: 10.5, color: LIGHT_NAVY, fontFace: "Calibri",
      });
    });
  }

  // ── SLIDE 2: Who You Are ───────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 1");
    addHeading(slide, "Who You Are");
    addAccentBar(slide);

    addBullets(slide, summaryBullets, 0.55, 1.45, W - 1.1, 4.5, 15);
    addFooter(slide, name, 2, TOTAL);
  }

  // ── SLIDE 3: Life History ──────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 2");
    addHeading(slide, "Life History — The Pattern");
    addAccentBar(slide);

    addBullets(slide, lifeBullets, 0.55, 1.45, W - 1.1, 4.5, 15);
    addFooter(slide, name, 3, TOTAL);
  }

  // ── SLIDE 4: Character Strengths (VIA) ────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 3");
    addHeading(slide, "Character Strengths");
    addAccentBar(slide);

    const top5 = (data.viaRanked ?? []).slice(0, 5);
    const maxScore = Math.max(...top5.map((s) => s.score), 1);

    top5.forEach((strength, i) => {
      const y = 1.5 + i * 1.0;
      const barW = ((strength.score / maxScore) * (W - 3.2));

      // Rank circle
      slide.addShape("ellipse", { x: 0.55, y: y + 0.05, w: 0.45, h: 0.45, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText(String(i + 1), {
        x: 0.55, y: y + 0.05, w: 0.45, h: 0.45,
        fontSize: 12, color: NAVY, bold: true, fontFace: "Calibri", align: "center", valign: "middle",
      });

      // Strength name
      slide.addText(strength.name, {
        x: 1.15, y, w: 4.5, h: 0.35,
        fontSize: 13, color: WHITE, bold: true, fontFace: "Calibri",
      });

      // Score bar background
      slide.addShape("rect", { x: 1.15, y: y + 0.38, w: W - 3.2, h: 0.22, fill: { color: LIGHT_NAVY }, line: { color: LIGHT_NAVY } });
      // Score bar fill
      if (barW > 0) {
        slide.addShape("rect", { x: 1.15, y: y + 0.38, w: barW, h: 0.22, fill: { color: GOLD }, line: { color: GOLD } });
      }
      // Score label
      slide.addText(String(strength.score), {
        x: W - 1.8, y: y + 0.35, w: 0.6, h: 0.28,
        fontSize: 10, color: MUTED, fontFace: "Calibri", align: "right",
      });
    });

    addFooter(slide, name, 4, TOTAL);
  }

  // ── SLIDE 5: Personality Profile (OCEAN) ──────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 4");
    addHeading(slide, "Personality Profile");
    addAccentBar(slide);

    const domains = ["O", "C", "E", "A", "N"];
    const scores = data.domainScores ?? {};
    const BAR_MAX_W = W - 5.5;

    domains.forEach((key, i) => {
      const score = scores[key] ?? 50;
      const y = 1.5 + i * 0.95;
      const barW = (score / 100) * BAR_MAX_W;
      const label = OCEAN_LABELS[key] ?? key;

      // Domain label
      slide.addText(label, {
        x: 0.55, y, w: 2.8, h: 0.35,
        fontSize: 12, color: WHITE, fontFace: "Calibri", bold: true,
      });

      // Bar background
      slide.addShape("rect", { x: 3.5, y: y + 0.05, w: BAR_MAX_W, h: 0.28, fill: { color: LIGHT_NAVY }, line: { color: LIGHT_NAVY } });
      // Bar fill
      if (barW > 0) {
        const barColour = score >= 60 ? GOLD : score <= 40 ? "4a6fa5" : "6b8cba";
        slide.addShape("rect", { x: 3.5, y: y + 0.05, w: barW, h: 0.28, fill: { color: barColour }, line: { color: barColour } });
      }
      // Score
      slide.addText(`${Math.round(score)}`, {
        x: 3.5 + BAR_MAX_W + 0.1, y, w: 0.6, h: 0.35,
        fontSize: 11, color: MUTED, fontFace: "Calibri",
      });

      // Low / High labels
      slide.addText("Low", { x: 3.5, y: y + 0.35, w: 0.8, h: 0.2, fontSize: 7, color: MUTED, fontFace: "Calibri" });
      slide.addText("High", { x: 3.5 + BAR_MAX_W - 0.6, y: y + 0.35, w: 0.7, h: 0.2, fontSize: 7, color: MUTED, fontFace: "Calibri", align: "right" });
    });

    addFooter(slide, name, 5, TOTAL);
  }

  // ── SLIDE 6: Behavioural Style (Colour Energies) ──────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 5");
    addHeading(slide, "Behavioural Style");
    addAccentBar(slide);

    // Primary colour energy — large
    const primaryHex = COLOUR_HEX[data.primaryColour] ?? GOLD;
    slide.addShape("rect", { x: 0.55, y: 1.5, w: 3.5, h: 2.2, fill: { color: primaryHex }, line: { color: primaryHex } });
    slide.addText("PRIMARY", {
      x: 0.55, y: 1.55, w: 3.5, h: 0.35,
      fontSize: 8, color: WHITE, bold: true, fontFace: "Calibri", align: "center", charSpacing: 2,
    });
    slide.addText(data.primaryColour || "—", {
      x: 0.55, y: 2.2, w: 3.5, h: 0.7,
      fontSize: 20, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle",
    });

    // Secondary colour energy
    const secondaryHex = COLOUR_HEX[data.secondaryColour] ?? LIGHT_NAVY;
    slide.addShape("rect", { x: 4.3, y: 1.5, w: 2.4, h: 2.2, fill: { color: secondaryHex }, line: { color: secondaryHex } });
    slide.addText("SECONDARY", {
      x: 4.3, y: 1.55, w: 2.4, h: 0.35,
      fontSize: 8, color: WHITE, bold: true, fontFace: "Calibri", align: "center", charSpacing: 2,
    });
    slide.addText(data.secondaryColour || "—", {
      x: 4.3, y: 2.2, w: 2.4, h: 0.7,
      fontSize: 16, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle",
    });

    // Jungian type
    slide.addText("JUNGIAN TYPE", {
      x: 7.2, y: 1.5, w: 5.5, h: 0.35,
      fontSize: 8, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 2,
    });
    slide.addText(data.jungianType || "—", {
      x: 7.2, y: 1.9, w: 5.5, h: 1.0,
      fontSize: 52, color: WHITE, bold: true, fontFace: "Georgia",
    });

    // Colour energy descriptions
    const descriptions: Record<string, string> = {
      "Cool Blue":        "Analytical · precise · cautious · questioning",
      "Fiery Red":        "Decisive · competitive · demanding · strong-willed",
      "Sunshine Yellow":  "Sociable · dynamic · expressive · enthusiastic",
      "Earth Green":      "Caring · patient · sharing · relaxed",
    };
    [data.primaryColour, data.secondaryColour].forEach((colour, i) => {
      if (!colour) return;
      slide.addText(descriptions[colour] ?? "", {
        x: 0.55 + (i === 0 ? 0 : 3.75), y: 3.85, w: i === 0 ? 3.5 : 2.4, h: 0.4,
        fontSize: 9, color: WHITE, fontFace: "Calibri", align: "center", italic: true,
      });
    });

    addFooter(slide, name, 6, TOTAL);
  }

  // ── SLIDE 7: The Pattern (cross-instrument synthesis) ─────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Synthesis");
    addHeading(slide, "The Pattern");
    addAccentBar(slide);

    slide.addText("What emerges when all the instruments are read together", {
      x: 0.55, y: 1.32, w: W - 1.1, h: 0.3,
      fontSize: 10, color: MUTED, fontFace: "Calibri", italic: true,
    });

    addBullets(slide, patternBullets, 0.55, 1.7, W - 1.1, 4.2, 15);
    addFooter(slide, name, 7, TOTAL);
  }

  // ── SLIDE 8: So What? ──────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    // Cream background for contrast
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: CREAM }, line: { color: CREAM } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });
    // Navy top band
    slide.addShape("rect", { x: 0, y: 0, w: W, h: 1.4, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Application");
    addHeading(slide, "So What?");

    slide.addText("Career directions — what this means for you", {
      x: 0.55, y: 1.5, w: W - 1.1, h: 0.3,
      fontSize: 10, color: NAVY, fontFace: "Calibri", italic: true,
    });

    // Bullets on cream background in navy text
    const items = soWhatBullets.map((b) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: NAVY, fontSize: 14, fontFace: "Calibri", paraSpaceAfter: 8 },
    }));
    slide.addText(items, { x: 0.55, y: 1.9, w: W - 1.1, h: 4.2, valign: "top" });

    // "Your question" prompt box at bottom
    slide.addShape("rect", { x: 0.55, y: H - 1.2, w: W - 1.1, h: 0.65, fill: { color: NAVY }, line: { color: GOLD, pt: 1 } });
    slide.addText("Your question for today:", {
      x: 0.75, y: H - 1.15, w: 3.5, h: 0.55,
      fontSize: 9, color: GOLD, bold: true, fontFace: "Calibri", valign: "middle",
    });

    addFooter(slide, name, 8, TOTAL);
  }

  // ── Write to buffer ────────────────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer;
  return buffer;
}

// ─── tRPC procedure wrapper ───────────────────────────────────────────────────
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";

const counselorProcedure = protectedProcedure.use(({ ctx, next }: { ctx: any; next: any }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});
import { getAnalysisReport } from "../db.js";


export const coachingSlidesRouter = router({
  generate: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report || !report.wowReportJson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No WOW report found for this client. Generate the WOW Report first.",
        });
      }

      let sections: SlideSections;
      try {
        sections = JSON.parse(report.wowReportJson) as SlideSections;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stored report sections are corrupted." });
      }

      const pptxBuffer = await generateCoachingSlides(sections);
      const fileKey = `coaching-slides/client-${input.clientId}-${Date.now()}.pptx`;
      const { url } = await storagePut(
        fileKey,
        pptxBuffer,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      return { url };
    }),
});
