import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, rooms, messages, InsertRoom, InsertMessage, youtubeIntegrations, driveIntegrations, YouTubeIntegration, DriveIntegration, InsertYouTubeIntegration, InsertDriveIntegration } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Room helpers ---

export async function createRoom(data: InsertRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(rooms).values(data);
  const result = await db.select().from(rooms).where(eq(rooms.code, data.code)).limit(1);
  return result[0];
}

export async function getRoomByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateRoomVideoUrl(code: string, videoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rooms).set({ videoUrl }).where(eq(rooms.code, code));
}

export async function updateRoomLeader(code: string, leaderName: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rooms).set({ leaderName }).where(eq(rooms.code, code));
}

// --- Message helpers ---

export async function getMessagesByRoom(roomCode: string, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(messages).where(eq(messages.roomCode, roomCode)).limit(limit);
}

export async function insertMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
}

// --- YouTube Integration helpers ---

export async function getYouTubeIntegration(userId: number): Promise<YouTubeIntegration | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(youtubeIntegrations).where(eq(youtubeIntegrations.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveYouTubeIntegration(data: InsertYouTubeIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already exists
  const existing = await getYouTubeIntegration(data.userId);
  if (existing) {
    await db.update(youtubeIntegrations).set(data).where(eq(youtubeIntegrations.userId, data.userId));
  } else {
    await db.insert(youtubeIntegrations).values(data);
  }
}

export async function deleteYouTubeIntegration(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(youtubeIntegrations).where(eq(youtubeIntegrations.userId, userId));
}

// --- Google Drive Integration helpers ---

export async function getDriveIntegration(userId: number): Promise<DriveIntegration | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(driveIntegrations).where(eq(driveIntegrations.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveDriveIntegration(data: InsertDriveIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already exists
  const existing = await getDriveIntegration(data.userId);
  if (existing) {
    await db.update(driveIntegrations).set(data).where(eq(driveIntegrations.userId, data.userId));
  } else {
    await db.insert(driveIntegrations).values(data);
  }
}

export async function deleteDriveIntegration(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(driveIntegrations).where(eq(driveIntegrations.userId, userId));
}
