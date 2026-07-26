import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Lead Magnet Downloads ─────────────────────────────────────────────────

export const leadMagnetDownloads = mysqlTable("lead_magnet_downloads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  document: varchar("document", { length: 64 }).default("lifework_overview").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadMagnetDownload = typeof leadMagnetDownloads.$inferSelect;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Client Profiles ────────────────────────────────────────────────────────

export const clientProfiles = mysqlTable("client_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  dateOfBirth: varchar("dateOfBirth", { length: 32 }),
  currentRole: varchar("currentRole", { length: 256 }),
  currentOrg: varchar("currentOrg", { length: 256 }),
  interviewStatus: mysqlEnum("interviewStatus", [
    "not_started",
    "in_progress",
    "completed",
  ])
    .default("not_started")
    .notNull(),
  viaStatus: mysqlEnum("viaStatus", ["not_started", "completed"])
    .default("not_started")
    .notNull(),
  ipipStatus: mysqlEnum("ipipStatus", ["not_started", "completed"])
    .default("not_started")
    .notNull(),
  backgroundStatus: mysqlEnum("backgroundStatus", ["not_started", "in_progress", "completed"])
    .default("not_started")
    .notNull(),
  sageStatus: mysqlEnum("sageStatus", ["not_started", "completed"])
    .default("not_started")
    .notNull(),
  cognitiveStatus: mysqlEnum("cognitiveStatus", ["not_started", "completed"])
    .default("not_started")
    .notNull(),
  analysisStatus: mysqlEnum("analysisStatus", [
    "not_started",
    "in_progress",
    "completed",
  ])
    .default("not_started")
    .notNull(),
  pronouns: varchar("pronouns", { length: 32 }),
  careerExplorerUnlocked: boolean("careerExplorerUnlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;

// ─── Life Achievements ───────────────────────────────────────────────────────

export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  decade: mysqlEnum("decade", [
    "childhood",
    "teens",
    "twenties",
    "thirties",
    "forties",
    "fifties",
    "sixties_plus",
  ]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  age: int("age"), // age at time of action
  description: text("description"),
  sageEnrichment: text("sageEnrichment"),
  counsellorNotes: text("counsellorNotes"),
  esf: mysqlEnum("esf", ["enjoyable", "satisfying", "fulfilling"]),
  skills: text("skills"), // comma-separated or short text
  othersObservations: text("othersObservations"), // what others said about the person at this time
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;

// ─── Family Background ───────────────────────────────────────────────────────

export const familyBackground = mysqlTable("family_background", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  fatherOccupation: varchar("fatherOccupation", { length: 256 }),
  motherOccupation: varchar("motherOccupation", { length: 256 }),
  siblingPosition: varchar("siblingPosition", { length: 128 }),
  upbringingLocation: varchar("upbringingLocation", { length: 256 }),
  familyNarrative: text("familyNarrative"),
  significantInfluences: text("significantInfluences"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FamilyBackground = typeof familyBackground.$inferSelect;

// ─── Education History ───────────────────────────────────────────────────────

export const educationHistory = mysqlTable("education_history", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  institution: varchar("institution", { length: 256 }).notNull(),
  qualification: varchar("qualification", { length: 256 }),
  subject: varchar("subject", { length: 256 }),
  yearFrom: varchar("yearFrom", { length: 8 }),
  yearTo: varchar("yearTo", { length: 8 }),
  highlights: text("highlights"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EducationHistory = typeof educationHistory.$inferSelect;

// ─── Career History ──────────────────────────────────────────────────────────

export const careerHistory = mysqlTable("career_history", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  organisation: varchar("organisation", { length: 256 }).notNull(),
  role: varchar("role", { length: 256 }),
  yearFrom: varchar("yearFrom", { length: 8 }),
  yearTo: varchar("yearTo", { length: 8 }),
  keyResponsibilities: text("keyResponsibilities"),
  whyLeft: text("whyLeft"),
  highlights: text("highlights"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CareerHistory = typeof careerHistory.$inferSelect;

// ─── VIA Character Strengths Results ────────────────────────────────────────

export const viaResults = mysqlTable("via_results", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  // Stores array of { strength: string, score: number, rank: number }
  rankedStrengths: json("rankedStrengths"),
  // Raw scores keyed by strength name
  rawScores: json("rawScores"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ViaResults = typeof viaResults.$inferSelect;

// ─── IPIP-NEO-120 Results ────────────────────────────────────────────────────

export const ipipResults = mysqlTable("ipip_results", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  // Domain scores: { N, E, O, A, C } each 0-100
  domainScores: json("domainScores"),
  // Facet scores: { facetKey: score } 30 facets each 0-100
  facetScores: json("facetScores"),
  // Raw answers: { questionIndex: 1-5 }
  rawAnswers: json("rawAnswers"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IpipResults = typeof ipipResults.$inferSelect;

// ─── Cognitive Screener Results ────────────────────────────────────────────

export const cognitiveScreenerResults = mysqlTable("cognitive_screener_results", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  // Scores per domain: { verbal: 0-10, numerical: 0-10, abstract: 0-10, total: 0-30, percentile: 0-99 }
  scores: json("scores"),
  // Raw answers: { itemId: chosenOptionIndex }
  rawAnswers: json("rawAnswers"),
  // Time taken in seconds
  timeTakenSeconds: int("timeTakenSeconds"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CognitiveScreenerResult = typeof cognitiveScreenerResults.$inferSelect;

// ─── Interview Chat Messages ─────────────────────────────────────────────────

export const interviewMessages = mysqlTable("interview_messages", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  phase: varchar("phase", { length: 64 }), // e.g. "childhood", "family", "career"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InterviewMessage = typeof interviewMessages.$inferSelect;

// ─── Analysis Reports ────────────────────────────────────────────────────────

export const analysisReports = mysqlTable("analysis_reports", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  coreStrengths: text("coreStrengths"),
  drivingMotivations: text("drivingMotivations"),
  preferredEnvironments: text("preferredEnvironments"),
  keySkills: text("keySkills"),
  careerThemes: text("careerThemes"),
  viaCorrelation: text("viaCorrelation"),
  careerSuggestions: text("careerSuggestions"),
  counselorNotes: text("counselorNotes"),
  fullReportMarkdown: text("fullReportMarkdown"),
  coachingSummaryJson: text("coachingSummaryJson"),
  coachNotesJson: text("coachNotesJson"),
   sectionAnalysisJson: text("sectionAnalysisJson"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  // WOW Report — AI-generated premium PDF report
  wowReportJson: text("wowReportJson"),       // JSON blob of all 7 sections
  wowReportPdfUrl: text("wowReportPdfUrl"),   // S3 URL of the generated PDF
  wowReportGeneratedAt: timestamp("wowReportGeneratedAt"),
  wowReportStatus: varchar("wowReportStatus", { length: 20 }),  // pending|generating|done|error
  wowReportError: text("wowReportError"),     // error message if status=error
  wowReportType: mysqlEnum("wowReportType", ["standard", "student", "career_changer", "job_returner", "retirement"]).default("standard"),  // report variant
  wowReportWritingStyle: varchar("wow_report_writing_style", { length: 20 }).$default(() => "house"),  // writing style: house | mark
  wowReportLocked: boolean("wowReportLocked").default(false).notNull(),  // locked after first download; prevents accidental regeneration
  // ── Canonical Stage 1: single source of truth for life history analysis ──
  canonicalStage1: text("canonical_stage1"),           // Dependable Strengths analysis — shared by WoW and counsellor reports
  canonicalStage1GeneratedAt: int("canonical_stage1_generated_at"),  // Unix ms timestamp
  // ── Counsellor-level analyses (generated once, stored forever, no versioning) ──
  counsellorViaAnalysis: text("counsellor_via_analysis"),         // Full VIA analysis markdown (counsellor layer)
  counsellorViaGeneratedAt: bigint("counsellor_via_generated_at", { mode: "number" }),   // Unix ms timestamp
  counsellorOceanAnalysis: text("counsellor_ocean_analysis"),     // Full OCEAN analysis markdown (counsellor layer)
  counsellorOceanGeneratedAt: bigint("counsellor_ocean_generated_at", { mode: "number" }), // Unix ms timestamp
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AnalysisReport = typeof analysisReports.$inferSelect;

// ─── Virtual Peter: Historical Client Database ───────────────────────────────
// Each record represents one of Peter's historical clients, identified by
// their career outcome description. The embedding field stores a 1536-dim
// float32 vector (as JSON array) for semantic similarity search.
// tier: 1 = best match, 2 = good match, 3 = possible match (Peter's original classification)

export const historicalClients = mysqlTable("historical_clients", {
  id: int("id").autoincrement().primaryKey(),
  // Stable hash ID from the original MDB data
  externalId: varchar("externalId", { length: 32 }).notNull().unique(),
  // Peter's career outcome description (the primary display text)
  careerDescription: text("careerDescription").notNull(),
  // Peter's tier classification: 1=best, 2=good, 3=possible
  tier: int("tier").notNull().default(3),
  // Sample narrative entries from the life history corpus (JSON array of strings)
  narrativeSample: json("narrativeSample"),
  // The text used to generate the embedding (career description + narrative sample)
  embeddingText: text("embeddingText"),
  // Embedding vector stored as JSON array of floats (1536 dimensions for text-embedding-3-small)
  embedding: json("embedding"),
  // Whether the embedding has been generated
  embeddingReady: boolean("embeddingReady").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HistoricalClient = typeof historicalClients.$inferSelect;
export type InsertHistoricalClient = typeof historicalClients.$inferInsert;

// ─── Virtual Peter: Match Results ────────────────────────────────────────────
// Cached match results for a given client analysis.
// Regenerated when the analysis report changes.

export const parallelClientMatches = mysqlTable("parallel_client_matches", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  historicalClientId: int("historicalClientId").notNull(),
  // Cosine similarity score (0-1)
  similarityScore: text("similarityScore").notNull(),
  // Rank within this client's matches (1 = closest)
  rank: int("rank").notNull(),
  // Counsellor notes on this match
  counsellorNotes: text("counsellorNotes"),
  // LLM-generated explanation of why this historical client matches
  matchNarrative: text("match_narrative"),
  // LLM-generated conversation starter questions (JSON array of strings)
  conversationStarters: text("conversation_starters"),
  // Gender-appropriate imaginary first name for this parallel client
  personaName: varchar("persona_name", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParallelClientMatch = typeof parallelClientMatches.$inferSelect;

// ─── Chat to Peter: Conversational Sessions ──────────────────────────────────
// Each session is one conversation between the client and "Peter".
// section: which part of the profile triggered the chat ("life_history" | "career_education")
// messages: JSON array of { role: "peter"|"client", content: string, timestamp: number }
// summary: LLM-distilled insight paragraph, used as primary context in analysis report

export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  section: mysqlEnum("section", ["life_history", "career_education"]).notNull(),
  messages: text("messages").notNull().default("[]"), // JSON array
  summary: text("summary"), // distilled insight for analysis
  isComplete: boolean("isComplete").default(false).notNull(),
  uploadedDocuments: text("uploadedDocuments").default("[]"), // JSON array of {name, s3Key, extractedText}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// ─── Career Explorer Sessions ────────────────────────────────────────────────
// Each session is one open-ended career exploration conversation.
// messages: JSON array of { role: "advisor"|"client", content: string, timestamp: number }

// ─── Coaching Session Annex ─────────────────────────────────────────────────
// Counsellor uploads the coaching session transcript; the platform generates
// a reflective closing annex in the counsellor's voice. The counsellor reviews,
// edits if needed, then approves — at which point the annex is appended to the
// client's report PDF.
// status: 'draft' | 'approved'
export const coachingAnnexes = mysqlTable("coaching_annexes", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(), // one annex per client
  transcriptText: text("transcriptText"),       // raw Sybill transcript (pasted/uploaded)
  draftAnnex: text("draftAnnex"),               // LLM-generated draft
  approvedAnnex: text("approvedAnnex"),          // counsellor-approved final text
  status: mysqlEnum("status", ["draft", "approved"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});
export type CoachingAnnex = typeof coachingAnnexes.$inferSelect;
export type InsertCoachingAnnex = typeof coachingAnnexes.$inferInsert;

export const careerExplorerSessions = mysqlTable("career_explorer_sessions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  messages: text("messages").notNull(), // JSON array — set to '[]' on insert
  preferredName: varchar("preferredName", { length: 128 }), // client's preferred first name, extracted from first reply
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CareerExplorerSession = typeof careerExplorerSessions.$inferSelect;

// ─── Marketing Leads ───────────────────────────────────────────────────────
// Captures email sign-ups from the StoryBrand landing pages

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  source: varchar("source", { length: 100 }).default("lifework-landing"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Counsellor PIN Settings ───────────────────────────────────────────────
// Stores a bcrypt-hashed PIN for the counsellor dashboard gate.
// Only one row ever exists (id = 1). PIN is set by the admin owner.

export const counsellorPin = mysqlTable("counsellor_pin", {
  id: int("id").autoincrement().primaryKey(),
  pinHash: varchar("pinHash", { length: 256 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CounsellorPin = typeof counsellorPin.$inferSelect;

// ─── Report Generation Trace Logs ─────────────────────────────────────────
// One row per section per report generation run.
// Stores the full context sent to the LLM and the raw output returned.
export const reportGenerationLogs = mysqlTable("report_generation_logs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  runId: varchar("runId", { length: 64 }).notNull(),       // UUID shared across all sections in one run
  writingStyle: varchar("writingStyle", { length: 64 }).notNull().default("house"),
  reportType: varchar("reportType", { length: 64 }).notNull().default("standard"),
  sectionKey: varchar("sectionKey", { length: 64 }).notNull(), // e.g. "summary", "lifeHistoryPattern"
  sectionLabel: varchar("sectionLabel", { length: 128 }).notNull(), // human-readable label
  promptSent: text("promptSent").notNull(),                // full prompt text sent to LLM
  contextSent: text("contextSent"),                        // the client data context block
  rawOutput: text("rawOutput").notNull(),                  // raw LLM response
  houseStyleOutput: text("houseStyleOutput"),              // house-style draft (before style rewrite)
  durationMs: int("durationMs"),                           // how long the LLM call took
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReportGenerationLog = typeof reportGenerationLogs.$inferSelect;
export type InsertReportGenerationLog = typeof reportGenerationLogs.$inferInsert;

// ─── Jobs / Opportunities Module ─────────────────────────────────────────────

// The employer universe. Seeded from Maz's ~520-company list (name/domain/tier/sector).
// ATS fields populated from ats_map.csv and watchlist_extra.csv.
export const companyUniverse = mysqlTable("company_universe", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  domain: varchar("domain", { length: 256 }),
  tier: varchar("tier", { length: 64 }),        // e.g. law_firm, tech_scaleup, ftse100
  sector: varchar("sector", { length: 96 }),    // e.g. magic_circle, ai, fintech
  atsProvider: varchar("ats_provider", { length: 64 }),  // greenhouse|lever|ashby|workday|generic
  atsSlug: varchar("ats_slug", { length: 512 }),          // board token or careers URL
  careersUrl: varchar("careers_url", { length: 1024 }),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyUniverse = typeof companyUniverse.$inferSelect;
export type InsertCompanyUniverse = typeof companyUniverse.$inferInsert;

// Report-derived taste vector. Regenerated when the WOW report changes.
export const clientTargetSpec = mysqlTable("client_target_spec", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  spec: json("spec").notNull(),                 // TargetSpec (see 02-pipeline-and-prompts.md)
  reportVersion: varchar("report_version", { length: 64 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type ClientTargetSpec = typeof clientTargetSpec.$inferSelect;

// Client-stated hard limits. Company-stage fields filter monitor list + signals;
// listing-stage fields filter individual vacancies.
export const clientConstraints = mysqlTable("client_constraints", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  excludeCurrentEmployers: json("exclude_current_employers"),  // string[]
  excludeCompanies: json("exclude_companies"),                 // string[] (applied-to, no-gos)
  excludeSectors: json("exclude_sectors"),                     // string[]
  minTotalGbp: int("min_total_gbp").default(0),                // listing-stage
  permanentOnly: boolean("permanent_only").default(false),     // listing-stage
  hardExcludeLocations: json("hard_exclude_locations"),        // string[] listing-stage
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientConstraints = typeof clientConstraints.$inferSelect;

// The personalised watch-list: which universe companies to monitor for this client.
export const clientMonitorList = mysqlTable("client_monitor_list", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  companyId: int("companyId").notNull(),        // FK company_universe
  score: int("score"),                          // 1-10 fit (company scorer)
  bucketWeight: int("bucket_weight"),           // 0-3 (deterministic filter)
  reason: text("reason"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type ClientMonitorList = typeof clientMonitorList.$inferSelect;

// Source A: real vacancies fetched from monitored employers (Heartbeat), cached w/ TTL.
export const jobListings = mysqlTable("job_listings", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  externalId: varchar("external_id", { length: 256 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  location: varchar("location", { length: 256 }),
  url: varchar("url", { length: 1024 }),
  raw: json("raw"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type JobListing = typeof jobListings.$inferSelect;

// A listing scored against ONE client's target spec + constraints.
export const jobMatches = mysqlTable("job_matches", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  listingId: int("listingId").notNull(),
  score: int("score"),                          // 1-10 fit
  rationale: text("rationale"),
  constraintStatus: mysqlEnum("constraint_status", ["ok", "filtered"]).default("ok"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobMatch = typeof jobMatches.$inferSelect;

// Source B: latent (pre-posting) signals — senior departures at monitored employers.
export const latentSignals = mysqlTable("latent_signals", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  company: varchar("company", { length: 256 }),
  onMonitorList: boolean("on_monitor_list").default(false),
  event: mysqlEnum("event", ["departure", "vacancy", "appointment", "other"]),
  role: varchar("role", { length: 256 }),
  person: varchar("person", { length: 256 }),
  relevance: int("relevance"),                  // 0-3 target relevance
  headline: text("headline"),
  source: varchar("source", { length: 256 }),
  url: varchar("url", { length: 1024 }),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LatentSignal = typeof latentSignals.$inferSelect;

// What the client saved / how they are tracking it.
export const savedJobs = mysqlTable("saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  listingId: int("listingId"),                  // if from a live listing
  signalId: int("signalId"),                    // if from a latent signal
  title: varchar("title", { length: 512 }).notNull(),
  organisation: varchar("organisation", { length: 256 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["exploring", "applied", "not_for_me"]).default("exploring"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedJob = typeof savedJobs.$inferSelect;

// Records what was alerted, so a client is alerted once per opportunity.
export const jobAlerts = mysqlTable("job_alerts", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  matchId: int("matchId"),
  signalId: int("signalId"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type JobAlert = typeof jobAlerts.$inferSelect;

// Tracks async pipeline runs so the UI can poll for completion without timing out.
export const jobPipelineRuns = mysqlTable("job_pipeline_runs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  fullPipeline: boolean("fullPipeline").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "running", "done", "error"]).default("pending").notNull(),
  currentStage: int("currentStage").default(0).notNull(),
  totalStages: int("totalStages").default(2).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type JobPipelineRun = typeof jobPipelineRuns.$inferSelect;
