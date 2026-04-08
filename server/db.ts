import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clientProfiles,
  achievements,
  familyBackground,
  educationHistory,
  careerHistory,
  viaResults,
  interviewMessages,
  analysisReports,
  ipipResults,
  historicalClients,
  parallelClientMatches,
  chatSessions,
  careerExplorerSessions,
  coachingAnnexes,
  type HistoricalClient,
  type InsertHistoricalClient,
  type ChatSession,
  type CareerExplorerSession,
  type CoachingAnnex,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? null;
}

// ─── Client Profiles ─────────────────────────────────────────────────────────

export async function getOrCreateClientProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(clientProfiles).values({ userId });
  const created = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, userId))
    .limit(1);
  return created[0]!;
}

export async function getClientProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getClientProfileById(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.id, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function updateClientProfile(
  clientId: number,
  data: Partial<typeof clientProfiles.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clientProfiles).set(data).where(eq(clientProfiles.id, clientId));
}

export async function getAllClientProfiles() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select({
      profile: clientProfiles,
      user: { name: users.name, email: users.email },
    })
    .from(clientProfiles)
    .leftJoin(users, eq(clientProfiles.userId, users.id))
    .orderBy(desc(clientProfiles.updatedAt));
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function getAchievements(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(achievements)
    .where(eq(achievements.clientId, clientId))
    .orderBy(achievements.sortOrder, achievements.createdAt);
}

export async function upsertAchievement(
  data: typeof achievements.$inferInsert & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(achievements).set(data).where(eq(achievements.id, data.id));
    return data.id;
  }
  const result = await db.insert(achievements).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function deleteAchievement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(achievements).where(eq(achievements.id, id));
}

export async function updateAchievementSageEnrichment(
  id: number,
  sageEnrichment: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(achievements)
    .set({ sageEnrichment })
    .where(eq(achievements.id, id));
}

//// Counsellor can edit any field on an achievement record (premium service)
export async function updateAchievementCounsellor(
  id: number,
  fields: {
    title?: string;
    description?: string | null;
    age?: number | null;
    esf?: "enjoyable" | "satisfying" | "fulfilling" | null;
    sageEnrichment?: string | null;
    counsellorNotes?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(achievements)
    .set(fields)
    .where(eq(achievements.id, id));
}

// ─── Family Background ─────────────────────────────────────────────────────

export async function getFamilyBackground(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(familyBackground)
    .where(eq(familyBackground.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}
export async function upsertFamilyBackground(
  data: typeof familyBackground.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(familyBackground)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}

// ─── Education History ────────────────────────────────────────────────────────

export async function getEducationHistory(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(educationHistory)
    .where(eq(educationHistory.clientId, clientId))
    .orderBy(educationHistory.sortOrder, educationHistory.createdAt);
}

export async function upsertEducation(
  data: typeof educationHistory.$inferInsert & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(educationHistory).set(data).where(eq(educationHistory.id, data.id));
    return data.id;
  }
  const result = await db.insert(educationHistory).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function deleteEducation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(educationHistory).where(eq(educationHistory.id, id));
}

// ─── Career History ───────────────────────────────────────────────────────────

export async function getCareerHistory(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(careerHistory)
    .where(eq(careerHistory.clientId, clientId))
    .orderBy(careerHistory.sortOrder, careerHistory.createdAt);
}

export async function upsertCareer(
  data: typeof careerHistory.$inferInsert & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(careerHistory).set(data).where(eq(careerHistory.id, data.id));
    return data.id;
  }
  const result = await db.insert(careerHistory).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function deleteCareer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(careerHistory).where(eq(careerHistory.id, id));
}

// ─── VIA Results ─────────────────────────────────────────────────────────────

export async function getViaResults(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(viaResults)
    .where(eq(viaResults.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertViaResults(
  data: typeof viaResults.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(viaResults).values(data).onDuplicateKeyUpdate({ set: data });
}

// ─── Interview Messages ───────────────────────────────────────────────────────

export async function getInterviewMessages(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.clientId, clientId))
    .orderBy(interviewMessages.createdAt);
}

export async function addInterviewMessage(
  data: typeof interviewMessages.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(interviewMessages).values(data);
}

// ─── IPIP Results ──────────────────────────────────────────────────────────────

export async function getIpipResults(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(ipipResults)
    .where(eq(ipipResults.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertIpipResults(
  data: typeof ipipResults.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ipipResults).values(data).onDuplicateKeyUpdate({ set: data });
}

// ─── Analysis Reports ─────────────────────────────────────────────────────────

export async function getAnalysisReport(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(analysisReports)
    .where(eq(analysisReports.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertAnalysisReport(
  data: typeof analysisReports.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(analysisReports)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}

/** Store (or overwrite) the canonical Stage 1 Dependable Strengths output for a client. */
export async function updateCanonicalStage1(clientId: number, stage1Text: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = Date.now();
  await db
    .insert(analysisReports)
    .values({ clientId, canonicalStage1: stage1Text, canonicalStage1GeneratedAt: now, generatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { canonicalStage1: stage1Text, canonicalStage1GeneratedAt: now } });
}

// ─── Virtual Peter: Historical Clients ───────────────────────────────────────

export async function getAllHistoricalClients(): Promise<HistoricalClient[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(historicalClients)
    .where(eq(historicalClients.embeddingReady, true));
}

export async function getHistoricalClientById(id: number): Promise<HistoricalClient | null> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(historicalClients)
    .where(eq(historicalClients.id, id))
    .limit(1);
  return result[0] ?? null;
}

// ─── Virtual Peter: Parallel Client Matches ───────────────────────────────────

export async function getParallelMatches(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const matches = await db
    .select()
    .from(parallelClientMatches)
    .where(eq(parallelClientMatches.clientId, clientId))
    .orderBy(parallelClientMatches.rank);

  // Hydrate with historical client data
  const hydrated = await Promise.all(
    matches.map(async (m) => {
      const hc = await getHistoricalClientById(m.historicalClientId);
      return { ...m, historicalClient: hc };
    })
  );
  return hydrated;
}

export async function saveParallelMatches(
  clientId: number,
  matches: Array<{
    historicalClientId: number;
    similarityScore: string;
    rank: number;
    matchNarrative?: string;
    conversationStarters?: string;
    personaName?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Delete existing matches for this client
  await db
    .delete(parallelClientMatches)
    .where(eq(parallelClientMatches.clientId, clientId));

  // Insert new matches
  if (matches.length > 0) {
    await db.insert(parallelClientMatches).values(
      matches.map((m) => ({ ...m, clientId }))
    );
  }
}

export async function updateMatchNotes(matchId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(parallelClientMatches)
    .set({ counsellorNotes: notes })
    .where(eq(parallelClientMatches.id, matchId));
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "peter" | "client";
  content: string;
  timestamp: number;
};

export async function getOrCreateChatSession(
  clientId: number,
  section: "life_history" | "career_education"
): Promise<ChatSession> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Return the most recent incomplete session for this client+section, or create one
  const existing = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.clientId, clientId),
        eq(chatSessions.section, section)
      )
    )
    .orderBy(desc(chatSessions.createdAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Create new session
  const result = await db.insert(chatSessions).values({
    clientId,
    section,
    messages: "[]",
  });
  const [newSession] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, (result as any).insertId))
    .limit(1);
  return newSession;
}

export async function appendChatMessage(
  sessionId: number,
  message: ChatMessage
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);
  if (!session) throw new Error("Session not found");

  const messages: ChatMessage[] = JSON.parse(session.messages || "[]");
  messages.push(message);

  await db
    .update(chatSessions)
    .set({ messages: JSON.stringify(messages) })
    .where(eq(chatSessions.id, sessionId));
}

export async function saveChatSummary(
  sessionId: number,
  summary: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(chatSessions)
    .set({ summary, isComplete: true })
    .where(eq(chatSessions.id, sessionId));
}

export async function getChatSessionsByClient(
  clientId: number
): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.clientId, clientId))
    .orderBy(desc(chatSessions.createdAt));
}

export async function getChatSessionById(
  sessionId: number
): Promise<ChatSession | null> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);
  return session ?? null;
}

export async function resetChatSession(
  clientId: number,
  section: "life_history" | "career_education"
): Promise<ChatSession> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Delete existing sessions for this client+section
  await db
    .delete(chatSessions)
    .where(
      and(
        eq(chatSessions.clientId, clientId),
        eq(chatSessions.section, section)
      )
    );

  // Create fresh session
  const result = await db.insert(chatSessions).values({
    clientId,
    section,
    messages: "[]",
  });
  const [newSession] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, (result as any).insertId))
    .limit(1);
  return newSession;
}

// ─── Career Explorer Sessions ────────────────────────────────────────────────

export type CareerExplorerMessage = {
  role: "advisor" | "client";
  content: string;
  timestamp: number;
};

export async function getOrCreateCareerExplorerSession(
  clientId: number
): Promise<CareerExplorerSession> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db
    .select()
    .from(careerExplorerSessions)
    .where(eq(careerExplorerSessions.clientId, clientId))
    .orderBy(desc(careerExplorerSessions.createdAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const result = await db.insert(careerExplorerSessions).values({
    clientId,
    messages: "[]", // always initialise to empty array string
  });
  const [newSession] = await db
    .select()
    .from(careerExplorerSessions)
    .where(eq(careerExplorerSessions.id, (result as any).insertId))
    .limit(1);
  return newSession;
}

export async function getCareerExplorerSession(
  clientId: number
): Promise<CareerExplorerSession | null> {
  const db = await getDb();
  if (!db) return null;
  const [session] = await db
    .select()
    .from(careerExplorerSessions)
    .where(eq(careerExplorerSessions.clientId, clientId))
    .orderBy(desc(careerExplorerSessions.createdAt))
    .limit(1);
  return session ?? null;
}

export async function appendCareerExplorerMessage(
  sessionId: number,
  message: CareerExplorerMessage
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [session] = await db
    .select()
    .from(careerExplorerSessions)
    .where(eq(careerExplorerSessions.id, sessionId))
    .limit(1);
  if (!session) throw new Error("Session not found");

  const messages: CareerExplorerMessage[] = JSON.parse(session.messages ?? "[]");
  messages.push(message);

  await db
    .update(careerExplorerSessions)
    .set({ messages: JSON.stringify(messages) })
    .where(eq(careerExplorerSessions.id, sessionId));
}

export async function clearCareerExplorerSession(
  clientId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(careerExplorerSessions)
    .where(eq(careerExplorerSessions.clientId, clientId));
}

// ─── Coaching Annex ───────────────────────────────────────────────────────────

export async function getCoachingAnnex(clientId: number): Promise<CoachingAnnex | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(coachingAnnexes)
    .where(eq(coachingAnnexes.clientId, clientId))
    .limit(1);
  return row ?? null;
}

export async function upsertCoachingAnnex(data: {
  clientId: number;
  transcriptText?: string;
  draftAnnex?: string;
  approvedAnnex?: string;
  status?: "draft" | "approved";
  approvedAt?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getCoachingAnnex(data.clientId);
  if (existing) {
    await db
      .update(coachingAnnexes)
      .set({
        ...(data.transcriptText !== undefined && { transcriptText: data.transcriptText }),
        ...(data.draftAnnex !== undefined && { draftAnnex: data.draftAnnex }),
        ...(data.approvedAnnex !== undefined && { approvedAnnex: data.approvedAnnex }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.approvedAt !== undefined && { approvedAt: data.approvedAt }),
      })
      .where(eq(coachingAnnexes.clientId, data.clientId));
  } else {
    await db.insert(coachingAnnexes).values({
      clientId: data.clientId,
      transcriptText: data.transcriptText ?? null,
      draftAnnex: data.draftAnnex ?? null,
      approvedAnnex: data.approvedAnnex ?? null,
      status: data.status ?? "draft",
      approvedAt: data.approvedAt ?? null,
    });
  }
}
