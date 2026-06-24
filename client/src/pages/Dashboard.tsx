import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Youtube, HardDrive, Radio, Zap } from "lucide-react";
import RaveParticles from "@/components/RaveParticles";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);

  // Check integration status
  const integrationStatus = trpc.integrations.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (integrationStatus.data) {
      setYoutubeConnected(integrationStatus.data.youtubeConnected);
      setDriveConnected(integrationStatus.data.driveConnected);
    }
  }, [integrationStatus.data]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleConnectYoutube = () => {
    // Redirect to YouTube OAuth
    window.location.href = "/api/oauth/youtube";
  };

  const handleConnectDrive = () => {
    // Redirect to Google Drive OAuth
    window.location.href = "/api/oauth/drive";
  };

  const disconnectYoutubeMutation = trpc.integrations.disconnectYoutube.useMutation({
    onSuccess: () => {
      setYoutubeConnected(false);
      toast.success("YouTube desconectado!");
      integrationStatus.refetch();
    },
    onError: () => {
      toast.error("Erro ao desconectar YouTube");
    },
  });

  const disconnectDriveMutation = trpc.integrations.disconnectDrive.useMutation({
    onSuccess: () => {
      setDriveConnected(false);
      toast.success("Google Drive desconectado!");
      integrationStatus.refetch();
    },
    onError: () => {
      toast.error("Erro ao desconectar Google Drive");
    },
  });

  const handleDisconnectYoutube = () => {
    disconnectYoutubeMutation.mutate();
  };

  const handleDisconnectDrive = () => {
    disconnectDriveMutation.mutate();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎬</div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rave-bg min-h-screen relative flex flex-col overflow-hidden">
      <RaveParticles />

      {/* Header */}
      <div className="relative z-10 border-b border-purple-500/30 bg-black/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 text-pink-500" />
            <h1 className="font-display text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              MITZ WATCH
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              👤 {user?.name || user?.email || "Usuário"}
            </span>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Title */}
          <div className="text-center space-y-2 mb-12">
            <h2 className="font-display text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              Minhas Integrações
            </h2>
            <p className="text-muted-foreground">
              Conecte suas contas para acessar seus vídeos pessoais no player
            </p>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* YouTube Card */}
            <div
              className="rounded-lg p-6 border backdrop-blur-sm transition-all hover:shadow-lg"
              style={{
                background: "oklch(0.09 0.04 280 / 0.8)",
                border: "1px solid oklch(0.65 0.28 310 / 0.3)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ background: "oklch(0.65 0.28 310 / 0.1)" }}
                  >
                    <Youtube className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">YouTube</h3>
                    <p className="text-sm text-muted-foreground">
                      Acesse seus vídeos e playlists
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Status:{" "}
                  <span
                    className="font-medium"
                    style={{
                      color: youtubeConnected
                        ? "oklch(0.70 0.28 150)"
                        : "oklch(0.70 0.28 0)",
                    }}
                  >
                    {youtubeConnected ? "✓ Conectado" : "✗ Desconectado"}
                  </span>
                </div>
                {youtubeConnected ? (
                  <Button
                    onClick={handleDisconnectYoutube}
                    variant="outline"
                    className="w-full"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectYoutube}
                    className="w-full gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.28 310), oklch(0.45 0.25 280))",
                      boxShadow:
                        "0 0 20px oklch(0.65 0.28 310 / 0.3)",
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Conectar YouTube
                  </Button>
                )}
              </div>
            </div>

            {/* Google Drive Card */}
            <div
              className="rounded-lg p-6 border backdrop-blur-sm transition-all hover:shadow-lg"
              style={{
                background: "oklch(0.09 0.04 280 / 0.8)",
                border: "1px solid oklch(0.80 0.18 200 / 0.3)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ background: "oklch(0.80 0.18 200 / 0.1)" }}
                  >
                    <HardDrive className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">
                      Google Drive
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Acesse seus vídeos armazenados
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Status:{" "}
                  <span
                    className="font-medium"
                    style={{
                      color: driveConnected
                        ? "oklch(0.70 0.28 150)"
                        : "oklch(0.70 0.28 0)",
                    }}
                  >
                    {driveConnected ? "✓ Conectado" : "✗ Desconectado"}
                  </span>
                </div>
                {driveConnected ? (
                  <Button
                    onClick={handleDisconnectDrive}
                    variant="outline"
                    className="w-full"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectDrive}
                    className="w-full gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.22 200), oklch(0.45 0.18 220))",
                      boxShadow:
                        "0 0 20px oklch(0.80 0.18 200 / 0.3)",
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Conectar Drive
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Info section */}
          <div
            className="rounded-lg p-6 border"
            style={{
              background: "oklch(0.12 0.04 280 / 0.5)",
              border: "1px solid oklch(0.65 0.28 310 / 0.2)",
            }}
          >
            <h3 className="font-display font-bold mb-3">Como funciona?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                ✓ Conecte sua conta do YouTube para acessar seus vídeos salvos
              </li>
              <li>
                ✓ Conecte seu Google Drive para usar vídeos armazenados lá
              </li>
              <li>
                ✓ Ao criar ou entrar em uma sala, você poderá selecionar vídeos
                de suas contas
              </li>
              <li>
                ✓ Os vídeos serão sincronizados em tempo real para todos na sala
              </li>
            </ul>
          </div>

          {/* Back to home */}
          <div className="text-center">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="gap-2"
            >
              ← Voltar para Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
