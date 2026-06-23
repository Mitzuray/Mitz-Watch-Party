import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface ChatMessage {
  username: string;
  text: string;
  createdAt: string;
}

export interface VideoState {
  playing: boolean;
  currentTime: number;
  updatedAt: number;
}

interface UseSocketOptions {
  roomCode: string;
  username: string;
  onVideoState?: (state: VideoState) => void;
  onVideoUrlChange?: (videoUrl: string) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onChatHistory?: (msgs: ChatMessage[]) => void;
  onParticipantsUpdate?: (count: number) => void;
  onUserJoined?: (username: string) => void;
  onUserLeft?: (username: string) => void;
}

export function useSocket({
  roomCode,
  username,
  onVideoState,
  onVideoUrlChange,
  onChatMessage,
  onChatHistory,
  onParticipantsUpdate,
  onUserJoined,
  onUserLeft,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomCode || !username) return;

    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { roomCode, username });
    });

    socket.on("video-state", (state: VideoState) => {
      onVideoState?.(state);
    });

    socket.on("video-url-change", ({ videoUrl }: { videoUrl: string }) => {
      onVideoUrlChange?.(videoUrl);
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      onChatMessage?.(msg);
    });

    socket.on("chat-history", (msgs: Array<{ username: string; text: string; createdAt: string | Date }>) => {
      const normalized: ChatMessage[] = msgs.map(m => ({
        username: m.username,
        text: m.text,
        createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString(),
      }));
      onChatHistory?.(normalized);
    });

    socket.on("participants-update", ({ count }: { count: number }) => {
      onParticipantsUpdate?.(count);
    });

    socket.on("user-joined", ({ username: u }: { username: string }) => {
      onUserJoined?.(u);
    });

    socket.on("user-left", ({ username: u }: { username: string }) => {
      onUserLeft?.(u);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, username]);

  const sendVideoSync = useCallback((state: VideoState) => {
    socketRef.current?.emit("video-sync", { roomCode, state });
  }, [roomCode]);

  const sendVideoUrlChange = useCallback((videoUrl: string) => {
    socketRef.current?.emit("video-url-change", { roomCode, videoUrl });
  }, [roomCode]);

  const sendChatMessage = useCallback((text: string) => {
    socketRef.current?.emit("chat-message", { roomCode, username, text });
  }, [roomCode, username]);

  return { sendVideoSync, sendVideoUrlChange, sendChatMessage };
}
