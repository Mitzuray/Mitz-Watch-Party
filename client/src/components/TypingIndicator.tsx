interface TypingIndicatorProps {
  username: string;
}

export default function TypingIndicator({ username }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs py-2 px-3">
      <span style={{ color: "oklch(0.65 0.28 310)" }}>{username}</span>
      <span style={{ color: "oklch(0.65 0.28 310 / 0.6)" }}>está digitando</span>
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: "oklch(0.65 0.28 310)",
            animationDelay: "0ms",
          }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: "oklch(0.65 0.28 310)",
            animationDelay: "150ms",
          }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: "oklch(0.65 0.28 310)",
            animationDelay: "300ms",
          }}
        />
      </div>
    </div>
  );
}
