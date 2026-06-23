import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Users, Send, LogOut, Radio, Link2, CheckCircle2 } from "lucide-react";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import RaveParticles from "@/components/RaveParticles";
import { useSocket, ChatMessage, VideoState } from "@/hooks/useSocket";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const roomCode = code?.toUpperCase() ?? "";

  // Get username from sessionStorage
  const username = sessionStorage.getItem(`rw_username_${roomCode}`) || "Visitante";

  const [videoUrl, setVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const playerRef = useRef<VideoPlayerHandle>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch room data
  const { data: room, isLoading, error } = trpc.rooms.get.useQuery(
    { code: roomCode },
    { enabled: !!roomCode, retry: 1 }
  );

  // Initialize video URL from DB
  useEffect(() => {
    if (room?.videoUrl && !videoUrl) {
      setVideoUrl(room.videoUrl);
      setInputUrl(room.videoUrl);
    }
  }, [room]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle incoming video state from socket
  const handleVideoState = useCallback((state: VideoState) => {
    const player = playerRef.current;
    if (!player) return;

    setIsSyncing(true);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    const currentTime = player.getCurrentTime();
    const timeDiff = Math.abs(currentTime - state.currentTime);

    // Only seek if difference > 2 seconds to avoid micro-jitter
    if (timeDiff > 2) {
      player.seekTo(state.currentTime);
    }

    if (state.playing && player.isPaused()) {
      player.play();
    } else if (!state.playing && !player.isPaused()) {
      player.pause();
    }

    syncTimeoutRef.current = setTimeout(() => {
      setIsSyncing(false);
    }, 500);
  }, []);

  const handleVideoUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    setInputUrl(url);
  }, []);

  const handleChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const handleChatHistory = useCallback((msgs: ChatMessage[]) => {
    setChatMessages(msgs);
  }, []);

  const handleParticipantsUpdate = useCallback((count: number) => {
    setParticipantCount(count);
  }, []);

  const handleUserJoined = useCallback((name: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        username: "sistema",
        text: `✨ ${name} entrou na sala`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleUserLeft = useCallback((name: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        username: "sistema",
        text: `👋 ${name} saiu da sala`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const { sendVideoSync, sendVideoUrlChange, sendChatMessage } = useSocket({
    roomCode,
    username,
    onVideoState: handleVideoState,
    onVideoUrlChange: handleVideoUrlChange,
    onChatMessage: handleChatMessage,
    onChatHistory: handleChatHistory,
    onParticipantsUpdate: handleParticipantsUpdate,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });

  // Player event handlers
  const handlePlay = useCallback((currentTime: number) => {
    if (isSyncing) return;
    sendVideoSync({ playing: true, currentTime, updatedAt: Date.now() });
  }, [isSyncing, sendVideoSync]);

  const handlePause = useCallback((currentTime: number) => {
    if (isSyncing) return;
    sendVideoSync({ playing: false, currentTime, updatedAt: Date.now() });
  }, [isSyncing, sendVideoSync]);

  const handleSeek = useCallback((currentTime: number) => {
    if (isSyncing) return;
    sendVideoSync({ playing: !playerRef.current?.isPaused(), currentTime, updatedAt: Date.now() });
  }, [isSyncing, sendVideoSync]);

  const handleLoadVideo = () => {
    const url = inputUrl.trim();
    if (!url) {
      toast.error("Cole um link de vídeo válido");
      return;
    }
    sendVideoUrlChange(url);
    toast.success("Vídeo carregado para todos!");
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    sendChatMessage(text);
    setChatInput("");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCodeCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleLeave = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="rave-bg min-h-screen flex items-center justify-center">
        <RaveParticles />
        <div className="relative z-10 text-center space-y-4">
          <Radio className="w-12 h-12 mx-auto animate-spin" style={{ color: "oklch(0.65 0.28 310)" }} />
          <p className="font-display text-lg tracking-widest" style={{ color: "oklch(0.65 0.28 310)" }}>
            CARREGANDO SALA...
          </p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="rave-bg min-h-screen flex items-center justify-center">
        <RaveParticles />
        <div className="relative z-10 text-center space-y-4">
          <p className="font-display text-2xl" style={{ color: "oklch(0.70 0.28 0)" }}>
            SALA NÃO ENCONTRADA
          </p>
          <p className="text-muted-foreground">O código "{roomCode}" não existe.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rave-bg min-h-screen flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <RaveParticles />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{
          background: "oklch(0.08 0.04 280 / 0.95)",
          borderBottom: "1px solid oklch(0.65 0.28 310 / 0.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 animate-neon-pulse" style={{ color: "oklch(0.65 0.28 310)" }} />
          <span className="font-display font-bold text-sm tracking-[0.2em] hidden sm:block" style={{ color: "oklch(0.65 0.28 310)" }}>
            RAVEWATCH
          </span>
        </div>

        {/* Room code */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(0.12 0.05 310 / 0.8)",
            border: "1px solid oklch(0.65 0.28 310 / 0.4)",
          }}
        >
          <span className="font-display font-bold text-sm tracking-[0.3em]" style={{ color: "oklch(0.65 0.28 310)" }}>
            {roomCode}
          </span>
          {codeCopied ? (
            <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.80 0.18 200)" }} />
          ) : (
            <Copy className="w-4 h-4" style={{ color: "oklch(0.65 0.28 310 / 0.7)" }} />
          )}
        </button>

        {/* Participants + Leave */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "oklch(0.12 0.04 200 / 0.8)",
              border: "1px solid oklch(0.80 0.18 200 / 0.3)",
            }}
          >
            <Users className="w-4 h-4" style={{ color: "oklch(0.80 0.18 200)" }} />
            <span className="font-display text-sm font-bold" style={{ color: "oklch(0.80 0.18 200)" }}>
              {participantCount}
            </span>
          </div>
          <Button
            onClick={handleLeave}
            variant="outline"
            size="sm"
            className="h-8 font-display text-xs tracking-wider uppercase"
            style={{
              background: "oklch(0.12 0.04 0 / 0.8)",
              border: "1px solid oklch(0.70 0.28 0 / 0.4)",
              color: "oklch(0.70 0.28 0)",
            }}
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Video + URL input area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* URL input bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 shrink-0"
            style={{
              background: "oklch(0.08 0.03 280 / 0.9)",
              borderBottom: "1px solid oklch(0.20 0.05 280 / 0.5)",
            }}
          >
            <Link2 className="w-4 h-4 shrink-0" style={{ color: "oklch(0.80 0.18 200 / 0.7)" }} />
            <Input
              placeholder="Cole aqui o link do YouTube, Google Drive ou vídeo direto..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
              className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              style={{ color: "oklch(0.90 0.02 280)" }}
            />
            <Button
              onClick={handleLoadVideo}
              size="sm"
              className="h-8 shrink-0 font-display text-xs tracking-wider uppercase px-3"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                boxShadow: "0 0 12px oklch(0.65 0.28 310 / 0.3)",
              }}
            >
              Carregar
            </Button>
          </div>

          {/* Video player */}
          <div className="flex-1 overflow-hidden bg-black relative">
            <VideoPlayer
              ref={playerRef}
              videoUrl={videoUrl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              isSyncing={isSyncing}
            />
            {/* Sync indicator */}
            {isSyncing && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-display tracking-wider"
                style={{
                  background: "oklch(0.65 0.28 310 / 0.9)",
                  color: "white",
                  boxShadow: "0 0 12px oklch(0.65 0.28 310 / 0.5)",
                }}
              >
                ⚡ SINCRONIZANDO
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div
          className="w-72 xl:w-80 flex flex-col shrink-0"
          style={{
            background: "oklch(0.08 0.03 280 / 0.97)",
            borderLeft: "1px solid oklch(0.65 0.28 310 / 0.2)",
          }}
        >
          {/* Chat header */}
          <div
            className="px-4 py-3 shrink-0 flex items-center gap-2"
            style={{ borderBottom: "1px solid oklch(0.65 0.28 310 / 0.15)" }}
          >
            <div
              className="w-2 h-2 rounded-full animate-neon-pulse"
              style={{ background: "oklch(0.65 0.28 310)", boxShadow: "0 0 6px oklch(0.65 0.28 310)" }}
            />
            <span className="font-display text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "oklch(0.65 0.28 310)" }}>
              Chat ao Vivo
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-xs">Nenhuma mensagem ainda.</p>
                <p className="text-muted-foreground text-xs mt-1">Seja o primeiro a falar! 🎉</p>
              </div>
            )}
            {chatMessages.map((msg, i) => {
              const isSystem = msg.username === "sistema";
              const isMe = msg.username === username;

              if (isSystem) {
                return (
                  <div key={i} className="text-center">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: "oklch(0.80 0.18 200 / 0.8)",
                        background: "oklch(0.80 0.18 200 / 0.08)",
                      }}
                    >
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span
                    className="text-[10px] font-medium mb-0.5 px-1"
                    style={{
                      color: isMe ? "oklch(0.65 0.28 310)" : "oklch(0.70 0.28 0)",
                    }}
                  >
                    {isMe ? "Você" : msg.username}
                  </span>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words"
                    style={
                      isMe
                        ? {
                            background: "oklch(0.55 0.28 310 / 0.25)",
                            border: "1px solid oklch(0.65 0.28 310 / 0.3)",
                            color: "oklch(0.95 0.01 280)",
                            borderBottomRightRadius: "4px",
                          }
                        : {
                            background: "oklch(0.12 0.04 280)",
                            border: "1px solid oklch(0.25 0.06 280 / 0.5)",
                            color: "oklch(0.90 0.02 280)",
                            borderBottomLeftRadius: "4px",
                          }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div
            className="px-3 py-3 shrink-0"
            style={{ borderTop: "1px solid oklch(0.65 0.28 310 / 0.15)" }}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Mensagem..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="h-9 text-sm"
                style={{
                  background: "oklch(0.12 0.04 280)",
                  border: "1px solid oklch(0.65 0.28 310 / 0.25)",
                  color: "oklch(0.95 0.01 280)",
                }}
                maxLength={500}
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                  boxShadow: "0 0 10px oklch(0.65 0.28 310 / 0.3)",
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Logado como <span style={{ color: "oklch(0.65 0.28 310)" }}>{username}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
