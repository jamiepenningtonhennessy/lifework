/**
 * updateLawFirmAts.mjs
 * Updates ATS provider + slug + careers_url for law firms based on research.
 * Run: node server/scripts/updateLawFirmAts.mjs
 */
import mysql from 'mysql2/promise';

const updates = [
  // ── Workday firms (previously wrong or missing) ──────────────────────────────
  { name: 'Linklaters',              ats_provider: 'workday', ats_slug: 'linklaters|Linklaters',                         careers_url: 'https://linklaters.wd3.myworkdayjobs.com/Linklaters' },
  { name: 'Freshfields',             ats_provider: 'workday', ats_slug: 'freshfields|FBD_101',                           careers_url: 'https://freshfields.wd3.myworkdayjobs.com/FBD_101' },
  { name: 'Herbert Smith Freehills', ats_provider: 'workday', ats_slug: 'herbertsmithfreehills|External',                careers_url: 'https://herbertsmithfreehills.wd3.myworkdayjobs.com/External' },
  { name: 'Hogan Lovells',           ats_provider: 'workday', ats_slug: 'hoganlovells|Hogan_Lovells_External',           careers_url: 'https://hoganlovells.wd3.myworkdayjobs.com/Search' },
  { name: 'CMS',                     ats_provider: 'workday', ats_slug: 'cmno|CMS_Career_Site',                          careers_url: 'https://cmno.wd3.myworkdayjobs.com/CMS_Career_Site' },
  { name: 'White & Case',            ats_provider: 'workday', ats_slug: 'whitecase|WhiteCase',                           careers_url: 'https://www.whitecase.com/careers' },
  { name: 'Weil Gotshal',            ats_provider: 'workday', ats_slug: 'weil|work_at_weil',                             careers_url: 'https://weil.wd1.myworkdayjobs.com/work_at_weil' },
  { name: 'Davis Polk',              ats_provider: 'workday', ats_slug: 'davispolk|business-professionals-services-usa', careers_url: 'https://www.davispolk.com/careers/business-professionals' },
  { name: 'Clyde & Co',              ats_provider: 'workday', ats_slug: 'clydeco|clydecocareers',                        careers_url: 'https://clydeco.wd103.myworkdayjobs.com/clydecocareers' },

  // ── SmartRecruiters ──────────────────────────────────────────────────────────
  { name: 'Sullivan & Worcester',    ats_provider: 'smartrecruiters', ats_slug: 'SullivanWorcesterLLP', careers_url: 'https://careers.smartrecruiters.com/SullivanWorcesterLLP' },

  // ── Generic — update careers_url to correct URL ──────────────────────────────
  { name: 'Clifford Chance',         ats_provider: 'generic', ats_slug: 'https://jobs.cliffordchance.com/',                           careers_url: 'https://jobs.cliffordchance.com/' },
  { name: 'A&O Shearman',            ats_provider: 'generic', ats_slug: 'https://careers.aoshearman.com/en',                         careers_url: 'https://careers.aoshearman.com/en' },
  { name: 'Slaughter and May',       ats_provider: 'generic', ats_slug: 'https://joinus.slaughterandmay.com/',                       careers_url: 'https://joinus.slaughterandmay.com/' },
  { name: 'Travers Smith',           ats_provider: 'generic', ats_slug: 'https://www.traverssmith.com/join-us/vacancies/',           careers_url: 'https://www.traverssmith.com/join-us/vacancies/' },
  { name: 'Latham & Watkins',        ats_provider: 'generic', ats_slug: 'https://careers-lw.icims.com/',                             careers_url: 'https://careers-lw.icims.com/' },
  { name: 'Ropes & Gray',            ats_provider: 'generic', ats_slug: 'https://careers-ropesgray.icims.com/jobs',                  careers_url: 'https://careers-ropesgray.icims.com/jobs' },
  { name: 'Willkie Farr',            ats_provider: 'generic', ats_slug: 'https://jobs-willkie.icims.com',                            careers_url: 'https://jobs-willkie.icims.com' },
  { name: 'TLT',                     ats_provider: 'generic', ats_slug: 'https://apply.tlt.com/vacancies/',                          careers_url: 'https://apply.tlt.com/vacancies/' },
  { name: 'Fieldfisher',             ats_provider: 'generic', ats_slug: 'https://fieldfisher.current-vacancies.com/',                careers_url: 'https://fieldfisher.current-vacancies.com/' },
  { name: 'Farrer & Co',             ats_provider: 'generic', ats_slug: 'https://farrer.allhires.com/',                              careers_url: 'https://farrer.allhires.com/' },
  { name: 'Watson Farley & Williams',ats_provider: 'generic', ats_slug: 'https://wfw.allhires.com/',                                 careers_url: 'https://wfw.allhires.com/' },
  { name: 'Withers',                 ats_provider: 'generic', ats_slug: 'https://www.witherscareers.com/',                           careers_url: 'https://www.witherscareers.com/' },
  { name: 'Womble Bond Dickinson',   ats_provider: 'generic', ats_slug: 'https://www.womblebonddickinson.com/us/careers',            careers_url: 'https://www.womblebonddickinson.com/us/careers' },
  { name: 'Wiggin',                  ats_provider: 'generic', ats_slug: 'https://www.wiggin.com/careers-at-wiggin/current-openings/',careers_url: 'https://www.wiggin.com/careers-at-wiggin/current-openings/' },
  { name: 'Quinn Emanuel',           ats_provider: 'generic', ats_slug: 'https://florecruit.com/v2/app/forward/firms/quinnemanuel',  careers_url: 'https://florecruit.com/v2/app/forward/firms/quinnemanuel' },
  { name: 'WilmerHale',              ats_provider: 'generic', ats_slug: 'https://wilmerhalecareers.silkroad.com/wilmerhaleext/EmploymentListings.html', careers_url: 'https://wilmerhalecareers.silkroad.com/wilmerhaleext/EmploymentListings.html' },
  { name: 'Akin',                    ats_provider: 'generic', ats_slug: 'https://akingumpselfapply.viglobalcloud.com/viRecruitSelfApply/RecDefault.aspx?Tag=5b679650-882f-422f-958f-90fd613e3a43', careers_url: 'https://akingumpselfapply.viglobalcloud.com/viRecruitSelfApply/RecDefault.aspx?Tag=5b679650-882f-422f-958f-90fd613e3a43' },
  { name: 'Eversheds Sutherland',    ats_provider: 'generic', ats_slug: 'https://careers.eversheds-sutherland.com/',                 careers_url: 'https://careers.eversheds-sutherland.com/' },
  { name: 'Clyde & Co',              ats_provider: 'workday', ats_slug: 'clydeco|clydecocareers',                                    careers_url: 'https://clydeco.wd103.myworkdayjobs.com/clydecocareers' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL || '');
let updated = 0;
for (const u of updates) {
  const [res] = await conn.execute(
    'UPDATE company_universe SET ats_provider = ?, ats_slug = ?, careers_url = ? WHERE name = ?',
    [u.ats_provider, u.ats_slug, u.careers_url, u.name]
  );
  if (res.affectedRows > 0) {
    console.log(`✓ ${u.name} → ${u.ats_provider} (${u.ats_slug || u.careers_url})`);
    updated++;
  } else {
    console.log(`⚠ No match for: ${u.name}`);
  }
}
console.log(`\nDone — ${updated}/${updates.length} rows updated.`);
await conn.end();
