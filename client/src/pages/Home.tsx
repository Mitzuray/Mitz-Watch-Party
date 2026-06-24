import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tv2, Users, Zap, Radio, LogOut, Settings } from "lucide-react";
import RaveParticles from "@/components/RaveParticles";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [hostName, setHostName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const createRoom = trpc.rooms.create.useMutation({
    onSuccess: (room) => {
      const username = hostName.trim() || "Host";
      sessionStorage.setItem(`rw_username_${room.code}`, username);
      navigate(`/room/${room.code}`);
    },
    onError: (err) => {
      toast.error("Erro ao criar sala: " + err.message);
    },
  });

  const handleCreate = () => {
    if (!hostName.trim()) {
      toast.error("Digite seu nome para criar a sala");
      return;
    }
    createRoom.mutate({ hostName: hostName.trim() });
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || code.length !== 6) {
      toast.error("Digite um código de sala válido (6 caracteres)");
      return;
    }
    if (!name) {
      toast.error("Digite seu nome para entrar na sala");
      return;
    }
    sessionStorage.setItem(`rw_username_${code}`, name);
    navigate(`/room/${code}`);
  };

  return (
    <div className="rave-bg min-h-screen relative flex flex-col overflow-hidden">
      <RaveParticles />

      {/* Header */}
      {isAuthenticated && (
        <div className="relative z-20 border-b border-purple-500/30 bg-black/80 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-pink-500" />
              <span className="font-display text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                MITZ WATCH
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">👤 {user?.name || user?.email || "Usuário"}</span>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-xs">Integrações</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ambient glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.28 310 / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.80 0.18 200 / 0.10) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.70 0.28 0 / 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-2xl w-full">
        {/* Logo */}
        <div className="mb-2 flex items-center gap-3">
          <Radio className="w-8 h-8 text-[oklch(0.65_0.28_310)] animate-neon-pulse" />
          <span
            className="font-display text-lg font-bold tracking-[0.3em] uppercase"
            style={{ color: "oklch(0.65 0.28 310 / 0.8)" }}
          >
            MITZ WATCH
          </span>
          <Radio className="w-8 h-8 text-[oklch(0.65_0.28_310)] animate-neon-pulse" />
        </div>

        {/* Title */}
        <h1
          className="font-display font-black text-5xl md:text-7xl leading-none mb-3 tracking-tight"
          style={{
            background: "linear-gradient(135deg, oklch(0.65 0.28 310), oklch(0.70 0.28 0), oklch(0.80 0.18 200))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px oklch(0.65 0.28 310 / 0.5))",
          }}
        >
          MITZ WATCH
        </h1>

        <p className="text-muted-foreground text-lg mb-10 max-w-md">
          Assista filmes, animes e vídeos em sincronia com quem você ama.
          <span className="text-[oklch(0.80_0.18_200)]"> Tempo real, zero delay.</span>
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: <Tv2 className="w-4 h-4" />, label: "YouTube & Drive", color: "oklch(0.65 0.28 310)" },
            { icon: <Zap className="w-4 h-4" />, label: "Sync em tempo real", color: "oklch(0.70 0.28 0)" },
            { icon: <Users className="w-4 h-4" />, label: "Chat ao vivo", color: "oklch(0.80 0.18 200)" },
          ].map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: `${feat.color.replace(")", " / 0.1)")}`,
                border: `1px solid ${feat.color.replace(")", " / 0.3)")}`,
                color: feat.color,
              }}
            >
              {feat.icon}
              {feat.label}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button
            onClick={() => setShowCreate(true)}
            className="flex-1 h-14 font-display font-bold text-base tracking-wider uppercase relative overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
              boxShadow: "0 0 20px oklch(0.65 0.28 310 / 0.4), 0 0 60px oklch(0.65 0.28 310 / 0.2)",
              border: "1px solid oklch(0.65 0.28 310 / 0.5)",
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Criar Sala
            </span>
          </Button>

          <Button
            onClick={() => setShowJoin(true)}
            variant="outline"
            className="flex-1 h-14 font-display font-bold text-base tracking-wider uppercase"
            style={{
              background: "oklch(0.10 0.03 280 / 0.8)",
              border: "1px solid oklch(0.80 0.18 200 / 0.5)",
              color: "oklch(0.80 0.18 200)",
              boxShadow: "0 0 20px oklch(0.80 0.18 200 / 0.2)",
            }}
          >
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Entrar na Sala
            </span>
          </Button>
        </div>
      </div>

      {/* Create Room Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "oklch(0.09 0.04 280)",
            border: "1px solid oklch(0.65 0.28 310 / 0.4)",
            boxShadow: "0 0 40px oklch(0.65 0.28 310 / 0.2)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wider text-center" style={{ color: "oklch(0.65 0.28 310)" }}>
              ⚡ CRIAR SALA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">
                Seu nome
              </label>
              <Input
                placeholder="Como você quer ser chamado?"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="h-11"
                style={{
                  background: "oklch(0.12 0.04 280)",
                  border: "1px solid oklch(0.65 0.28 310 / 0.3)",
                  color: "oklch(0.95 0.01 280)",
                }}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createRoom.isPending}
              className="w-full h-11 font-display font-bold tracking-wider uppercase"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                boxShadow: "0 0 20px oklch(0.65 0.28 310 / 0.3)",
              }}
            >
              {createRoom.isPending ? "Criando..." : "🎉 Criar Sala"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Room Modal */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "oklch(0.09 0.04 280)",
            border: "1px solid oklch(0.80 0.18 200 / 0.4)",
            boxShadow: "0 0 40px oklch(0.80 0.18 200 / 0.15)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wider text-center" style={{ color: "oklch(0.80 0.18 200)" }}>
              🎯 ENTRAR NA SALA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">
                Código da sala
              </label>
              <Input
                placeholder="Ex: ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="h-11 font-display text-lg tracking-[0.3em] text-center"
                style={{
                  background: "oklch(0.12 0.04 280)",
                  border: "1px solid oklch(0.80 0.18 200 / 0.3)",
                  color: "oklch(0.80 0.18 200)",
                }}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block font-medium">
                Seu nome
              </label>
              <Input
                placeholder="Como você quer ser chamado?"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="h-11"
                style={{
                  background: "oklch(0.12 0.04 280)",
                  border: "1px solid oklch(0.80 0.18 200 / 0.3)",
                  color: "oklch(0.95 0.01 280)",
                }}
              />
            </div>
            <Button
              onClick={handleJoin}
              className="w-full h-11 font-display font-bold tracking-wider uppercase"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.22 200), oklch(0.45 0.18 220))",
                boxShadow: "0 0 20px oklch(0.80 0.18 200 / 0.3)",
                color: "white",
              }}
            >
              🚀 Entrar na Festa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
