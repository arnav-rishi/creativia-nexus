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
        "group relative glass-panel rounded-3xl p-8 flex flex-col justify-between items-start",
        "transition-all duration-300 ease-out",
        "hover:bg-foreground/5 hover:scale-[1.02] hover:border-foreground/20",
        "active:scale-95",
        "text-left w-full cursor-pointer overflow-hidden",
        glowClasses[glowColor],
        isAnimating && "animate-card-expand",
        isSelected && "ring-2 ring-primary/50",
        className
      )}
    >
      {/* Glow effect behind card */}
      <div 
        className={cn(
          "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[60px] transition-all duration-500",
          glowColor === "violet" && "bg-neon-violet/20 group-hover:bg-neon-violet/30",
          glowColor === "pink" && "bg-neon-pink/20 group-hover:bg-neon-pink/30",
          glowColor === "blue" && "bg-neon-blue/20 group-hover:bg-neon-blue/30"
        )}
      />
      
      {children}
    </button>
  );
};

export default GlassCard;
