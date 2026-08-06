import { Router, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getClientProfileByUserId,
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getEducationHistory,
  getCareerHistory,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
  getCoachingAnnex,
} from "./db";
import { getUserByOpenId, getDb } from "./db";
import { clientTargetSpec, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { VIA_STRENGTHS } from "../shared/via-data";
import { IPIP_DOMAINS, IPIP_FACETS } from "../shared/ipip-data";

const strengthsMap = new Map(VIA_STRENGTHS.map((s) => [s.id, s])); // v2 — uses wowReportJson sections

export const pdfRouter = Router();

pdfRouter.get("/api/export/report/:clientId?", async (req: Request, res: Response) => {
  try {
    // Verify session
    let user;
    try { user = await sdk.authenticateRequest(req); } catch { user = null; }
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let clientId: number;
    if (req.params.clientId && user.role === "admin") {
      clientId = parseInt(req.params.clientId);
    } else {
      const profile = await getClientProfileByUserId(user.id);
      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }
      clientId = profile.id;
    }

    const [profile, achievements, family, career, via, ipip, report, coachingAnnex] = await Promise.all([
      getClientProfileById(clientId),
      getAchievements(clientId),
      getFamilyBackground(clientId),
      getCareerHistory(clientId),
      getViaResults(clientId),
      getIpipResults(clientId),
      getAnalysisReport(clientId),
      getCoachingAnnex(clientId),
    ]);

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const ranked = (via?.rankedStrengths as any[]) ?? [];
    const top5 = ranked.slice(0, 5).map((s: any) => {
      const strength = strengthsMap.get(s.strengthId);
      return { name: strength?.name ?? s.strengthId, score: s.score, description: strength?.description ?? "", virtue: strength?.virtue ?? "", atWork: strength?.atWork ?? "" };
    });

    // Build markdown content for PDF
    // When admin exports a client's report, look up the CLIENT's user record for their name
    // (never fall back to the logged-in admin's name)
    let clientName: string;
    if (profile.firstName && profile.lastName) {
      clientName = `${profile.firstName} ${profile.lastName}`;
    } else if (profile.firstName) {
      clientName = profile.firstName;
    } else {
      // Look up the client's own user record
      const db = await getDb();
      const clientUserRows = db
        ? await db.select().from(users).where(eq(users.id, profile.userId)).limit(1)
        : [];
      const clientUser = clientUserRows[0] ?? null;
      clientName = clientUser?.name ?? "Client";
    }

    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // We'll generate an HTML string and return it as a downloadable HTML file
    // that the browser can print to PDF
    const html = buildReportHTML({
      clientName,
      date: now,
      profile,
      achievements,
      family,
      career,
      top5,
      ranked,
      ipip: ipip ?? null,
      report,
      approvedAnnex: coachingAnnex?.status === "approved" ? (coachingAnnex.approvedAnnex ?? null) : null,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="plum-trees-report-${clientName.replace(/\s+/g, "-").toLowerCase()}.html"`
    );
    res.send(html);
  } catch (err) {
    console.error("[PDF Export] Error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ─── ESF Life History Print Report ────────────────────────────────────────
pdfRouter.get("/api/export/esf-report/:clientId", async (req: Request, res: Response) => {
  try {
    let user;
    try { user = await sdk.authenticateRequest(req); } catch { user = null; }
    if (!user) { res.status(401).json({ error: "Unauthorised" }); return; }
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) { res.status(400).json({ error: "Invalid clientId" }); return; }

    const [profile, achievements] = await Promise.all([
      getClientProfileById(clientId),
      getAchievements(clientId),
    ]);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const db = await getDb();
    const clientUserRows = profile.userId && db
      ? await db.select().from(users).where(eq(users.id, profile.userId)).limit(1)
      : [];
    const clientUser = clientUserRows[0] ?? null;
    const clientName =
      profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.lastName || clientUser?.name || "Client";

    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // Group by ESF, sort chronologically within each group
    // DB stores lowercase full words: "enjoyable", "satisfying", "fulfilling"
    const groups: Record<string, any[]> = { enjoyable: [], satisfying: [], fulfilling: [], untagged: [] };
    for (const a of (achievements ?? [])) {
      const key = (a.esf ?? "").toLowerCase().trim();
      if (key === "enjoyable" || key === "satisfying" || key === "fulfilling") groups[key].push(a);
      else groups["untagged"].push(a);
    }
    const sortByAge = (arr: any[]) => arr.sort((a, b) => (parseInt(a.age ?? "0") || 0) - (parseInt(b.age ?? "0") || 0));
    for (const k of ["enjoyable", "satisfying", "fulfilling", "untagged"]) sortByAge(groups[k]);

    const esfMeta: Record<string, { label: string; subtitle: string; color: string; bg: string }> = {
      enjoyable: { label: "Enjoyable", subtitle: "\"in the moment\" — absorbed and engaged while doing it", color: "#1d6b3a", bg: "#edf7f1" },
      satisfying: { label: "Satisfying", subtitle: "\"rewarding\" — a sense of accomplishment", color: "#1a4a8a", bg: "#edf2fb" },
      fulfilling: { label: "Fulfilling", subtitle: "\"longer-term satisfying\" — deeply meaningful", color: "#7a3a00", bg: "#fdf3e8" },
      untagged: { label: "Untagged", subtitle: "not yet categorised", color: "#6b5c4a", bg: "#f5f0ea" },
    };

    const renderGroup = (key: string) => {
      const items = groups[key];
      if (!items.length) return "";
      const m = esfMeta[key];
      return `<div style="margin-bottom:32px;">
        <div style="background:${m.bg};border-left:4px solid ${m.color};padding:10px 16px;border-radius:4px;margin-bottom:14px;">
          <span style="font-size:17px;font-weight:700;color:${m.color};">${m.label}</span>
          <span style="font-size:12px;color:#6b5c4a;margin-left:10px;">${m.subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #e8e0d0;">
            <th style="text-align:left;padding:5px 8px;color:#9a8a78;font-size:10px;text-transform:uppercase;letter-spacing:.05em;width:50px;">Age</th>
            <th style="text-align:left;padding:5px 8px;color:#9a8a78;font-size:10px;text-transform:uppercase;letter-spacing:.05em;width:180px;">Action / Title</th>
            <th style="text-align:left;padding:5px 8px;color:#9a8a78;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Description</th>
            <th style="text-align:left;padding:5px 8px;color:#9a8a78;font-size:10px;text-transform:uppercase;letter-spacing:.05em;width:200px;">Others said</th>
          </tr></thead>
          <tbody>${items.map((a: any, i: number) => `
            <tr style="border-bottom:1px solid #f0e8d8;background:${i % 2 === 0 ? "#fff" : "#faf7f2"};">
              <td style="padding:7px 8px;color:#6b5c4a;vertical-align:top;">${a.age ?? ""}</td>
              <td style="padding:7px 8px;font-weight:600;color:#0f1f35;vertical-align:top;">${a.title ?? ""}</td>
              <td style="padding:7px 8px;color:#1a1008;vertical-align:top;line-height:1.5;">${a.description ?? ""}</td>
              <td style="padding:7px 8px;color:#6b5c4a;vertical-align:top;font-style:italic;line-height:1.5;">${a.othersObservations ?? ""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ESF Life History — ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
  @page { size: A4 landscape; margin: 12mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #1a1008; background: #fff; }
  .print-bar { background: #0f1f35; color: #fff; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; }
  .print-bar button { background: #c9973a; color: #fff; border: none; padding: 7px 18px; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: inherit; }
  .print-bar p { font-size: 11px; color: #c9d4e0; margin-top: 2px; }
  @media print { .print-bar { display: none; } }
</style>
</head>
<body>
<div class="print-bar">
  <div><strong style="font-size:14px;">ESF Life History — ${clientName}</strong>
  <p>⚠ In the print dialog: set Margins = None and uncheck Headers and footers</p></div>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
<div style="padding:16px 20px;">
  <div style="border-bottom:2px solid #c9973a;padding-bottom:14px;margin-bottom:24px;display:flex;align-items:flex-end;justify-content:space-between;">
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#0f1f35;">Life History — ESF Analysis</div>
      <div style="font-size:12px;color:#6b5c4a;margin-top:3px;">Achievements grouped by Enjoyable · Satisfying · Fulfilling, in chronological order</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#9a8a78;">
      <strong style="color:#0f1f35;font-size:14px;display:block;">${clientName}</strong>${date}
    </div>
  </div>
  ${renderGroup("enjoyable")}${renderGroup("satisfying")}${renderGroup("fulfilling")}${renderGroup("untagged")}
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid rgba(201,151,58,0.4);text-align:center;font-size:11px;color:#9a8a78;">
    &copy; Pennington Hennessy ${new Date().getFullYear()} &mdash; Confidential
  </div>
</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="esf-life-history-${clientName.replace(/\s+/g, "-").toLowerCase()}.html"`);
    res.send(html);
  } catch (err) {
    console.error("[ESF Report] Error:", err);
    res.status(500).json({ error: "Failed to generate ESF report" });
  }
});

// ─── Role Specification PDF Export ──────────────────────────────────────────
pdfRouter.get("/api/export/role-spec", async (req: Request, res: Response) => {
  try {
    let user;
    try { user = await sdk.authenticateRequest(req); } catch { user = null; }
    if (!user) { res.status(401).json({ error: "Unauthorised" }); return; }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    // Resolve client profile for the logged-in user
    const profile = await getClientProfileByUserId(user.id);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const [specRow] = await db
      .select()
      .from(clientTargetSpec)
      .where(eq(clientTargetSpec.clientId, profile.id))
      .limit(1);

    if (!specRow) { res.status(404).json({ error: "No Role Specification found" }); return; }

    const spec: any = typeof specRow.spec === "string" ? JSON.parse(specRow.spec) : specRow.spec;

    // Resolve client name
    let clientName: string;
    if (profile.firstName && profile.lastName) {
      clientName = `${profile.firstName} ${profile.lastName}`;
    } else if (profile.firstName) {
      clientName = profile.firstName;
    } else {
      const clientUserRows = await db.select().from(users).where(eq(users.id, profile.userId)).limit(1);
      clientName = clientUserRows[0]?.name ?? "Client";
    }

    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const html = buildRoleSpecHTML({ clientName, date, spec });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="role-specification-${clientName.replace(/\s+/g, "-").toLowerCase()}.html"`);
    res.send(html);
  } catch (err) {
    console.error("[Role Spec Export] Error:", err);
    res.status(500).json({ error: "Failed to generate Role Specification" });
  }
});

function buildRoleSpecHTML({ clientName, date, spec }: { clientName: string; date: string; spec: any }): string {
  const navy = "#1A2744";
  const gold = "#C9973A";
  const cream = "#F5F0E8";
  const ink = "#0E1628";
  const inkMuted = "#5A6278";

  const badge = (text: string, variant: "primary" | "outline" = "primary") =>
    variant === "primary"
      ? `<span style="display:inline-block;background:${gold};color:#fff;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:3px;margin:2px 3px 2px 0;">${text}</span>`
      : `<span style="display:inline-block;border:1px solid ${gold};color:${navy};font-size:10.5px;font-weight:500;padding:2px 9px;border-radius:3px;margin:2px 3px 2px 0;">${text}</span>`;

  const section = (title: string, content: string) =>
    `<div style="margin-bottom:22px;">
      <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${inkMuted};margin:0 0 7px;">${title}</p>
      ${content}
    </div>`;

  const roleFamiliesHTML = spec.role_families?.length
    ? spec.role_families.map((r: any) =>
        `<div style="margin-bottom:10px;">
          <span style="font-size:13px;font-weight:600;color:${navy};">${r.title}</span>
          ${r.why ? `<p style="font-size:12px;color:${inkMuted};margin:3px 0 0;line-height:1.55;">${r.why}</p>` : ""}
        </div>`
      ).join("")
    : "<p style='font-size:12px;color:#999;'>Not specified</p>";

  const functionsHTML = spec.functions?.length
    ? spec.functions.map((f: string) => badge(f)).join("")
    : "";

  const sectorsHTML = spec.sectors?.length
    ? spec.sectors.map((s: any) =>
        badge(`${s.sector} · ${s.weight}`, s.weight === "high" ? "primary" : "outline")
      ).join("")
    : "";

  const differentiatorsList = spec.differentiators?.length
    ? `<ul style="margin:0;padding:0;list-style:none;">${spec.differentiators.map((d: string) =>
        `<li style="font-size:12px;color:${ink};line-height:1.6;padding:3px 0;display:flex;gap:8px;"><span style="color:${gold};flex-shrink:0;">—</span><span>${d}</span></li>`
      ).join("")}</ul>`
    : "";

  const archetypesHTML = spec.organisation_archetypes?.length
    ? spec.organisation_archetypes.map((a: string) => badge(a, "outline")).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Role Specification — ${clientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: ${ink}; background: ${cream}; }
  h1, h2, .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
  .print-bar { background: ${navy}; color: #fff; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; }
  .print-bar button { background: ${gold}; color: #fff; border: none; padding: 7px 18px; border-radius: 3px; font-size: 13px; cursor: pointer; font-family: inherit; }
  .print-bar p { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
  @media print { .print-bar { display: none; } body { background: #fff; } }
</style>
</head>
<body>
<div class="print-bar">
  <div><strong style="font-size:14px;">Role Specification — ${clientName}</strong>
  <p>In the print dialog: set Margins = None and uncheck Headers and footers</p></div>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
<div style="padding:20px 24px;">
  <!-- Header -->
  <div style="border-bottom:2px solid ${gold};padding-bottom:14px;margin-bottom:26px;display:flex;align-items:flex-end;justify-content:space-between;">
    <div>
      <h1 style="font-size:26px;font-weight:600;color:${navy};letter-spacing:-.01em;">Role Specification</h1>
      <p style="font-size:12px;color:${inkMuted};margin-top:4px;">A personalised profile of roles, sectors, and organisations that best match who you are</p>
    </div>
    <div style="text-align:right;font-size:12px;color:${inkMuted};">
      <strong style="color:${navy};font-size:14px;display:block;">${clientName}</strong>${date}
    </div>
  </div>

  <!-- Summary -->
  ${spec.summary ? section("Summary", `<p style="font-size:13px;line-height:1.7;color:${ink};">${spec.summary}</p>`) : ""}

  <!-- Role Families -->
  ${section("Role Families", roleFamiliesHTML)}

  <!-- Two-column: Functions + Sectors -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;">
    ${spec.functions?.length ? `<div>
      <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${inkMuted};margin:0 0 7px;">Functions</p>
      <div>${functionsHTML}</div>
    </div>` : ""}
    ${spec.sectors?.length ? `<div>
      <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${inkMuted};margin:0 0 7px;">Sectors</p>
      <div>${sectorsHTML}</div>
    </div>` : ""}
  </div>

  <!-- Seniority + Geography -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;">
    ${spec.seniority_band ? `<div>
      <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${inkMuted};margin:0 0 7px;">Seniority Band</p>
      ${badge(spec.seniority_band)}
    </div>` : ""}
    ${spec.geography?.base ? `<div>
      <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${inkMuted};margin:0 0 7px;">Geography</p>
      <p style="font-size:12px;color:${ink};">${spec.geography.base}</p>
    </div>` : ""}
  </div>

  <!-- Differentiators -->
  ${differentiatorsList ? section("Your Differentiators", differentiatorsList) : ""}

  <!-- Organisation Archetypes -->
  ${archetypesHTML ? section("Organisation Archetypes", `<div>${archetypesHTML}</div>`) : ""}

  <!-- Footer -->
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid rgba(201,151,58,0.4);text-align:center;font-size:11px;color:${inkMuted};">
    &copy; Pennington Hennessy ${new Date().getFullYear()} &mdash; Confidential
  </div>
</div>
</body>
</html>`;
}

// ─── Insights Discovery HTML for PDF ─────────────────────────────────────────
function buildInsightsDiscoveryHTML(domainScores: Record<string, number>): string {
  const E = domainScores['E'] ?? 50;
  const A = domainScores['A'] ?? 50;
  const O = domainScores['O'] ?? 50;
  const C = domainScores['C'] ?? 50;

  const isExtravert = E >= 50;
  const isFeeler = A >= 50;

  type ColourKey = 'blue' | 'red' | 'green' | 'yellow';
  function getColour(e: number, a: number): ColourKey {
    const ext = e >= 50; const feel = a >= 50;
    if (!ext && !feel) return 'blue';
    if (ext && !feel) return 'red';
    if (!ext && feel) return 'green';
    return 'yellow';
  }
  function getSecondary(e: number, a: number): ColourKey {
    const primary = getColour(e, a);
    const candidates: ColourKey[] = [getColour(e, a >= 50 ? 30 : 70), getColour(e >= 50 ? 30 : 70, a)];
    return candidates.find(c => c !== primary) ?? primary;
  }

  const ENERGIES: Record<ColourKey, { name: string; hex: string; textHex: string; jungian: string; description: string; strengths: string[]; challenges: string[]; careerFit: string }> = {
    blue: { name: 'Cool Blue', hex: '#2471A3', textHex: '#ffffff', jungian: 'Introverted Thinker (IT)', description: 'Analytical, cautious, and precise. Values accuracy, quality, and rigour. Prefers to work with data and evidence before reaching conclusions. Can appear detached or over-cautious.', strengths: ['Analytical', 'Precise', 'Systematic', 'Thorough', 'Objective'], challenges: ['Can be over-cautious', 'May over-analyse', 'Dislikes ambiguity'], careerFit: 'Roles requiring analysis, precision, and systematic thinking — finance, engineering, research, IT, quality assurance, law.' },
    red: { name: 'Fiery Red', hex: '#A93226', textHex: '#ffffff', jungian: 'Extraverted Thinker (ET)', description: 'Driven, purposeful, and results-oriented. Prefers to lead from the front, takes decisive action, and is comfortable with challenge and competition. Can be direct to the point of bluntness.', strengths: ['Decisive', 'Determined', 'Strong-willed', 'Purposeful', 'Results-focused'], challenges: ['May appear insensitive', 'Can be impatient', 'Dislikes indecision in others'], careerFit: 'Roles requiring leadership, accountability, and the ability to drive change — management, entrepreneurship, law, surgery, strategy.' },
    green: { name: 'Earth Green', hex: '#6E9B1E', textHex: '#ffffff', jungian: 'Introverted Feeler (IF)', description: 'Caring, patient, and values-driven. Builds deep, authentic relationships and creates harmony. Prefers consensus and dislikes conflict. Can struggle with assertiveness and change.', strengths: ['Caring', 'Patient', 'Supportive', 'Empathetic', 'Principled'], challenges: ['May avoid conflict', 'Can be indecisive', 'Dislikes rapid change'], careerFit: 'Roles requiring empathy, support, and relationship depth — counselling, social work, HR, teaching, nursing, community leadership.' },
    yellow: { name: 'Sunshine Yellow', hex: '#D4A017', textHex: '#ffffff', jungian: 'Extraverted Feeler (EF)', description: 'Enthusiastic, persuasive, and sociable. Energised by people and ideas, brings optimism and creativity to groups. Can lose focus on detail and follow-through.', strengths: ['Enthusiastic', 'Persuasive', 'Creative', 'Optimistic', 'Collaborative'], challenges: ['Can be disorganised', 'May over-promise', 'Dislikes routine and detail'], careerFit: 'Roles requiring communication, creativity, and relationship-building — sales, marketing, PR, teaching, facilitation, consulting.' },
  };

  const primaryKey = getColour(E, A);
  const secondaryKey = getSecondary(E, A);
  const primary = ENERGIES[primaryKey];
  const secondary = ENERGIES[secondaryKey];

  const E_or_I = isExtravert ? 'E' : 'I';
  const S_or_N = O >= 50 ? 'N' : 'S';
  const T_or_F = isFeeler ? 'F' : 'T';
  const J_or_P = C >= 50 ? 'J' : 'P';
  const jungian = `${E_or_I}${S_or_N}${T_or_F}${J_or_P}`;

  const eLabel = E >= 65 ? 'Strongly Extraverted' : E >= 50 ? 'Moderately Extraverted' : E >= 35 ? 'Moderately Introverted' : 'Strongly Introverted';
  const aLabel = A >= 65 ? 'Strongly Feeling' : A >= 50 ? 'Moderately Feeling' : A >= 35 ? 'Moderately Thinking' : 'Strongly Thinking';
  const oLabel = O >= 50 ? 'Intuiting (N)' : 'Sensing (S)';
  const cLabel = C >= 50 ? 'Judging (J)' : 'Perceiving (P)';

  return `
    <div style="background:#0f1f35;border:1px solid rgba(201,151,58,0.3);border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#c9973a;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Insights Discovery Mapping</p>
      <p style="color:rgba(255,255,255,0.75);font-size:12px;line-height:1.6;margin:0;">The following is an <em>approximation</em> derived by mapping your Big Five scores onto the Insights Discovery colour-energy framework, using the academic consensus correlations between OCEAN and the Jungian dimensions. It is a coaching tool, not a clinical assessment.</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:${primary.hex};padding:12px 16px;display:flex;align-items:center;gap:12px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${primary.textHex};font-weight:700;font-size:14px;">1</span></div>
          <div><p style="color:${primary.textHex};font-weight:700;font-size:14px;margin:0;">${primary.name}</p><p style="color:${primary.textHex};opacity:0.8;font-size:10px;margin:0;">Primary energy &middot; ${primary.jungian}</p></div>
        </div>
        <div style="padding:12px 16px;background:#fff;"><p style="font-size:12px;line-height:1.6;color:#333;margin:0;">${primary.description}</p></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:${secondary.hex};padding:12px 16px;display:flex;align-items:center;gap:12px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${secondary.textHex};font-weight:700;font-size:14px;">2</span></div>
          <div><p style="color:${secondary.textHex};font-weight:700;font-size:14px;margin:0;">${secondary.name}</p><p style="color:${secondary.textHex};opacity:0.8;font-size:10px;margin:0;">Secondary energy &middot; ${secondary.jungian}</p></div>
        </div>
        <div style="padding:12px 16px;background:#fff;"><p style="font-size:12px;line-height:1.6;color:#333;margin:0;">${secondary.description}</p></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
      ${[{label:'Jungian Type',value:jungian,sub:'Approx. MBTI equivalent'},{label:'E / I Axis',value:eLabel,sub:`Extraversion: ${E}`},{label:'T / F Axis',value:aLabel,sub:`Agreeableness: ${A}`},{label:'S/N + J/P',value:`${oLabel} &middot; ${cLabel}`,sub:'Openness &amp; Conscientiousness'}].map(item=>`
      <div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;background:#faf8f4;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9a8a78;margin:0 0 4px;">${item.label}</p>
        <p style="font-size:12px;font-weight:700;color:#0f1f35;margin:0 0 2px;">${item.value}</p>
        <p style="font-size:9px;color:#9a8a78;margin:0;">${item.sub}</p>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px 14px;background:#faf8f4;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c9973a;margin:0 0 8px;">Strengths</p>
        ${primary.strengths.map(s=>`<p style="font-size:11px;color:#333;margin:0 0 4px;">&#9658; ${s}</p>`).join('')}
      </div>
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px 14px;background:#faf8f4;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c9973a;margin:0 0 8px;">Watch-outs</p>
        ${primary.challenges.map(c=>`<p style="font-size:11px;color:#333;margin:0 0 4px;">&#9658; ${c}</p>`).join('')}
      </div>
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px 14px;background:#faf8f4;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c9973a;margin:0 0 8px;">Career Environment Fit</p>
        <p style="font-size:11px;color:#333;line-height:1.5;margin:0;">${primary.careerFit}</p>
      </div>
    </div>`;
}

function buildReportHTML(data: {
  clientName: string;
  date: string;
  profile: any;
  achievements: any[];
  family: any;
  career: any[];
  top5: any[];
  ranked: any[];
  ipip: any;
  report: any;
  approvedAnnex?: string | null;
}): string {
  const { clientName, date, achievements, family, career, top5, ranked, ipip, report, approvedAnnex } = data;

  const achievementsByDecade = achievements.reduce((acc: Record<string, any[]>, a) => {
    if (!acc[a.decade]) acc[a.decade] = [];
    acc[a.decade].push(a);
    return acc;
  }, {});

  const decadeLabels: Record<string, string> = {
    childhood: "Childhood",
    teens: "Teens",
    twenties: "20s",
    thirties: "30s",
    forties: "40s",
    fifties: "50s",
    sixties_plus: "60s+",
  };

  const esfColors: Record<string, string> = {
    enjoyable: "#3b82f6",
    satisfying: "#10b981",
    fulfilling: "#8b5cf6",
  };

  const virtueColors: Record<string, string> = {
    wisdom: "#3b82f6",
    courage: "#f97316",
    humanity: "#ec4899",
    justice: "#10b981",
    temperance: "#8b5cf6",
    transcendence: "#eab308",
  };

  const markdownToHTML = (md: string): string => {
    if (!md) return "";

    // --- 1. Extract and replace markdown tables before any other processing ---
    const tablePlaceholders: string[] = [];
    const withTablesReplaced = md.replace(
      /^(\|.+\|\s*\n)(\|[-:| ]+\|\s*\n)((?:\|.+\|\s*\n?)*)/gm,
      (match, headerRow, separatorRow, bodyRows) => {
        // Parse header cells
        const headers = headerRow
          .split("|")
          .slice(1, -1)
          .map((h: string) => h.trim());

        // Parse alignment from separator row
        const alignments = separatorRow
          .split("|")
          .slice(1, -1)
          .map((s: string) => {
            const t = s.trim();
            if (t.startsWith(":") && t.endsWith(":")) return "center";
            if (t.endsWith(":")) return "right";
            return "left";
          });

        // Parse body rows
        const rows = bodyRows
          .trim()
          .split("\n")
          .filter((r: string) => r.trim().length > 0)
          .map((r: string) =>
            r
              .split("|")
              .slice(1, -1)
              .map((c: string) => c.trim())
          );

        const headerHTML = headers
          .map(
            (h: string, i: number) =>
              `<th style="text-align:${alignments[i] ?? "left"};padding:7px 10px;background:#0f1f35;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;">${h}</th>`
          )
          .join("");

        const bodyHTML = rows
          .map(
            (cells: string[], ri: number) =>
              `<tr style="background:${ri % 2 === 0 ? "#fdf9f3" : "#f5ede0"};">${cells
                .map(
                  (c: string, i: number) =>
                    `<td style="text-align:${alignments[i] ?? "left"};padding:6px 10px;font-size:12px;color:#1a1008;border-bottom:1px solid #e8e0d8;">${c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</td>`
                )
                .join("")}</tr>`
          )
          .join("");

        const tableHTML = `<div style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid rgba(201,151,58,0.4);"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;

        const idx = tablePlaceholders.length;
        tablePlaceholders.push(tableHTML);
        return `%%TABLE_${idx}%%`;
      }
    );

    // --- 2. Apply standard markdown transformations ---
    let html = withTablesReplaced
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[h|u|l|p%])(.+)$/gm, "<p>$1</p>");

    // --- 3. Restore table placeholders ---
    tablePlaceholders.forEach((tableHTML, idx) => {
      html = html.replace(`%%TABLE_${idx}%%`, tableHTML);
    });

    return html;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lifework Career Analysis — ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #1a1008; background: #fff; line-height: 1.6; }
  
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  
  /* Cover */
  .cover { height: 247mm; display: flex; flex-direction: column; justify-content: space-between; border-bottom: 3px solid #c9973a; padding-bottom: 32px; box-sizing: border-box; overflow: hidden; }
  .cover-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 80px; }
  .cover-logo-square { width: 36px; height: 36px; border: 2px solid #c9973a; display: flex; align-items: center; justify-content: center; }
  .cover-logo-circle { width: 36px; height: 36px; overflow: hidden; display: block; }
  .cover-logo-text { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #0f1f35; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700; color: #0f1f35; line-height: 1.15; margin-bottom: 16px; }
  .cover-subtitle { font-size: 18px; color: #6b5c4a; margin-bottom: 48px; }
  .cover-meta { display: flex; gap: 32px; }
  .cover-meta-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9a8a78; display: block; margin-bottom: 4px; }
  .cover-meta-item span { font-size: 16px; font-weight: 500; color: #0f1f35; }
  .cover-footer { font-size: 12px; color: #9a8a78; }
  
  /* Section */
  .section { margin-top: 56px; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #0f1f35; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #c9973a; }
  .section-subtitle { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #1a1008; margin-top: 24px; margin-bottom: 12px; }
  
  /* VIA */
  .via-top5 { display: grid; gap: 12px; margin-bottom: 24px; }
  .via-card { border: 1px solid rgba(201,151,58,0.35); border-radius: 0; padding: 16px; background: #fdf9f3; }
  .via-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .via-rank { width: 32px; height: 32px; border: 1px solid #c9973a; display: flex; align-items: center; justify-content: center; color: #c9973a; font-weight: 700; font-size: 14px; flex-shrink: 0; }
  .via-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #0f1f35; }
  .via-virtue { font-size: 11px; padding: 2px 8px; border-radius: 0; font-weight: 500; text-transform: capitalize; }
  .via-score { margin-left: auto; font-size: 18px; font-weight: 700; color: #c9973a; }
  .via-desc { font-size: 13px; color: #6b5c4a; line-height: 1.5; }
  .via-atwork { font-size: 12px; color: #0f1f35; margin-top: 6px; font-weight: 500; }
  .via-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .via-bar-label { font-size: 12px; color: #1a1008; width: 160px; flex-shrink: 0; }
  .via-bar-track { flex: 1; height: 6px; background: #f0e8e0; border-radius: 0; overflow: hidden; }
  .via-bar-fill { height: 100%; border-radius: 0; }
  .via-bar-score { font-size: 12px; color: #6b5c4a; width: 28px; text-align: right; }
  
  /* Achievements */
  .decade-block { margin-bottom: 20px; }
  .decade-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #9a8a78; font-weight: 600; margin-bottom: 8px; }
  .achievement-item { padding: 10px 14px; border-left: 3px solid #c9973a; margin-bottom: 8px; }
  .achievement-title { font-size: 14px; font-weight: 600; color: #1a1008; }
  .achievement-desc { font-size: 13px; color: #6b5c4a; margin-top: 2px; }
  .esf-badge { display: inline-block; font-size: 10px; padding: 1px 7px; border-radius: 20px; color: white; font-weight: 500; margin-left: 8px; text-transform: capitalize; vertical-align: middle; }
  
  /* Career / Education */
  .timeline-item { padding: 12px 0; border-bottom: 1px solid #e8e0d8; }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-role { font-size: 14px; font-weight: 600; color: #1a1008; }
  .timeline-org { font-size: 14px; color: #6b5c4a; }
  .timeline-years { font-size: 12px; color: #9a8a78; margin-top: 2px; }
  .timeline-notes { font-size: 13px; color: #6b5c4a; margin-top: 4px; }
  
  /* Analysis */
  .analysis-content h1 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #0f1f35; margin: 32px 0 12px; }
  .analysis-content h2 { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #1a1008; margin: 24px 0 10px; border-bottom: 1px solid rgba(201,151,58,0.4); padding-bottom: 6px; }
  .analysis-content h3 { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: #1a1008; margin: 16px 0 8px; }
  .analysis-content p { font-size: 14px; color: #1a1008; line-height: 1.75; margin-bottom: 12px; }
  .analysis-content ul { padding-left: 20px; margin-bottom: 12px; }
  .analysis-content li { font-size: 14px; color: #1a1008; line-height: 1.65; margin-bottom: 4px; }
  .analysis-content strong { font-weight: 600; }
  
  /* Print */
  @media print {
    .cover { page-break-after: always; }
    .section { page-break-inside: avoid; }
    .via-card { page-break-inside: avoid; }
  }
  
  /* Single @page rule — suppresses browser URL/date/title print headers and footers */
  @page {
    size: A4;
    margin: 15mm 20mm;
  }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  
  .print-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: #0f1f35; border-bottom: 2px solid #c9973a; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; font-family: 'Inter', sans-serif; }
  .print-bar-tip { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.4; }
  .print-bar-tip strong { color: #f0c060; font-weight: 700; }
  .print-btn { background: #c9973a; color: white; border: none; padding: 9px 20px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
  .print-btn:hover { background: #b8862e; }
  @media print { .print-bar { display: none; } body { padding-top: 0 !important; } }
  body { padding-top: 64px; }
  @media print { body { padding-top: 0; } }
</style>
</head>
<body>
<div class="print-bar">
  <div class="print-bar-tip">
    <strong>&#9888; Important:</strong> In the print dialog, set <strong>Margins = None</strong> and uncheck <strong>Headers and footers</strong> — otherwise the browser will add the URL and date to every page.
  </div>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div>
      <div class="cover-logo">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" style="width:36px;height:36px;object-fit:cover;display:block;" alt="Pennington Hennessy" />
        <div class="cover-logo-text">Lifework</div>
      </div>
      <div class="cover-title">Career Analysis<br>Report</div>
      <div class="cover-subtitle">A narrative life history analysis</div>
      <div class="cover-meta">
        <div class="cover-meta-item">
          <label>Prepared for</label>
          <span>${data.clientName}</span>
        </div>
        <div class="cover-meta-item">
          <label>Date</label>
          <span>${date}</span>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      &copy; Pennington Hennessy ${new Date().getFullYear()} &mdash; Confidential
    </div>
  </div>


  ${(() => {
    const wow = report?.wowReportJson ? (typeof report.wowReportJson === 'string' ? JSON.parse(report.wowReportJson) : report.wowReportJson) : null;
    if (wow) {
      const sectionMeta = [
        { key: 'summary',            title: 'Lifework Summary' },
        { key: 'lifeHistoryPattern', title: 'Life History Pattern' },
        { key: 'viaSection',         title: 'Character Strengths' },
        { key: 'personalitySection', title: 'Personality Profile' },
        { key: 'behaviouralStyle',   title: 'Behavioural Style' },
        { key: 'careerDirections',   title: 'Career Directions' },
        { key: 'developmentEdge',    title: 'Development Edge' },
        { key: 'coachingQuestions',  title: 'Coaching Questions' },
      ];
      return sectionMeta.filter(s => wow[s.key]).map((s, i) => {
        // Behavioural Style — render Insights Discovery panel instead of AI prose
        if (s.key === 'behaviouralStyle' && wow.domainScores) {
          const ds = typeof wow.domainScores === 'string' ? JSON.parse(wow.domainScores) : wow.domainScores;
          return `
  <div class="section" style="page-break-before:always;">
    <div class="section-title">${s.title}</div>
    <div class="analysis-content">${buildInsightsDiscoveryHTML(ds)}</div>
  </div>`;
        }
        return `
  <div class="section" style="page-break-before:always;">
    <div class="section-title">${s.title}</div>
    <div class="analysis-content">${markdownToHTML(wow[s.key])}</div>
  </div>`;
      }).join('');
    } else if (report?.fullReportMarkdown) {
      return `
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Career Analysis</div>
    <div class="analysis-content">${markdownToHTML(report.fullReportMarkdown)}</div>
  </div>`;
    }
    return '';
  })()}

  ${achievements.length > 0 ? `
  <!-- Life History -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Life History</div>
    ${Object.entries(achievementsByDecade).map(([decade, items]) => `
    <div class="decade-block">
      <div class="decade-label">${decadeLabels[decade] ?? decade}</div>
      ${(items as any[]).map((a: any) => `
      <div class="achievement-item" style="border-left-color:${esfColors[a.esf] ?? 'rgba(201,151,58,0.25)'}">
        <div class="achievement-title">${a.title}${a.esf ? `<span class="esf-badge" style="background:${esfColors[a.esf]}">${a.esf}</span>` : ""}</div>
        ${a.description ? `<div class="achievement-desc">${a.description}</div>` : ""}
      </div>`).join("")}
    </div>`).join("")}
  </div>
  ` : ""}

  ${(career.length > 0 || family) ? `
  <!-- Background -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Career &amp; Family Background</div>

    ${family ? `
    <div class="section-subtitle">Family Background</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      ${family.fatherOccupation ? `<tr><td style="color:#9a8a78;padding:4px 0;width:160px">Father's occupation</td><td>${family.fatherOccupation}</td></tr>` : ""}
      ${family.motherOccupation ? `<tr><td style="color:#9a8a78;padding:4px 0">Mother's occupation</td><td>${family.motherOccupation}</td></tr>` : ""}
      ${family.siblingPosition ? `<tr><td style="color:#9a8a78;padding:4px 0">Sibling position</td><td>${family.siblingPosition}</td></tr>` : ""}
      ${family.upbringingLocation ? `<tr><td style="color:#9a8a78;padding:4px 0">Upbringing</td><td>${family.upbringingLocation}</td></tr>` : ""}
    </table>
    ${family.familyNarrative ? `<p style="font-size:13px;color:#1a1008;margin-bottom:8px">${family.familyNarrative}</p>` : ""}
    ` : ""}

    ${career.length > 0 ? `
    <div class="section-subtitle">Career History</div>
    ${career.map((c: any) => `
    <div class="timeline-item">
      <div class="timeline-role">${c.role ?? ""} <span class="timeline-org">at ${c.organisation}</span></div>
      <div class="timeline-years">${c.yearFrom ?? ""}${c.yearTo ? ` \u2013 ${c.yearTo}` : " \u2013 present"}</div>
      ${c.highlights ? `<div class="timeline-notes">${c.highlights}</div>` : ""}
    </div>`).join("")}
    ` : ""}
  </div>
  ` : ""}

  ${top5.length > 0 ? `
  <!-- VIA Character Strengths -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">VIA Character Strengths</div>
    <p style="font-size:14px;color:#6b5c4a;margin-bottom:20px;">Your character strengths are the positive traits that come most naturally to you. The top 5 are your <em>signature strengths</em> \u2014 the ones to build your career around.</p>

    <div class="section-subtitle">Your Signature Strengths (Top 5)</div>
    <div class="via-top5">
      ${top5.map((s, i) => {
        const vc = virtueColors[s.virtue?.toLowerCase()] ?? "#0f1f35";
        return `
        <div class="via-card">
          <div class="via-card-header">
            <div class="via-rank">${i + 1}</div>
            <div class="via-name">${s.name}</div>
            ${s.virtue ? `<span class="via-virtue" style="background:${vc}20;color:${vc};border:1px solid ${vc}40">${s.virtue}</span>` : ""}
            <div class="via-score">${s.score}/25</div>
          </div>
          <div class="via-desc">${s.description}</div>
          ${s.atWork ? `<div class="via-atwork">${s.atWork}</div>` : ""}
        </div>`;
      }).join("")}
    </div>

    <div class="section-subtitle">All 24 Strengths Ranked</div>
    ${ranked.map((s: any, i: number) => {
      const strength = strengthsMap.get(s.strengthId);
      const pct = Math.round((s.score / 25) * 100);
      const color = i < 5 ? "#c9973a" : i < 10 ? "#c9a227" : "#c0b0a0";
      return `
      <div class="via-bar-row">
        <div class="via-bar-label">${i + 1}. ${strength?.name ?? s.strengthId}</div>
        <div class="via-bar-track"><div class="via-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="via-bar-score">${s.score}</div>
      </div>`;
    }).join("")}
  </div>
  ` : ""}

  ${ipip && ipip.domainScores ? `
  <!-- IPIP-NEO-120 Personality Profile -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Personality Profile (IPIP-NEO-120)</div>
    <p style="font-size:14px;color:#6b5c4a;margin-bottom:20px;">The IPIP-NEO-120 measures personality across five broad domains and thirty specific facets. It is the modern open-science equivalent of the 16PF assessment used in traditional career counselling, and is validated against the same underlying model.</p>

    <div class="section-subtitle">The Big Five \u2014 Domain Overview</div>
    <div style="margin-bottom:24px;">
      ${IPIP_DOMAINS.map((domain) => {
        const score = (ipip.domainScores as any)[domain.key] ?? 50;
        const pct = score;
        const label = score >= 70 ? "High" : score <= 30 ? "Low" : "Average";
        return `
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:14px;font-weight:600;color:#1a1008;">${domain.name}</span>
            <span style="font-size:12px;color:#6b5c4a;">${label} (${score}/100)</span>
          </div>
          <div style="height:8px;background:#f0e8d8;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${domain.color};border-radius:4px;"></div>
          </div>
          <p style="font-size:12px;color:#6b5c4a;margin-top:4px;">${domain.description}</p>
        </div>`;
      }).join("")}
    </div>

    ${IPIP_DOMAINS.map((domain) => {
      const facets = IPIP_FACETS.filter((f) => f.domain === domain.key);
      const domainScore = (ipip.domainScores as any)[domain.key] ?? 50;
      return `
      <div class="section-subtitle" style="color:${domain.color};">${domain.name} \u2014 Facet Detail (Domain score: ${domainScore}/100)</div>
      ${facets.map((facet) => {
        const fs = (ipip.facetScores as any)[facet.key] ?? 50;
        const pct = fs;
        return `
        <div style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <span style="font-size:13px;color:#1a1008;">${facet.name}</span>
            <span style="font-size:11px;color:#9a8a78;">${fs}/100</span>
          </div>
          <div style="height:5px;background:#f0e8d8;border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${domain.color};opacity:0.7;border-radius:3px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#9a8a78;margin-top:1px;">
            <span>${facet.lowLabel}</span><span>${facet.highLabel}</span>
          </div>
        </div>`;
      }).join("")}`;
    }).join("")}
  </div>
  ` : ""}


  ${approvedAnnex ? `
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Coaching Session Annex</div>
    <div style="font-size:12px;color:#6b5c4a;margin-bottom:20px;font-style:italic;">A personal reflection from your counsellor, drawing on your Lifework journey and our coaching conversation.</div>
    <div class="analysis-content">${markdownToHTML(approvedAnnex)}</div>
  </div>` : ""}

  <div style="page-break-inside:avoid;page-break-before:avoid;margin-top:32px;padding-top:16px;border-top:1px solid rgba(201,151,58,0.4);text-align:center;font-size:11px;color:#9a8a78;">
    &copy; Pennington Hennessy ${new Date().getFullYear()} &mdash; Confidential
  </div>

</div>
</body>
</html>`;
}
