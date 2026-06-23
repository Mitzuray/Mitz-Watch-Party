import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getDb } from "./db";
import { messages, rooms } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface VideoState {
  playing: boolean;
  currentTime: number;
  updatedAt: number;
}

// In-memory state for rooms (participants + video state)
const roomParticipants: Map<string, Set<string>> = new Map();
const roomVideoState: Map<string, VideoState> = new Map();

export function setupSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let currentUsername: string | null = null;

    // Join a room
    socket.on("join-room", async ({ roomCode, username }: { roomCode: string; username: string }) => {
      currentRoom = roomCode;
      currentUsername = username;

      socket.join(roomCode);

      // Track participants
      if (!roomParticipants.has(roomCode)) {
        roomParticipants.set(roomCode, new Set());
      }
      roomParticipants.get(roomCode)!.add(socket.id);

      const participantCount = roomParticipants.get(roomCode)!.size;

      // Send current video state to the joining user
      const videoState = roomVideoState.get(roomCode);
      if (videoState) {
        socket.emit("video-state", videoState);
      }

      // Send current video URL from DB
      try {
        const db = await getDb();
        if (db) {
          const roomRows = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
          if (roomRows.length > 0 && roomRows[0].videoUrl) {
            socket.emit("video-url-change", { videoUrl: roomRows[0].videoUrl });
          }

          // Send last 50 messages
          const recentMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.roomCode, roomCode))
            .limit(50);
          socket.emit("chat-history", recentMessages);
        }
      } catch (err) {
        console.error("[Socket] Error fetching room data:", err);
      }

      // Notify all in room about participant count
      io.to(roomCode).emit("participants-update", { count: participantCount });

      // Notify others that someone joined
      socket.to(roomCode).emit("user-joined", { username });
    });

    // Video sync: play/pause/seek
    socket.on("video-sync", ({ roomCode, state }: { roomCode: string; state: VideoState }) => {
      roomVideoState.set(roomCode, { ...state, updatedAt: Date.now() });
      // Broadcast to everyone else in the room
      socket.to(roomCode).emit("video-state", state);
    });

    // Change video URL
    socket.on("video-url-change", async ({ roomCode, videoUrl }: { roomCode: string; videoUrl: string }) => {
      // Reset video state
      roomVideoState.set(roomCode, { playing: false, currentTime: 0, updatedAt: Date.now() });

      // Persist to DB
      try {
        const db = await getDb();
        if (db) {
          await db.update(rooms).set({ videoUrl }).where(eq(rooms.code, roomCode));
        }
      } catch (err) {
        console.error("[Socket] Error updating video URL:", err);
      }

      // Broadcast to everyone in the room (including sender)
      io.to(roomCode).emit("video-url-change", { videoUrl });
      io.to(roomCode).emit("video-state", { playing: false, currentTime: 0, updatedAt: Date.now() });
    });

    // Chat message
    socket.on("chat-message", async ({ roomCode, username, text }: { roomCode: string; username: string; text: string }) => {
      const createdAt = new Date();

      // Persist to DB
      try {
        const db = await getDb();
        if (db) {
          await db.insert(messages).values({ roomCode, username, text, createdAt });
        }
      } catch (err) {
        console.error("[Socket] Error saving message:", err);
      }

      const msg = { username, text, createdAt: createdAt.toISOString() };
      // Broadcast to everyone in the room (including sender)
      io.to(roomCode).emit("chat-message", msg);
    });

    // Disconnect
    socket.on("disconnect", () => {
      if (currentRoom) {
        const participants = roomParticipants.get(currentRoom);
        if (participants) {
          participants.delete(socket.id);
          const count = participants.size;

          io.to(currentRoom).emit("participants-update", { count });

          if (currentUsername) {
            socket.to(currentRoom).emit("user-left", { username: currentUsername });
          }

          // Clean up empty rooms from memory
          if (count === 0) {
            roomParticipants.delete(currentRoom);
            roomVideoState.delete(currentRoom);
          }
        }
      }
    });
  });

  return io;
}
