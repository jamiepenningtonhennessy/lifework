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
  analysisStatus: mysqlEnum("analysisStatus", [
    "not_started",
    "in_progress",
    "completed",
  ])
    .default("not_started")
    .notNull(),
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
  description: text("description"),
  esf: mysqlEnum("esf", ["enjoyable", "satisfying", "fulfilling"]),
  skills: text("skills"), // comma-separated or short text
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
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalysisReport = typeof analysisReports.$inferSelect;
