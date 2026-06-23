import { useEffect, useState } from "react";

interface FloatingReactionProps {
  emoji: string;
  x: number;
  y: number;
  username: string;
  onComplete?: () => void;
}

export default function FloatingReaction({ emoji, x, y, username, onComplete }: FloatingReactionProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed pointer-events-none font-display font-bold text-3xl transition-all duration-300"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.5})`,
        opacity: isVisible ? 1 : 0,
        textShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
        animation: isVisible ? "float-up 2s ease-out forwards" : "none",
        zIndex: 50,
      }}
    >
      <div className="relative">
        {emoji}
        <div className="text-xs absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ color: "oklch(0.65 0.28 310)" }}>
          {username}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -150px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
