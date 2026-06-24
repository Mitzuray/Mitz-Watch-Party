import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Users, Send, LogOut, Radio, Link2, CheckCircle2, MessageCircle, Smile } from "lucide-react";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import RaveParticles from "@/components/RaveParticles";
// import ReactionPicker from "@/components/ReactionPicker"; // Removed - reactions only on chat messages
// import FloatingReaction from "@/components/FloatingReaction"; // Removed - reactions on messages
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
  // Reactions now appear on chat messages only, not floating
  // const [isFullscreen, setIsFullscreen] = useState(false); // Removed
  // Fullscreen and reactions panel removed
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [leader, setLeader] = useState<string | null>(null);
  const isLeader = leader === username;

  const playerRef = useRef<VideoPlayerHandle>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reaction counter removed - reactions now on messages only
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
    onReaction: () => {
      // Reactions now handled in chat messages, not floating
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
  const utils = trpc.useUtils();

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

    // Check if URL is Google Drive
    if (url.includes("drive.google.com")) {
      const toastId = toast.loading("Extraindo video do Google Drive...");
      try {
        // Call the tRPC query directly using utils.fetch
        const result = await utils.rooms.extractGoogleDriveVideo.fetch({ url });
        
        const videoUrl = result?.videoUrl;
        if (!videoUrl) {
          throw new Error("URL de video nao encontrada na resposta");
        }
        
        sendVideoUrlChange(videoUrl);
        setInputUrl("");
        toast.success("Video do Drive extraido e carregado para todos!", { id: toastId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(
          `Erro ao extrair video do Google Drive: ${errorMsg}. Verifique se o arquivo eh um video e se esta compartilhado publicamente.`,
          { id: toastId, duration: 5000 }
        );
        console.error("[GoogleDriveExtraction]", error);
      }
    }
    // Check if URL needs extraction (tokyvideo, animesonline, etc)
    else if (url.includes("tokyvideo.com") || url.includes("animesonlinecc.to") || url.includes("animesonline")) {
      const toastId = toast.loading("Extraindo video...");
      try {
        // Call the tRPC query directly using utils.fetch
        const result = await utils.rooms.extractVideo.fetch({ url });
        
        const videoUrl = result?.videoUrl;
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

  const handleTransferLeadership = () => {
    const newLeader = prompt("Digite o nome do novo lider:");
    if (newLeader && newLeader.trim()) {
      sendTransferLeadership(newLeader.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎬</div>
          <p className="text-muted-foreground">Carregando sala...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="text-5xl">❌</div>
          <p className="text-red-500">Sala nao encontrada</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-black text-foreground overflow-hidden">
      <RaveParticles />
      
      {/* Header */}
      <div className="relative z-10 border-b border-purple-500/30 bg-black/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Radio className="w-5 h-5 text-pink-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 truncate">
                MITZ WATCH
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Sala: {roomCode}
              </p>
            </div>
          </div>

          {/* Leader indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">👑</span>
            <span className="text-cyan-400 font-mono truncate max-w-[150px]">{leader}</span>
          </div>

          {/* Participants count */}
          <div className="flex items-center gap-1 text-xs">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-mono">{participantCount}</span>
          </div>

          {/* Copy code button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(roomCode);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }}
            className="gap-1 text-xs"
          >
            <Copy className="w-3 h-3" />
            {codeCopied ? "Copiado!" : "Copiar"}
          </Button>

          {/* Transfer leadership button */}
          {isLeader && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTransferLeadership}
              className="gap-1 text-xs"
            >
              <Radio className="w-3 h-3" />
              Transferir
            </Button>
          )}

          {/* Leave button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-1 text-xs text-red-500 hover:text-red-400"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 p-3 min-h-0 overflow-hidden">
        {/* Video player */}
        <div ref={playerContainerRef} className="flex-1 min-h-0 rounded-lg overflow-hidden bg-black/40 border border-purple-500/20">
          <VideoPlayer
            ref={playerRef}
            videoUrl={videoUrl}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            isSyncing={isSyncing}
          />
        </div>

        {/* Video URL input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Cole um link de YouTube, Google Drive ou URL de video..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
            disabled={!isLeader}
            className="text-xs"
          />
          <Button
            onClick={handleLoadVideo}
            disabled={!isLeader}
            size="sm"
            className="gap-1 whitespace-nowrap"
          >
            <Link2 className="w-3 h-3" />
            Carregar
          </Button>
        </div>
      </div>

      {/* Chat panel */}
      <div className="relative z-10 border-t border-purple-500/30 bg-black/80 backdrop-blur-sm h-48 flex flex-col gap-2 p-3">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-2 text-xs">
          {!chatHistoryLoaded && (
            <div className="text-center text-muted-foreground py-2">Carregando chat...</div>
          )}
          {chatMessages.map((msg, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-cyan-400 flex-shrink-0">{msg.username}</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-foreground break-words">{msg.text}</div>

            </div>
          ))}
          {typingUsers.map((user) => (
            <TypingIndicator key={user} username={user} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Digite uma mensagem..."
            value={chatInput}
            onChange={(e) => handleChatInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="text-xs"
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="gap-1 whitespace-nowrap"
          >
            <Send className="w-3 h-3" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
