import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

const REACTIONS = ["❤️", "😂", "🔥", "👏", "🎉", "😍"];

interface ReactionPickerProps {
  onReact: (emoji: string, x: number, y: number) => void;
}

export default function ReactionPicker({ onReact }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleReaction = (emoji: string) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      onReact(emoji, x, y);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: "oklch(0.12 0.04 280)",
          border: "1px solid oklch(0.65 0.28 310 / 0.3)",
          color: "oklch(0.65 0.28 310)",
        }}
        title="Adicionar reação"
      >
        <Smile className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 p-2 rounded-lg flex gap-1.5 animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: "oklch(0.10 0.04 280)",
            border: "1px solid oklch(0.65 0.28 310 / 0.4)",
            boxShadow: "0 4px 20px oklch(0.65 0.28 310 / 0.2)",
          }}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform active:scale-100 cursor-pointer"
              title={`Reagir com ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
