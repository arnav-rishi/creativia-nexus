import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: "violet" | "pink" | "blue";
  isSelected?: boolean;
  isAnimating?: boolean;
}

const GlassCard = ({
  children,
  className,
  onClick,
  glowColor = "violet",
  isSelected = false,
  isAnimating = false,
}: GlassCardProps) => {
  const glowClasses = {
    violet: "card-glow-violet hover:shadow-glow",
    pink: "card-glow-pink hover:shadow-glow-pink",
    blue: "hover:shadow-glow-blue",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative glass-panel rounded-2xl p-7 flex flex-col justify-between items-start",
        "transition-all duration-300 ease-out",
        "hover:bg-foreground/[0.03] hover:scale-[1.02] hover:border-foreground/10",
        "active:scale-[0.98]",
        "text-left w-full cursor-pointer overflow-hidden",
        glowClasses[glowColor],
        isAnimating && "animate-fade-in-up",
        isSelected && "ring-1 ring-primary/40",
        className
      )}
    >
      {/* Subtle glow effect behind card */}
      <div 
        className={cn(
          "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] transition-all duration-500 opacity-0 group-hover:opacity-100",
          glowColor === "violet" && "bg-neon-violet/15",
          glowColor === "pink" && "bg-neon-pink/15",
          glowColor === "blue" && "bg-neon-blue/15"
        )}
      />
      
      {children}
    </button>
  );
};

export default GlassCard;
