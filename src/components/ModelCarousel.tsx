import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Model {
  name: string;
  provider: string;
  type: "image" | "video";
  color: string;
}

const models: Model[] = [
  { name: "Flux Pro", provider: "Black Forest Labs", type: "image", color: "from-violet-500/20 to-purple-500/20" },
  { name: "Flux Schnell", provider: "Black Forest Labs", type: "image", color: "from-blue-500/20 to-cyan-500/20" },
  { name: "SDXL", provider: "Stability AI", type: "image", color: "from-orange-500/20 to-red-500/20" },
  { name: "Veo 3", provider: "Google", type: "video", color: "from-green-500/20 to-emerald-500/20" },
  { name: "Sora 2", provider: "OpenAI", type: "video", color: "from-pink-500/20 to-rose-500/20" },
  { name: "PixVerse", provider: "PixVerse", type: "video", color: "from-indigo-500/20 to-blue-500/20" },
  { name: "Gemini", provider: "Google", type: "image", color: "from-cyan-500/20 to-teal-500/20" },
  { name: "Flux Dev", provider: "Black Forest Labs", type: "image", color: "from-purple-500/20 to-pink-500/20" },
];

const ModelCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    const handleMouseEnter = () => cancelAnimationFrame(animationId);
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(animate);
    };

    scrollContainer.addEventListener("mouseenter", handleMouseEnter);
    scrollContainer.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener("mouseenter", handleMouseEnter);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden py-4"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Duplicate models for seamless loop */}
        {[...models, ...models].map((model, index) => (
          <div
            key={`${model.name}-${index}`}
            className={cn(
              "flex-shrink-0 w-48 rounded-2xl p-5",
              "bg-card/40 backdrop-blur-sm border border-border/30",
              "hover:border-border/50 hover:bg-card/60 transition-all duration-300",
              "cursor-pointer group"
            )}
          >
            {/* Gradient background */}
            <div className={cn(
              "w-full h-24 rounded-xl mb-4 flex items-center justify-center",
              "bg-gradient-to-br",
              model.color
            )}>
              <span className="text-2xl font-bold text-foreground/20 group-hover:text-foreground/30 transition-colors">
                {model.name.charAt(0)}
              </span>
            </div>
            
            <h4 className="font-medium text-foreground text-sm mb-1">
              {model.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {model.provider}
            </p>
            <span className={cn(
              "inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
              model.type === "image" 
                ? "bg-primary/10 text-primary" 
                : "bg-accent/10 text-accent"
            )}>
              {model.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelCarousel;
