import { eq, desc } from "drizzle-orm";
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
  cognitiveScreenerResults,
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

// ─── Family Background ────────────────────────────────────────────────────────

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

// ─── Cognitive Screener Results ───────────────────────────────────────────────

export async function getCognitiveScreenerResult(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .select()
    .from(cognitiveScreenerResults)
    .where(eq(cognitiveScreenerResults.clientId, clientId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertCognitiveScreenerResult(
  data: typeof cognitiveScreenerResults.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(cognitiveScreenerResults)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}
