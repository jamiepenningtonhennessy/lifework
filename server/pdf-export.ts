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
  getCognitiveScreenerResult,
} from "./db";
import { getUserByOpenId } from "./db";
import { VIA_STRENGTHS } from "../shared/via-data";
import { IPIP_DOMAINS, IPIP_FACETS } from "../shared/ipip-data";
import { interpretDomain } from "../shared/cognitive-screener-data";

const strengthsMap = new Map(VIA_STRENGTHS.map((s) => [s.id, s]));

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

    const [profile, achievements, family, education, career, via, ipip, report, coachingAnnex, cognitive] = await Promise.all([
      getClientProfileById(clientId),
      getAchievements(clientId),
      getFamilyBackground(clientId),
      getEducationHistory(clientId),
      getCareerHistory(clientId),
      getViaResults(clientId),
      getIpipResults(clientId),
      getAnalysisReport(clientId),
      getCoachingAnnex(clientId),
      getCognitiveScreenerResult(clientId),
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
    const clientName = profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user.name ?? "Client";

    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // We'll generate an HTML string and return it as a downloadable HTML file
    // that the browser can print to PDF
    const html = buildReportHTML({
      clientName,
      date: now,
      profile,
      achievements,
      family,
      education,
      career,
      top5,
      ranked,
      ipip: ipip ?? null,
      cognitive: cognitive ?? null,
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

function buildReportHTML(data: {
  clientName: string;
  date: string;
  profile: any;
  achievements: any[];
  family: any;
  education: any[];
  career: any[];
  top5: any[];
  ranked: any[];
  ipip: any;
  cognitive: any;
  report: any;
  approvedAnnex?: string | null;
}): string {
  const { clientName, date, achievements, family, education, career, top5, ranked, ipip, cognitive, report, approvedAnnex } = data;

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
    return md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[h|u|l|p])(.+)$/gm, "<p>$1</p>");
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
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; border-bottom: 3px solid #c9973a; padding-bottom: 48px; }
  .cover-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 80px; }
  .cover-logo-square { width: 36px; height: 36px; border: 2px solid #c9973a; display: flex; align-items: center; justify-content: center; }
  .cover-logo-circle { width: 36px; height: 36px; border: 2px solid #c9973a; display: flex; align-items: center; justify-content: center; color: #c9973a; font-weight: 700; font-size: 14px; }
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
  .print-bar-tip { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.4; }
  .print-bar-tip strong { color: #c9973a; }
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
    <strong>Before printing:</strong> In the print dialog, open <strong>More settings</strong> and turn off <strong>Headers and footers</strong> to remove the browser URL and page numbers.
  </div>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div>
      <div class="cover-logo">
        <div class="cover-logo-circle">L</div>
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


  ${report?.fullReportMarkdown ? `
  <!-- Analysis Report -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Career Analysis</div>
    <div class="analysis-content">
      ${markdownToHTML(report.fullReportMarkdown)}
    </div>
  </div>
  ` : ""}

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

  ${(education.length > 0 || career.length > 0 || family) ? `
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

    ${education.length > 0 ? `
    <div class="section-subtitle">Education</div>
    ${education.map((e: any) => `
    <div class="timeline-item">
      <div class="timeline-role">${e.institution}</div>
      <div class="timeline-org">${[e.qualification, e.subject].filter(Boolean).join(" \u2014 ")}</div>
      <div class="timeline-years">${e.yearFrom ?? ""}${e.yearTo ? ` \u2013 ${e.yearTo}` : ""}</div>
      ${e.highlights ? `<div class="timeline-notes">${e.highlights}</div>` : ""}
    </div>`).join("")}
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

  ${cognitive?.scores ? `
  <!-- Reasoning Strengths Screener -->
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Reasoning Strengths Screener</div>
    <p style="font-size:14px;color:#6b5c4a;margin-bottom:20px;">
      A 30-question indicative assessment covering verbal, numerical, and abstract reasoning. Scores are out of 10 per domain; the overall score is out of 30.
      These results are indicative rather than definitive \u2014 they are one lens through which your life history pattern is read more clearly.
    </p>
    ${(['verbal', 'numerical', 'abstract'] as const).map(domain => {
      const score: number = (cognitive.scores as any)[domain] ?? 0;
      const interp = interpretDomain(domain, score);
      const pct = Math.round((score / 10) * 100);
      const domainLabel = domain.charAt(0).toUpperCase() + domain.slice(1);
      const levelColors: Record<string, string> = { Developing: '#9ca3af', Solid: '#3b82f6', Strong: '#10b981', Exceptional: '#8b5cf6' };
      const barColor = levelColors[interp.label] ?? '#0f1f35';
      return `
      <div style="margin-bottom:24px;padding:16px;border:1px solid rgba(201,151,58,0.25);border-radius:10px;background:#fdf9f3;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:#1a1008;">${domainLabel} Reasoning</span>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;font-weight:700;color:#c9973a;">${score}/10</span>
            <span style="font-size:11px;padding:2px 10px;border-radius:20px;color:white;font-weight:600;background:${barColor};">${interp.label}</span>
          </div>
        </div>
        <div style="height:8px;background:#f0e8d8;border-radius:4px;overflow:hidden;margin-bottom:12px;">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;"></div>
        </div>
        <p style="font-size:13px;color:#1a1008;line-height:1.65;margin-bottom:6px;">${interp.description}</p>
        <p style="font-size:12px;color:#0f1f35;font-weight:500;"><strong>Career implication:</strong> ${interp.careerImplication}</p>
      </div>`;
    }).join('')}
    <div style="margin-top:16px;padding:12px 16px;background:#f0e8d8;border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:13px;color:#6b5c4a;">Overall Score</span>
      <span style="font-size:20px;font-weight:700;color:#c9973a;">${(cognitive.scores as any).total ?? 0} / 30</span>
      ${(cognitive.scores as any).percentile ? `<span style="font-size:12px;color:#9a8a78;">~${(cognitive.scores as any).percentile}th percentile</span>` : ''}
    </div>
  </div>
  ` : ""}

  ${approvedAnnex ? `
  <div class="section" style="page-break-before:always;">
    <div class="section-title">Coaching Session Annex</div>
    <div style="font-size:12px;color:#6b5c4a;margin-bottom:20px;font-style:italic;">A personal reflection from your counsellor, drawing on your Lifework journey and our coaching conversation.</div>
    <div class="analysis-content">${markdownToHTML(approvedAnnex)}</div>
  </div>` : ""}

  <div style="margin-top:60px;padding-top:20px;border-top:1px solid rgba(201,151,58,0.4);text-align:center;font-size:11px;color:#9a8a78;">
    &copy; Pennington Hennessy ${new Date().getFullYear()} &mdash; Confidential
  </div>

</div>
</body>
</html>`;
}
