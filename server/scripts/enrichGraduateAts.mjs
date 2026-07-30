/**
 * Enrich graduate company universe with ATS provider data.
 * Run: node server/scripts/enrichGraduateAts.mjs
 *
 * Maps major UK graduate employers to their ATS provider + slug so Stage 3
 * can actually fetch live job listings via API (no browser needed).
 *
 * ATS providers supported:
 *   greenhouse  → https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *   lever       → https://api.lever.co/v0/postings/{slug}
 *   ashby       → https://jobs.ashbyhq.com/{slug}
 *   workday     → tenant|site format
 *   icims       → careers-{slug}.icims.com
 *   smartrecruiters → https://api.smartrecruiters.com/v1/companies/{slug}/postings
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

// ATS enrichment data for major UK graduate employers
// Format: { name: string (must match DB name exactly), atsProvider, atsSlug, careersUrl }
const ATS_DATA = [
  // ── Big Tech ──────────────────────────────────────────────────────────────
  { name: "Google",              atsProvider: "greenhouse",      atsSlug: "google",            careersUrl: "https://careers.google.com/" },
  { name: "Amazon",              atsProvider: "smartrecruiters", atsSlug: "Amazon",             careersUrl: "https://www.amazon.jobs/" },
  { name: "Microsoft",           atsProvider: "workday",         atsSlug: "microsoft|Microsoft", careersUrl: "https://careers.microsoft.com/" },
  { name: "Apple",               atsProvider: "workday",         atsSlug: "apple|Apple",        careersUrl: "https://jobs.apple.com/" },
  { name: "Meta",                atsProvider: "greenhouse",      atsSlug: "meta",               careersUrl: "https://www.metacareers.com/" },
  { name: "IBM",                 atsProvider: "smartrecruiters", atsSlug: "IBM",                careersUrl: "https://www.ibm.com/uk-en/employment/" },
  { name: "Salesforce",          atsProvider: "greenhouse",      atsSlug: "salesforce",         careersUrl: "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site" },
  { name: "Adobe",               atsProvider: "workday",         atsSlug: "adobe|Adobe",        careersUrl: "https://adobe.wd5.myworkdayjobs.com/external_experienced" },
  { name: "Oracle",              atsProvider: "workday",         atsSlug: "oracle|oracle",      careersUrl: "https://careers.oracle.com/" },
  { name: "SAP",                 atsProvider: "smartrecruiters", atsSlug: "SAP",                careersUrl: "https://jobs.sap.com/" },
  { name: "Cisco",               atsProvider: "workday",         atsSlug: "cisco|Cisco",        careersUrl: "https://jobs.cisco.com/" },
  { name: "Capgemini",           atsProvider: "workday",         atsSlug: "capgemini|Capgemini", careersUrl: "https://www.capgemini.com/gb-en/careers/" },
  { name: "Accenture",           atsProvider: "workday",         atsSlug: "accenture|accenture_careers", careersUrl: "https://www.accenture.com/gb-en/careers" },
  { name: "Fujitsu",             atsProvider: "workday",         atsSlug: "fujitsu|Fujitsu",    careersUrl: "https://careers.fujitsu.com/" },

  // ── Banking & Finance ─────────────────────────────────────────────────────
  { name: "Goldman Sachs",       atsProvider: "workday",         atsSlug: "goldmansachs|campus_recruiting", careersUrl: "https://www.goldmansachs.com/careers/" },
  { name: "J.P. Morgan",         atsProvider: "workday",         atsSlug: "jpmc|campus",        careersUrl: "https://careers.jpmorgan.com/" },
  { name: "Morgan Stanley",      atsProvider: "workday",         atsSlug: "morganstanley|campus", careersUrl: "https://www.morganstanley.com/people/campus-recruiting" },
  { name: "Barclays",            atsProvider: "workday",         atsSlug: "barclays|Barclays",  careersUrl: "https://home.barclays/careers/" },
  { name: "HSBC",                atsProvider: "workday",         atsSlug: "hsbc|hsbc",          careersUrl: "https://www.hsbc.com/careers" },
  { name: "Lloyds Banking Group", atsProvider: "workday",        atsSlug: "lloydsbanking|LloydsBankingGroup", careersUrl: "https://www.lloydsbankinggroup.com/careers.html" },
  { name: "BlackRock",           atsProvider: "workday",         atsSlug: "blackrock|BlackRock_Campus", careersUrl: "https://careers.blackrock.com/" },
  { name: "Bloomberg",           atsProvider: "lever",           atsSlug: "bloomberg",          careersUrl: "https://www.bloomberg.com/careers/" },
  { name: "Schroders",           atsProvider: "workday",         atsSlug: "schroders|Schroders", careersUrl: "https://www.schroders.com/en-gb/uk/individual/careers/" },

  // ── Consulting ────────────────────────────────────────────────────────────
  { name: "McKinsey & Company",  atsProvider: "workday",         atsSlug: "mckinsey|mckinsey",  careersUrl: "https://www.mckinsey.com/careers" },
  { name: "Boston Consulting Group", atsProvider: "workday",     atsSlug: "bcg|BCG",            careersUrl: "https://careers.bcg.com/" },
  { name: "Bain & Company",      atsProvider: "workday",         atsSlug: "bain|bain",          careersUrl: "https://www.bain.com/careers/" },
  { name: "Deloitte",            atsProvider: "workday",         atsSlug: "deloitte|deloitte",  careersUrl: "https://www2.deloitte.com/uk/en/careers.html" },
  { name: "PwC",                 atsProvider: "workday",         atsSlug: "pwc|PricewaterhouseCoopers", careersUrl: "https://www.pwc.co.uk/careers.html" },
  { name: "EY",                  atsProvider: "workday",         atsSlug: "ey|EY",              careersUrl: "https://www.ey.com/en_uk/careers" },
  { name: "KPMG",                atsProvider: "workday",         atsSlug: "kpmg|KPMG",          careersUrl: "https://www.kpmgcareers.co.uk/" },
  { name: "Oliver Wyman",        atsProvider: "workday",         atsSlug: "oliverwyman|OliverWyman", careersUrl: "https://www.oliverwyman.com/careers.html" },
  { name: "Roland Berger",       atsProvider: "workday",         atsSlug: "rolandberger|RolandBerger", careersUrl: "https://www.rolandberger.com/en/Career/" },

  // ── FMCG & Consumer ───────────────────────────────────────────────────────
  { name: "Unilever",            atsProvider: "workday",         atsSlug: "unilever|Unilever",  careersUrl: "https://careers.unilever.com/" },
  { name: "Procter & Gamble",    atsProvider: "workday",         atsSlug: "pg|ProcterGamble",   careersUrl: "https://www.pgcareers.com/" },
  { name: "Nestlé",              atsProvider: "smartrecruiters", atsSlug: "Nestle",             careersUrl: "https://www.nestle.com/jobs" },
  { name: "L'Oréal",             atsProvider: "workday",         atsSlug: "loreal|loreal",      careersUrl: "https://careers.loreal.com/" },
  { name: "Diageo",              atsProvider: "workday",         atsSlug: "diageo|Diageo",      careersUrl: "https://www.diageo.com/en/careers/" },
  { name: "Reckitt",             atsProvider: "workday",         atsSlug: "reckitt|Reckitt",    careersUrl: "https://careers.reckitt.com/" },

  // ── Retail ────────────────────────────────────────────────────────────────
  { name: "Marks & Spencer",     atsProvider: "workday",         atsSlug: "marksandspencer|MarksandSpencer", careersUrl: "https://jobs.marksandspencer.com/" },
  { name: "John Lewis Partnership", atsProvider: "workday",      atsSlug: "johnlewis|JohnLewisPartnership", careersUrl: "https://www.jlpjobs.com/" },
  { name: "Tesco",               atsProvider: "workday",         atsSlug: "tesco|Tesco",        careersUrl: "https://www.tesco-careers.com/" },
  { name: "Sainsbury's",         atsProvider: "workday",         atsSlug: "sainsburys|Sainsburys", careersUrl: "https://jobs.sainsburys.co.uk/" },
  { name: "ASOS",                atsProvider: "greenhouse",      atsSlug: "asos",               careersUrl: "https://careers.asos.com/" },
  { name: "Ocado Group",         atsProvider: "greenhouse",      atsSlug: "ocado",              careersUrl: "https://careers.ocado.com/" },

  // ── Pharma & Healthcare ───────────────────────────────────────────────────
  { name: "AstraZeneca",         atsProvider: "workday",         atsSlug: "astrazeneca|AstraZeneca", careersUrl: "https://careers.astrazeneca.com/" },
  { name: "GSK",                 atsProvider: "workday",         atsSlug: "gsk|GSK",            careersUrl: "https://jobs.gsk.com/" },
  { name: "Pfizer",              atsProvider: "workday",         atsSlug: "pfizer|Pfizer",      careersUrl: "https://www.pfizer.com/about/careers" },
  { name: "Johnson & Johnson",   atsProvider: "workday",         atsSlug: "jnj|JohnsonJohnson", careersUrl: "https://jobs.jnj.com/" },

  // ── Energy & Utilities ────────────────────────────────────────────────────
  { name: "BP",                  atsProvider: "workday",         atsSlug: "bp|BP",              careersUrl: "https://www.bp.com/en/global/corporate/careers.html" },
  { name: "Shell",               atsProvider: "workday",         atsSlug: "shell|Shell",        careersUrl: "https://www.shell.com/careers.html" },
  { name: "National Grid",       atsProvider: "workday",         atsSlug: "nationalgrid|NationalGrid", careersUrl: "https://careers.nationalgrid.com/" },
  { name: "Centrica",            atsProvider: "workday",         atsSlug: "centrica|Centrica",  careersUrl: "https://jobs.centrica.com/" },
  { name: "BT Group",            atsProvider: "workday",         atsSlug: "bt|BT",              careersUrl: "https://jobs.bt.com/" },
  { name: "Vodafone",            atsProvider: "workday",         atsSlug: "vodafone|Vodafone",  careersUrl: "https://careers.vodafone.com/" },

  // ── Media & Publishing ────────────────────────────────────────────────────
  { name: "BBC",                 atsProvider: "workday",         atsSlug: "bbc|BBC",            careersUrl: "https://www.bbc.co.uk/careers" },
  { name: "Sky",                 atsProvider: "workday",         atsSlug: "sky|Sky",            careersUrl: "https://careers.sky.com/" },
  { name: "Channel 4",           atsProvider: "greenhouse",      atsSlug: "channel4",           careersUrl: "https://jobs.channel4.com/" },

  // ── Public Sector ─────────────────────────────────────────────────────────
  { name: "Bank of England",     atsProvider: "workday",         atsSlug: "bankofengland|BankofEngland", careersUrl: "https://www.bankofengland.co.uk/careers" },
  { name: "Civil Service",       atsProvider: null,              atsSlug: null,                 careersUrl: "https://www.civilservicejobs.service.gov.uk/" },

  // ── Legal Tech & AI ───────────────────────────────────────────────────────
  { name: "Palantir",            atsProvider: "lever",           atsSlug: "palantir",           careersUrl: "https://www.palantir.com/careers/" },
  { name: "Wayve",               atsProvider: "greenhouse",      atsSlug: "wayve",              careersUrl: "https://wayve.ai/careers/" },
  { name: "Quantexa",            atsProvider: "greenhouse",      atsSlug: "quantexa",           careersUrl: "https://www.quantexa.com/careers/" },
  { name: "Faculty AI",          atsProvider: "lever",           atsSlug: "facultyai",          careersUrl: "https://faculty.ai/careers/" },
  { name: "Luminance",           atsProvider: "lever",           atsSlug: "luminance",          careersUrl: "https://luminance.com/careers/" },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  let updated = 0;
  let notFound = 0;

  for (const entry of ATS_DATA) {
    if (!entry.atsProvider) continue; // skip null entries

    const [existing] = await conn.execute(
      "SELECT id, ats_provider FROM company_universe WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [entry.name]
    );

    if (existing.length === 0) {
      console.log(`  NOT FOUND: ${entry.name}`);
      notFound++;
      continue;
    }

    await conn.execute(
      "UPDATE company_universe SET ats_provider = ?, ats_slug = ?, careers_url = ? WHERE LOWER(name) = LOWER(?)",
      [entry.atsProvider, entry.atsSlug, entry.careersUrl, entry.name]
    );
    console.log(`  Updated: ${entry.name} → ${entry.atsProvider}/${entry.atsSlug}`);
    updated++;
  }

  await conn.end();
  console.log(`\nDone. Updated: ${updated}, Not found: ${notFound}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
