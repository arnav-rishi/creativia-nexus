import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import googleLogo from "@/assets/logos/google.png";

interface Model {
  name: string;
  provider: string;
  type: "image" | "video";
  color: string;
  logo?: string;
  logoType?: "image" | "svg" | "letter";
  svgIcon?: React.ReactNode;
}

// OpenAI logo SVG
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
  </svg>
);

// Stability AI logo SVG
const StabilityLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

// Flux/BFL logo SVG
const FluxLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

// PixVerse logo SVG
const PixVerseLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <polygon points="12,2 22,12 12,22 2,12"/>
  </svg>
);

// Gemini logo SVG (4-pointed star)
const GeminiLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M12 2C12 8.627 17.373 14 24 14C17.373 14 12 19.373 12 26C12 19.373 6.627 14 0 14C6.627 14 12 8.627 12 2Z" transform="scale(0.5) translate(12, -2)"/>
  </svg>
);

const models: Model[] = [
  { 
    name: "Flux Pro", 
    provider: "Black Forest Labs", 
    type: "image", 
    color: "from-violet-500/20 to-purple-500/20",
    logoType: "svg",
    svgIcon: <FluxLogo />
  },
  { 
    name: "Flux Schnell", 
    provider: "Black Forest Labs", 
    type: "image", 
    color: "from-blue-500/20 to-cyan-500/20",
    logoType: "svg",
    svgIcon: <FluxLogo />
  },
  { 
    name: "SDXL", 
    provider: "Stability AI", 
    type: "image", 
    color: "from-orange-500/20 to-red-500/20",
    logoType: "svg",
    svgIcon: <StabilityLogo />
  },
  { 
    name: "Veo 3", 
    provider: "Google", 
    type: "video", 
    color: "from-green-500/20 to-emerald-500/20",
    logoType: "image",
    logo: googleLogo
  },
  { 
    name: "Sora 2", 
    provider: "OpenAI", 
    type: "video", 
    color: "from-pink-500/20 to-rose-500/20",
    logoType: "svg",
    svgIcon: <OpenAILogo />
  },
  { 
    name: "PixVerse", 
    provider: "PixVerse", 
    type: "video", 
    color: "from-indigo-500/20 to-blue-500/20",
    logoType: "svg",
    svgIcon: <PixVerseLogo />
  },
  { 
    name: "Gemini", 
    provider: "Google", 
    type: "image", 
    color: "from-cyan-500/20 to-teal-500/20",
    logoType: "image",
    logo: googleLogo
  },
  { 
    name: "Flux Dev", 
    provider: "Black Forest Labs", 
    type: "image", 
    color: "from-purple-500/20 to-pink-500/20",
    logoType: "svg",
    svgIcon: <FluxLogo />
  },
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

  const renderLogo = (model: Model) => {
    if (model.logoType === "image" && model.logo) {
      return (
        <img 
          src={model.logo} 
          alt={`${model.provider} logo`} 
          className="w-10 h-10 object-contain"
        />
      );
    }
    if (model.logoType === "svg" && model.svgIcon) {
      return (
        <div className="text-foreground/60 group-hover:text-foreground/80 transition-colors">
          {model.svgIcon}
        </div>
      );
    }
    return (
      <span className="text-2xl font-bold text-foreground/20 group-hover:text-foreground/30 transition-colors">
        {model.name.charAt(0)}
      </span>
    );
  };

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
            {/* Gradient background with logo */}
            <div className={cn(
              "w-full h-24 rounded-xl mb-4 flex items-center justify-center",
              "bg-gradient-to-br",
              model.color
            )}>
              {renderLogo(model)}
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