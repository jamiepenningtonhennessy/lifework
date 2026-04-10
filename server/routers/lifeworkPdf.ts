import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "../fonts");

// ─── Brand colours (RGB) ─────────────────────────────────────────────────────
const NAVY = "#0F1F35";
const GOLD = "#C9973A";
const CREAM = "#F5EFE4";
const WHITE = "#FFFFFF";
const NAVY_MID = "#162840";
const BODY_GREY = "#4A5568";
const LIGHT_GREY = "#8A9BB0";

function hex(h: string): [number, number, number] {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return [r, g, b];
}

// ─── Page dimensions (A4) ────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Fonts ───────────────────────────────────────────────────────────────────
const PLAYFAIR = path.join(FONTS_DIR, "PlayfairDisplay-Regular.ttf");
const LATO = path.join(FONTS_DIR, "Lato-Regular.ttf");
const LATO_BOLD = path.join(FONTS_DIR, "Lato-Bold.ttf");
const LATO_ITALIC = path.join(FONTS_DIR, "Lato-Italic.ttf");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function drawNavyRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fill(hex(NAVY));
}

function drawGoldRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fill(hex(GOLD));
}

function goldRule(doc: PDFKit.PDFDocument, x: number, y: number, w = 40) {
  doc.rect(x, y, w, 1.5).fill(hex(GOLD));
}

function eyebrow(doc: PDFKit.PDFDocument, text: string, x: number, y: number, light = false) {
  goldRule(doc, x, y + 5, 28);
  doc
    .font(LATO_BOLD)
    .fontSize(7)
    .fillColor(hex(GOLD))
    .text(text.toUpperCase(), x + 34, y, { characterSpacing: 1.8 });
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function generateLifeworkPdf(recipientName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title: "What Lifework Reveals",
      Author: "Pennington Hennessy",
      Subject: "Career Analysis Programme Overview",
    },
  });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  doc.on("error", reject);
  doc.on("end", () => resolve(Buffer.concat(chunks)));

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════════════════════════
  drawNavyRect(doc, 0, 0, PAGE_W, PAGE_H);

  // Gold top bar
  drawGoldRect(doc, 0, 0, PAGE_W, 4);

  // Gold vertical accent line (right side)
  doc.rect(PAGE_W - 1.5, 0, 1.5, PAGE_H).fill(hex(GOLD));

  // Subtle diagonal texture — gold lines
  doc.save();
  doc.opacity(0.04);
  for (let i = -PAGE_H; i < PAGE_W + PAGE_H; i += 60) {
    doc.moveTo(i, 0).lineTo(i + PAGE_H, PAGE_H).stroke(hex(GOLD));
  }
  doc.restore();

  // PH logo text (since we can't embed the SVG logo easily)
  doc
    .font(LATO_BOLD)
    .fontSize(9)
    .fillColor(hex(WHITE))
    .text("PENNINGTON HENNESSY", MARGIN, 36, { characterSpacing: 2.5 });
  doc
    .font(LATO)
    .fontSize(7)
    .fillColor(hex(GOLD))
    .text("Career Analysis & Professional Development", MARGIN, 52, { characterSpacing: 0.8 });

  // Main headline
  doc
    .font(PLAYFAIR)
    .fontSize(42)
    .fillColor(hex(WHITE))
    .text("What", MARGIN, 180)
    .text("Lifework", MARGIN, 230)
    .fillColor(hex(GOLD))
    .text("Reveals.", MARGIN, 280);

  // Subheadline
  doc
    .font(LATO)
    .fontSize(13)
    .fillColor([255, 255, 255, 0.75] as any)
    .fillColor(hex(WHITE))
    .opacity(0.7)
    .text(
      "A structured career analysis programme for professionals\nwho want more than a new job — they want the right one.",
      MARGIN,
      350,
      { width: CONTENT_W * 0.7, lineGap: 5 }
    )
    .opacity(1);

  // Gold rule before recipient line
  goldRule(doc, MARGIN, 440, 50);

  // Recipient
  doc
    .font(LATO)
    .fontSize(9)
    .fillColor(hex(GOLD))
    .text("PREPARED FOR", MARGIN, 455, { characterSpacing: 1.5 });
  doc
    .font(PLAYFAIR)
    .fontSize(18)
    .fillColor(hex(WHITE))
    .text(recipientName || "You", MARGIN, 472);

  // Bottom stats bar
  const statsY = PAGE_H - 110;
  doc.rect(MARGIN, statsY, CONTENT_W, 0.5).fill([...hex(GOLD), 0.3] as any);
  doc.rect(MARGIN, statsY, CONTENT_W, 0.5).fill(hex(GOLD)).opacity(0.25).opacity(1);

  const stats = [
    { n: "965", label: "Individual Analyses" },
    { n: "30+", label: "Years of Practice" },
    { n: "3", label: "Validated Instruments" },
  ];
  const statW = CONTENT_W / 3;
  stats.forEach((s, i) => {
    const sx = MARGIN + i * statW + statW / 2 - 20;
    doc
      .font(PLAYFAIR)
      .fontSize(26)
      .fillColor(hex(GOLD))
      .text(s.n, sx, statsY + 18, { width: 60, align: "center" });
    doc
      .font(LATO)
      .fontSize(7)
      .fillColor(hex(WHITE))
      .opacity(0.5)
      .text(s.label.toUpperCase(), sx - 10, statsY + 52, { width: 80, align: "center", characterSpacing: 0.8 })
      .opacity(1);
  });

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 2 — THE PROBLEM & THE GUIDE
  // ══════════════════════════════════════════════════════════════════════
  doc.addPage({ size: "A4", margin: 0 });

  // Cream background
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(hex(CREAM));

  // Navy header strip
  drawNavyRect(doc, 0, 0, PAGE_W, 140);
  drawGoldRect(doc, 0, 0, PAGE_W, 3);

  eyebrow(doc, "The problem", MARGIN, 28, true);
  doc
    .font(PLAYFAIR)
    .fontSize(26)
    .fillColor(hex(WHITE))
    .text("Most career advice tells you what to do.", MARGIN, 50, { width: CONTENT_W })
    .fillColor(hex(GOLD))
    .text("It never asks who you are.", MARGIN, 88, { width: CONTENT_W });

  // Body copy
  let y = 168;

  doc
    .font(LATO)
    .fontSize(10.5)
    .fillColor(hex(BODY_GREY))
    .text(
      "Conventional career guidance starts in the wrong place. It looks at the market, at your CV, at what is hiring. It treats you as a set of transferable skills to be repositioned. It does not ask the more important question: what kind of work would genuinely suit this particular person?",
      MARGIN,
      y,
      { width: CONTENT_W, lineGap: 4 }
    );

  y += 80;

  doc.text(
    "The result is a career that looks fine from the outside but feels like wearing someone else's suit. You are competent. You are probably respected. But you are not quite you.",
    MARGIN,
    y,
    { width: CONTENT_W, lineGap: 4 }
  );

  y += 60;

  // Gold rule
  goldRule(doc, MARGIN, y, 40);
  y += 18;

  // Pull quote
  doc
    .font(LATO_ITALIC)
    .fontSize(12)
    .fillColor(hex(NAVY))
    .text(
      '"You should not have to spend thirty years in work that does not fit. Your career should be built on who you actually are."',
      MARGIN,
      y,
      { width: CONTENT_W * 0.8, lineGap: 5 }
    );

  y += 65;

  // Guide section — navy card
  drawNavyRect(doc, MARGIN, y, CONTENT_W, 155);
  doc.rect(MARGIN, y, 3, 155).fill(hex(GOLD));

  eyebrow(doc, "Thirty years. 965 clients.", MARGIN + 18, y + 16, true);

  doc
    .font(PLAYFAIR)
    .fontSize(16)
    .fillColor(hex(WHITE))
    .text("We have heard this many times before.", MARGIN + 18, y + 36, { width: CONTENT_W - 36 });

  doc
    .font(LATO)
    .fontSize(9.5)
    .fillColor(hex(WHITE))
    .opacity(0.65)
    .text(
      "The Lifework programme was developed by Jamie Pennington of Pennington Hennessy, drawing on the Haldane Dependable Strengths methodology — one of the most dependable frameworks in career analysis. Over three decades and nearly a thousand individual analyses, one finding has remained consistent: when people do work that aligns with their genuine strengths and motivations, they do not just perform better. They feel like themselves.",
      MARGIN + 18,
      y + 62,
      { width: CONTENT_W - 36, lineGap: 3 }
    )
    .opacity(1);

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 3 — THE THREE INSTRUMENTS
  // ══════════════════════════════════════════════════════════════════════
  doc.addPage({ size: "A4", margin: 0 });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(hex(WHITE));
  drawNavyRect(doc, 0, 0, PAGE_W, 90);
  drawGoldRect(doc, 0, 0, PAGE_W, 3);

  eyebrow(doc, "What the analysis covers", MARGIN, 22, true);
  doc
    .font(PLAYFAIR)
    .fontSize(24)
    .fillColor(hex(WHITE))
    .text("Three instruments. One clear picture.", MARGIN, 44, { width: CONTENT_W });

  const instruments = [
    {
      number: "01",
      title: "Life History Interview",
      subtitle: "Your story, your pattern",
      body: "You complete a structured interview covering your life decade by decade, identifying the achievements that gave you genuine satisfaction — not the ones that looked good on paper, but the ones that felt right. This is the foundation of everything that follows.\n\nThe life history reveals recurring themes — the kinds of problems you are drawn to, the environments in which you thrive, the roles you naturally gravitate towards. These patterns are consistent across a lifetime. They do not change with the job market.",
    },
    {
      number: "02",
      title: "VIA Character Strengths",
      subtitle: "What you are built for",
      body: "The VIA Survey is one of the most widely validated positive psychology instruments in the world. It identifies your top character strengths from a taxonomy of 24 — qualities like curiosity, leadership, fairness, and creativity — and ranks them in order of how naturally and energetically you deploy them.\n\nIn the Lifework analysis, VIA results are cross-referenced with the life history to identify which strengths show up consistently across different contexts. These are your dependable strengths — the ones that will serve you in any role.",
    },
    {
      number: "03",
      title: "OCEAN Personality Profile",
      subtitle: "How you engage with the world",
      body: "The OCEAN (Big Five) model is the gold standard of personality research. It measures five dimensions — Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism — each of which has direct implications for career fit.\n\nA high Openness score, for example, predicts a need for intellectual variety and creative challenge. High Conscientiousness predicts a preference for structured, goal-oriented work. Understanding your OCEAN profile helps identify not just what you can do, but what kind of environment you need to do it well.",
    },
  ];

  let instrY = 108;
  instruments.forEach((inst, i) => {
    const cardH = 175;
    const isEven = i % 2 === 0;

    // Card background
    doc.rect(MARGIN, instrY, CONTENT_W, cardH).fill(isEven ? hex(CREAM) : hex(WHITE));
    doc.rect(MARGIN, instrY, 3, cardH).fill(hex(GOLD));

    // Number
    doc
      .font(PLAYFAIR)
      .fontSize(32)
      .fillColor(hex(GOLD))
      .opacity(0.25)
      .text(inst.number, MARGIN + 12, instrY + 10)
      .opacity(1);

    // Title
    doc
      .font(PLAYFAIR)
      .fontSize(14)
      .fillColor(hex(NAVY))
      .text(inst.title, MARGIN + 52, instrY + 14, { width: CONTENT_W - 64 });

    // Subtitle
    doc
      .font(LATO_ITALIC)
      .fontSize(9)
      .fillColor(hex(GOLD))
      .text(inst.subtitle, MARGIN + 52, instrY + 34, { characterSpacing: 0.3 });

    // Body
    doc
      .font(LATO)
      .fontSize(9)
      .fillColor(hex(BODY_GREY))
      .text(inst.body, MARGIN + 52, instrY + 52, { width: CONTENT_W - 64, lineGap: 2.5 });

    instrY += cardH + 8;
  });

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 4 — WHAT YOU RECEIVE + TESTIMONIALS + CTA
  // ══════════════════════════════════════════════════════════════════════
  doc.addPage({ size: "A4", margin: 0 });
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(hex(CREAM));
  drawNavyRect(doc, 0, 0, PAGE_W, 90);
  drawGoldRect(doc, 0, 0, PAGE_W, 3);

  eyebrow(doc, "What you receive", MARGIN, 22, true);
  doc
    .font(PLAYFAIR)
    .fontSize(24)
    .fillColor(hex(WHITE))
    .text("Not surprise. Recognition.", MARGIN, 44, { width: CONTENT_W });

  let p4y = 108;

  doc
    .font(LATO)
    .fontSize(10.5)
    .fillColor(hex(BODY_GREY))
    .text(
      "Clients who complete the Lifework programme describe a consistent experience: the analysis names things they already half-knew but had never been able to articulate. It gives them a language for their strengths that is specific enough to be useful — in interviews, in conversations with partners and managers, in their own thinking about what comes next.",
      MARGIN,
      p4y,
      { width: CONTENT_W, lineGap: 4 }
    );

  p4y += 72;

  // Outcomes list
  const outcomes = [
    "A clear, written report of your distinctive strengths and motivations — specific to you, not generic.",
    "An understanding of the environments and conditions in which you do your best work.",
    "A specific, evidence-based answer to the question you came with — whether that is which roles to pursue, which environments to avoid, or what a fulfilling second act might look like.",
    "The confidence to pursue work that is genuinely yours — and the language to explain why it fits.",
  ];

  outcomes.forEach((outcome) => {
    // Gold bullet dot
    doc.circle(MARGIN + 5, p4y + 5, 3).fill(hex(GOLD));
    doc
      .font(LATO)
      .fontSize(10)
      .fillColor(hex(NAVY))
      .text(outcome, MARGIN + 18, p4y, { width: CONTENT_W - 18, lineGap: 3 });
    p4y += 40;
  });

  p4y += 10;
  goldRule(doc, MARGIN, p4y, CONTENT_W);
  p4y += 18;

  // Testimonials
  eyebrow(doc, "What clients say", MARGIN, p4y);
  p4y += 22;

  const testimonials = [
    {
      quote:
        "I had been a partner for eight years and had never once stopped to ask whether the work actually suited me. The Lifework analysis gave me language for things I had felt but never been able to name. It changed the conversation I had with myself — and with the firm.",
      name: "Senior Partner, Magic Circle Firm",
    },
    {
      quote:
        "I came in thinking I needed a new job. I left understanding that what I actually needed was a different kind of role — one that used the strengths I had been quietly suppressing for fifteen years. The report was the most useful document I have ever been given about myself.",
      name: "General Counsel, FTSE 250 Company",
    },
  ];

  testimonials.forEach((t, i) => {
    const tCardH = 95;
    drawNavyRect(doc, MARGIN, p4y, CONTENT_W, tCardH);
    doc.rect(MARGIN, p4y, 3, tCardH).fill(hex(GOLD));

    // Opening quote mark
    doc
      .font(PLAYFAIR)
      .fontSize(36)
      .fillColor(hex(GOLD))
      .opacity(0.3)
      .text("\u201C", MARGIN + 10, p4y + 4)
      .opacity(1);

    doc
      .font(LATO_ITALIC)
      .fontSize(9)
      .fillColor(hex(WHITE))
      .opacity(0.82)
      .text(t.quote, MARGIN + 18, p4y + 14, { width: CONTENT_W - 28, lineGap: 2.5 })
      .opacity(1);

    doc
      .font(LATO_BOLD)
      .fontSize(7.5)
      .fillColor(hex(GOLD))
      .text(`— ${t.name}`, MARGIN + 18, p4y + tCardH - 18, { characterSpacing: 0.3 });

    p4y += tCardH + 8;
  });

  p4y += 8;

  // CTA box
  const ctaH = 110;
  drawGoldRect(doc, MARGIN, p4y, CONTENT_W, ctaH);

  doc
    .font(PLAYFAIR)
    .fontSize(18)
    .fillColor(hex(NAVY))
    .text("Ready to find out what you were built to do?", MARGIN + 20, p4y + 16, {
      width: CONTENT_W - 40,
    });

  doc
    .font(LATO)
    .fontSize(10)
    .fillColor(hex(NAVY))
    .opacity(0.75)
    .text(
      "Book a 30-minute discovery call with Jamie Pennington. No obligation. No jargon. A conversation that might change the next thirty years.",
      MARGIN + 20,
      p4y + 46,
      { width: CONTENT_W - 40, lineGap: 3 }
    )
    .opacity(1);

  doc
    .font(LATO_BOLD)
    .fontSize(9)
    .fillColor(hex(NAVY))
    .text("penningtonhennessy.com/coaching", MARGIN + 20, p4y + 88, { characterSpacing: 0.5 });

  // Footer
  doc
    .font(LATO)
    .fontSize(7.5)
    .fillColor(hex(LIGHT_GREY))
    .text(
      "© Pennington Hennessy. All rights reserved. This document is for personal use only.",
      MARGIN,
      PAGE_H - 30,
      { width: CONTENT_W, align: "center" }
    );

  doc.end();
  });
}

