import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface Example {
  id: string;
  type: "image" | "video";
  model: string;
  prompt: string;
  thumbnail: string;
}

const examples: Example[] = [
  {
    id: "1",
    type: "image",
    model: "Flux Pro",
    prompt: "Cyberpunk cityscape at sunset",
    thumbnail: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    type: "video",
    model: "Veo 3",
    prompt: "Ocean waves in slow motion",
    thumbnail: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    type: "image",
    model: "SDXL",
    prompt: "Fantasy dragon portrait",
    thumbnail: "https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    type: "image",
    model: "Gemini",
    prompt: "Abstract geometric patterns",
    thumbnail: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    type: "video",
    model: "Sora 2",
    prompt: "Northern lights timelapse",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    type: "image",
    model: "Flux Dev",
    prompt: "Minimalist architecture",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop",
  },
];

const ExampleGenerations = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {examples.map((example) => (
        <div
          key={example.id}
          className={cn(
            "group relative aspect-square rounded-2xl overflow-hidden",
            "bg-card/40 border border-border/30",
            "hover:border-border/50 hover:shadow-xl hover:shadow-primary/5",
            "transition-all duration-300 cursor-pointer"
          )}
        >
          {/* Thumbnail */}
          <img
            src={example.thumbnail}
            alt={example.prompt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Video play indicator */}
          {example.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-background/90 transition-colors">
                <Play size={16} className="text-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
          
          {/* Overlay with info */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider mb-1",
                example.type === "image" 
                  ? "bg-primary/20 text-primary" 
                  : "bg-accent/20 text-accent"
              )}>
                {example.model}
              </span>
              <p className="text-xs text-foreground/80 line-clamp-2">
                {example.prompt}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExampleGenerations;
