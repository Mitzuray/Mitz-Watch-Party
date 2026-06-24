import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  isPaused: () => boolean;
}

interface VideoPlayerProps {
  videoUrl: string;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
  onSeek?: (currentTime: number) => void;
  isSyncing?: boolean;
}

type VideoType = "youtube" | "drive" | "direct" | "extracted" | "unknown";

function detectVideoType(url: string): VideoType {
  if (!url) return "unknown";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("drive.google.com")) return "drive";
  if (url.includes("tokyvideo.com") || url.includes("animesonlinecc.to") || url.includes("animesonline")) return "extracted";
  if (url.match(/\.(mp4|webm|ogg|mkv|avi|mov)(\?.*)?$/i)) return "direct";
  return "direct";
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/v\/([^?&#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getDriveDownloadUrl(url: string): string {
  // Convert Google Drive share URL to direct download URL for video playback
  const fileIdMatch = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    // Use export=download to get direct MP4 stream that works with <video> tag
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
  // If already a direct URL, return as-is
  if (url.includes("/uc?id=")) return url;
  return url;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoUrl, onPlay, onPause, onSeek, isSyncing }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const ytPlayerRef = useRef<YT.Player | null>(null); // eslint-disable-line
    const ytReadyRef = useRef(false);
    const isSyncingRef = useRef(false);
    const lastSeekRef = useRef(0);

    const videoType = detectVideoType(videoUrl);
    const youtubeId = videoType === "youtube" ? getYouTubeId(videoUrl) : null;
    const driveEmbedUrl = videoType === "drive" ? getDriveDownloadUrl(videoUrl) : null;
    


    // Sync flag to avoid feedback loops
    useEffect(() => {
      isSyncingRef.current = !!isSyncing;
    }, [isSyncing]);

    // YouTube IFrame API
    useEffect(() => {
      if (videoType !== "youtube" || !youtubeId) return;

      const loadYT = () => {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
        }

        ytPlayerRef.current = new window.YT.Player("yt-player", {
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
            },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              if (isSyncingRef.current) return;
              const player = ytPlayerRef.current;
              if (!player) return;
              const currentTime = player.getCurrentTime?.() ?? 0;

              if (event.data === window.YT?.PlayerState?.PLAYING) {
                onPlay?.(currentTime);
              } else if (event.data === window.YT?.PlayerState?.PAUSED) {
                onPause?.(currentTime);
              }
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        loadYT();
      } else {
        // Load YouTube IFrame API
        if (!document.getElementById("yt-api-script")) {
          const tag = document.createElement("script");
          tag.id = "yt-api-script";
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
        (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = loadYT;
      }

      return () => {
        ytReadyRef.current = false;
        if (ytPlayerRef.current) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
        }
      };
    }, [youtubeId, videoType]);

    // Direct video event listeners
    useEffect(() => {
      const video = videoRef.current;
      if (!video || videoType !== "direct") return;

      const handlePlay = () => {
        if (isSyncingRef.current) return;
        onPlay?.(video.currentTime);
      };
      const handlePause = () => {
        if (isSyncingRef.current) return;
        onPause?.(video.currentTime);
      };
      const handleSeeked = () => {
        if (isSyncingRef.current) return;
        const now = Date.now();
        if (now - lastSeekRef.current < 300) return;
        lastSeekRef.current = now;
        onSeek?.(video.currentTime);
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("seeked", handleSeeked);

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("seeked", handleSeeked);
      };
    }, [videoType, onPlay, onPause, onSeek]);

    // Expose control methods
    useImperativeHandle(ref, () => ({
      play: () => {
        if (videoType === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          ytPlayerRef.current.playVideo();
        } else if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      },
      pause: () => {
        if (videoType === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          ytPlayerRef.current.pauseVideo();
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      seekTo: (time: number) => {
        if (videoType === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          ytPlayerRef.current.seekTo(time, true);
        } else if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => {
        if (videoType === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          return ytPlayerRef.current.getCurrentTime?.() ?? 0;
        } else if (videoRef.current) {
          return videoRef.current.currentTime;
        }
        return 0;
      },
      isPaused: () => {
        if (videoType === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          const state = ytPlayerRef.current.getPlayerState?.();
          return state !== window.YT?.PlayerState?.PLAYING;
        } else if (videoRef.current) {
          return videoRef.current.paused;
        }
        return true;
      },
    }));

    if (!videoUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-lg">
          <div className="text-center space-y-3">
            <div className="text-5xl">🎬</div>
            <p className="font-display text-sm text-muted-foreground">
              Cole um link de vídeo para começar
            </p>
          </div>
        </div>
      );
    }

    if (videoType === "youtube") {
      return (
        <div className="w-full h-full">
          <div id="yt-player" className="w-full h-full" />
        </div>
      );
    }

    if (videoType === "drive") {
      // Google Drive videos now use direct download URLs for full synchronization support
      return (
        <video
          ref={videoRef}
          src={driveEmbedUrl ?? ""}
          className="w-full h-full"
          controls
          playsInline
          preload="metadata"
          onPlay={() => {
            if (!isSyncingRef.current) {
              onPlay?.(videoRef.current?.currentTime ?? 0);
            }
          }}
          onPause={() => {
            if (!isSyncingRef.current) {
              onPause?.(videoRef.current?.currentTime ?? 0);
            }
          }}
          onSeeked={() => {
            if (!isSyncingRef.current) {
              onSeek?.(videoRef.current?.currentTime ?? 0);
            }
          }}
        />
      );
    }

    // Direct video (MP4, WebM, etc)
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        controls
        playsInline
        preload="metadata"
      />
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;

// YT types are provided by @types/youtube
