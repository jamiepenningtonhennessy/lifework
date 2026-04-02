import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

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
