import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Users, Send, LogOut, Radio, Link2, CheckCircle2, Maximize2, Minimize2, MessageCircle, Smile } from "lucide-react";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import RaveParticles from "@/components/RaveParticles";
import ReactionPicker from "@/components/ReactionPicker";
import FloatingReaction from "@/components/FloatingReaction";
import TypingIndicator from "@/components/TypingIndicator";
import { useSocket, ChatMessage, VideoState, Reaction, TypingUser } from "@/hooks/useSocket";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const roomCode = code?.toUpperCase() ?? "";

  // Get username from sessionStorage
  const username = sessionStorage.getItem(`rw_username_${roomCode}`) || "Visitante";

  const [videoUrl, setVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHistoryLoaded, setChatHistoryLoaded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reactions, setReactions] = useState<Array<Reaction & { key: string }>>([])
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatInFullscreen, setShowChatInFullscreen] = useState(false);
  const [showReactionsPanel, setShowReactionsPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [leader, setLeader] = useState<string | null>(null);
  const isLeader = leader === username;

  const playerRef = useRef<VideoPlayerHandle>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionCounterRef = useRef(0);
  const lastTypingTimeRef = useRef(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch room data
  const { data: room, isLoading, error } = trpc.rooms.get.useQuery(
    { code: roomCode },
    { enabled: !!roomCode, retry: 1 }
  );

  // Socket setup
  const {
    sendVideoSync,
    sendVideoUrlChange,
    sendChatMessage,
    sendReaction: sendReactionSocket,
    sendTyping,
    sendStopTyping,
    sendTransferLeadership,
  } = useSocket({
    roomCode,
    username,
    onVideoState: (state: VideoState) => {
      if (isSyncing) return;
      handleVideoState(state);
    },
    onVideoUrlChange: (url: string) => {
      setVideoUrl(url);
    },
    onChatHistory: (msgs: ChatMessage[]) => {
      setChatMessages(msgs);
      setChatHistoryLoaded(true);
    },
    onChatMessage: (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    },
    onParticipantsUpdate: (count: number) => {
      setParticipantCount(count);
    },
    onReaction: (reaction: Reaction) => {
      const key = `${reactionCounterRef.current++}`;
      setReactions((prev) => [...prev, { ...reaction, key }]);
    },
    onTyping: (typingUser: TypingUser) => {
      setTypingUsers((prev) => {
        if (prev.includes(typingUser.username)) return prev;
        return [...prev, typingUser.username];
      });
      
      const existingTimeout = typingTimeoutRef.current.get(typingUser.username);
      if (existingTimeout) clearTimeout(existingTimeout);
      
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter(u => u !== typingUser.username));
        typingTimeoutRef.current.delete(typingUser.username);
      }, 3000);
      
      typingTimeoutRef.current.set(typingUser.username, timeout);
    },
    onLeadershipTransferred: (newLeader: string) => {
      setLeader(newLeader);
      if (newLeader === username) {
        toast.success("Voce agora eh o lider!");
      } else {
        toast.info(`${newLeader} eh agora o lider`);
      }
    },
  });

  // Initialize leader from room data
  useEffect(() => {
    if (room?.leaderName) {
      setLeader(room.leaderName);
    }
  }, [room?.leaderName]);

  // Initialize video URL from room
  useEffect(() => {
    if (room?.videoUrl) {
      setVideoUrl(room.videoUrl);
    }
  }, [room?.videoUrl]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, typingUsers]);

  // Handle video state sync
  const handleVideoState = useCallback((state: VideoState) => {
    if (!playerRef.current) return;
    
    const timeDiff = Math.abs((playerRef.current.getCurrentTime?.() || 0) - state.currentTime);
    
    // Only sync if time difference is significant (>1 second)
    if (timeDiff > 1) {
      playerRef.current.seekTo?.(state.currentTime);
    }
    
    const isPlaying = !playerRef.current.isPaused?.();
    if (isPlaying !== state.playing) {
      if (state.playing) {
        playerRef.current.play?.();
      } else {
        playerRef.current.pause?.();
      }
    }
  }, []);

  // Leader-only controls
  const handlePlay = useCallback(() => {
    if (!isLeader) {
      toast.error("Apenas o lider pode controlar o video");
      return;
    }
    const currentTime = playerRef.current?.getCurrentTime?.() || 0;
    sendVideoSync({ playing: true, currentTime, updatedAt: Date.now() });
  }, [isLeader, sendVideoSync]);

  const handlePause = useCallback(() => {
    if (!isLeader) {
      toast.error("Apenas o lider pode controlar o video");
      return;
    }
    const currentTime = playerRef.current?.getCurrentTime?.() || 0;
    sendVideoSync({ playing: false, currentTime, updatedAt: Date.now() });
  }, [isLeader, sendVideoSync]);

  const handleSeek = useCallback((time: number) => {
    if (!isLeader) {
      toast.error("Apenas o lider pode controlar o video");
      return;
    }
    sendVideoSync({ playing: !playerRef.current?.isPaused?.(), currentTime: time, updatedAt: Date.now() });
  }, [isLeader, sendVideoSync]);

  // Load video (leader only)
  const handleLoadVideo = async () => {
    if (!isLeader) {
      toast.error("Apenas o lider pode carregar videos");
      return;
    }

    if (!inputUrl.trim()) {
      toast.error("Cole um link de video valido");
      return;
    }

    const url = inputUrl.trim();

    // Check if URL needs extraction (tokyvideo, animesonline, etc)
    if (url.includes("tokyvideo.com") || url.includes("animesonlinecc.to") || url.includes("animesonline")) {
      const toastId = toast.loading("Extraindo video...");
      try {
        // Call tRPC query correctly
        const input = { url };
        const response = await fetch(
          `/api/trpc/rooms.extractVideo?input=${encodeURIComponent(JSON.stringify(input))}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || "Erro ao extrair video");
        }
        
        const videoUrl = data.result?.data?.videoUrl;
        if (!videoUrl) {
          throw new Error("URL de video nao encontrada na resposta");
        }
        
        sendVideoUrlChange(videoUrl);
        setInputUrl("");
        toast.success("Video extraido e carregado para todos!", { id: toastId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(
          `Este site nao eh suportado para sincronizacao. Copie o link direto do video (geralmente tem um botao 'Copiar' ou 'Download') e cole aqui. Ou use YouTube/Google Drive.`,
          { id: toastId, duration: 5000 }
        );
        console.error("[VideoExtraction]", error);
      }
    } else {
      sendVideoUrlChange(url);
      setInputUrl("");
      toast.success("Video carregado para todos!");
    }
  };

  // Chat handlers
  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
    sendStopTyping();
  }, [chatInput, sendChatMessage, sendStopTyping]);

  const handleChatInputChange = useCallback((text: string) => {
    setChatInput(text);
    
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 300) {
      sendTyping();
      lastTypingTimeRef.current = now;
    }
  }, [sendTyping]);

  // Get typing users array for rendering
  const typingUsersArray = typingUsers;

  // Normalize and send reaction
  const handleReaction = useCallback((emoji: string, x: number, y: number) => {
    if (playerContainerRef.current) {
      const rect = playerContainerRef.current.getBoundingClientRect();
      const normalizedX = Math.max(0, Math.min(x - rect.left, rect.width));
      const normalizedY = Math.max(0, Math.min(y - rect.top, rect.height));
      sendReactionSocket(emoji, normalizedX, normalizedY);
    } else {
      sendReactionSocket(emoji, x, y);
    }
  }, [sendReactionSocket])

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

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        setShowChatInFullscreen(false);
        setShowReactionsPanel(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [])

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
            MITZ WATCH
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

        {/* Participants + Leader + Leave */}
        <div className="flex items-center gap-3">
          {leader && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: "oklch(0.65 0.28 310 / 0.15)",
                border: "1px solid oklch(0.65 0.28 310 / 0.4)",
              }}
            >
              <span style={{ color: "oklch(0.65 0.28 310)" }}>
                {isLeader ? "👑 Voce e o lider" : `👑 Lider: ${leader}`}
              </span>
            </div>
          )}
          {isLeader && (
            <Button
              onClick={() => {
                const newLeader = prompt("Nome do novo lider:");
                if (newLeader) {
                  sendTransferLeadership(newLeader);
                  toast.success(`Lideranca transferida para ${newLeader}`);
                }
              }}
              size="sm"
              className="h-8 font-display text-xs tracking-wider uppercase"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                boxShadow: "0 0 12px oklch(0.65 0.28 310 / 0.3)",
              }}
            >
              Transferir
            </Button>
          )}
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

      {/* Main layout - NOVO: Player em cima, chat embaixo */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        {/* Video player section */}
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
              placeholder={isLeader ? "Cole aqui o link do YouTube, Google Drive ou vídeo direto..." : "Apenas o lider pode carregar videos..."}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
              disabled={!isLeader}
              className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 disabled:opacity-50"
              style={{ color: "oklch(0.90 0.02 280)" }}
            />
            <Button
              onClick={handleLoadVideo}
              disabled={!isLeader}
              size="sm"
              className="h-8 shrink-0 font-display text-xs tracking-wider uppercase px-3 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                boxShadow: "0 0 12px oklch(0.65 0.28 310 / 0.3)",
              }}
            >
              Carregar
            </Button>
          </div>

          {/* Video player */}
          <div ref={playerContainerRef} className="flex-1 overflow-hidden bg-black relative">
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
            {/* Fullscreen + Reaction picker */}
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="h-9 w-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: "oklch(0.12 0.04 280)",
                  border: "1px solid oklch(0.65 0.28 310 / 0.3)",
                  color: "oklch(0.65 0.28 310)",
                }}
                title="Tela cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <ReactionPicker onReact={handleReaction} />
            </div>
            {/* Floating reactions */}
            {reactions.map((reaction) => (
              <FloatingReaction
                key={reaction.key}
                emoji={reaction.emoji}
                x={reaction.x}
                y={reaction.y}
                username={reaction.username}
                onComplete={() => {
                  setReactions((prev) => prev.filter((r) => r.key !== reaction.key));
                }}
              />
            ))}
          </div>
        </div>

        {/* Chat section - NOVO: Embaixo do player */}
        <div
          className="h-48 flex flex-col shrink-0 overflow-hidden"
          style={{
            background: "oklch(0.08 0.03 280 / 0.97)",
            borderTop: "1px solid oklch(0.65 0.28 310 / 0.2)",
          }}
        >
          {/* Chat header */}
          <div
            className="px-4 py-2 shrink-0 flex items-center gap-2"
            style={{ borderBottom: "1px solid oklch(0.65 0.28 310 / 0.15)" }}
          >
            <div
              className="w-2 h-2 rounded-full animate-neon-pulse"
              style={{ background: "oklch(0.65 0.28 310)", boxShadow: "0 0 6px oklch(0.65 0.28 310)" }}
            />
            <span className="font-display text-xs tracking-widest" style={{ color: "oklch(0.65 0.28 310)" }}>
              CHAT AO VIVO
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-xs">
            {chatMessages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-xs">Nenhuma mensagem ainda.</p>
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
                    className="text-[9px] font-medium mb-0.5 px-1"
                    style={{
                      color: isMe ? "oklch(0.65 0.28 310)" : "oklch(0.70 0.28 0)",
                    }}
                  >
                    {isMe ? "Você" : msg.username}
                  </span>
                  <div
                    className="max-w-[85%] px-2 py-1 rounded-lg text-xs break-words"
                    style={
                      isMe
                        ? {
                            background: "oklch(0.55 0.28 310 / 0.25)",
                            border: "1px solid oklch(0.65 0.28 310 / 0.3)",
                            color: "oklch(0.95 0.01 280)",
                            borderBottomRightRadius: "2px",
                          }
                        : {
                            background: "oklch(0.12 0.04 280)",
                            border: "1px solid oklch(0.25 0.06 280 / 0.5)",
                            color: "oklch(0.90 0.02 280)",
                            borderBottomLeftRadius: "2px",
                          }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {/* Typing indicators */}
            {typingUsersArray.map((typingUsername) => (
              <TypingIndicator key={`typing-${typingUsername}`} username={typingUsername} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div
            className="px-3 py-2 shrink-0"
            style={{ borderTop: "1px solid oklch(0.65 0.28 310 / 0.15)" }}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Msg..."
                value={chatInput}
                onChange={(e) => handleChatInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="h-7 text-xs"
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
                className="h-7 w-7 p-0 shrink-0"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                  boxShadow: "0 0 10px oklch(0.65 0.28 310 / 0.3)",
                }}
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
