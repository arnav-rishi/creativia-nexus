import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface CapabilityCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
}

const CapabilityCard = ({
  title,
  description,
  icon,
  onClick,
  className,
}: CapabilityCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative rounded-3xl p-8 flex flex-col",
        "bg-card/50 backdrop-blur-xl border border-border/30",
        "transition-all duration-500 ease-out",
        "hover:bg-card/70 hover:border-border/50 hover:shadow-2xl hover:shadow-primary/5",
        "hover:-translate-y-1",
        "text-left w-full cursor-pointer overflow-hidden",
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon */}
      <div className="relative z-10 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1">
        <h3 className="text-xl font-semibold text-foreground mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="relative z-10 mt-6 flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Try it
        </span>
        <ArrowRight size={16} className="transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </button>
  );
};

export default CapabilityCard;
