import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Type, Image, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeonBackground from "@/components/NeonBackground";
import GlassCard from "@/components/GlassCard";
import Navbar from "@/components/Navbar";

type GenerationMode = "text" | "image" | null;

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingCard, setAnimatingCard] = useState<GenerationMode>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session?.user) {
      fetchCredits(session.user.id);
    }
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase.from("credits").select("balance").eq("user_id", userId).single();
    if (data) setCredits(data.balance);
  };

  const handleCardSelection = (mode: GenerationMode) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimatingCard(mode);

    setTimeout(() => {
      navigate(`/generate?mode=${mode}`);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <NeonBackground />
      <Navbar credits={isAuthenticated ? credits : undefined} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div
          className={`flex flex-col items-center w-full max-w-5xl transition-all duration-500 ${
            isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
        >
          {/* Hero Header */}
          <header className="text-center mb-16 md:mb-20 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8">
              <Sparkles size={14} className="text-primary" />
              <span className="text-caption text-muted-foreground">Next-Gen AI Creation</span>
            </div>

            {/* Main Title */}
            <h1 className="text-hero text-gradient mb-6">
              Create Impossible
              <br />
              Things
            </h1>

            {/* Subtitle */}
            <p className="text-body text-muted-foreground max-w-lg mx-auto">
              Transform your ideas into stunning images and videos with cutting-edge AI
            </p>
          </header>

          {/* Selection Cards */}
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center max-w-3xl">
            {/* Text Card */}
            <GlassCard
              onClick={() => handleCardSelection("text")}
              glowColor="violet"
              isAnimating={animatingCard === "text"}
              className={`flex-1 h-72 ${animatingCard === "image" ? "opacity-0 scale-90" : ""}`}
            >
              <div className="p-3.5 rounded-xl bg-foreground/5 border border-border/50 group-hover:border-primary/40 transition-colors">
                <Type size={28} className="text-primary" />
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-heading mb-3 text-foreground">Generate with Text</h3>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  Transform words into stunning images or videos. Perfect for detailed prompts and creative scripts.
                </p>
              </div>

              <div className="absolute bottom-7 right-7 opacity-0 group-hover:opacity-100 transform translate-x-3 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight size={20} className="text-foreground/70" />
              </div>
            </GlassCard>

            {/* Image Card */}
            <GlassCard
              onClick={() => handleCardSelection("image")}
              glowColor="pink"
              isAnimating={animatingCard === "image"}
              className={`flex-1 h-72 ${animatingCard === "text" ? "opacity-0 scale-90" : ""}`}
            >
              <div className="p-3.5 rounded-xl bg-foreground/5 border border-border/50 group-hover:border-accent/40 transition-colors">
                <Image size={28} className="text-accent" />
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-heading mb-3 text-foreground">Generate with Image</h3>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  Upload to animate, edit, or transform existing visuals using AI-powered generation.
                </p>
              </div>

              <div className="absolute bottom-7 right-7 opacity-0 group-hover:opacity-100 transform translate-x-3 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight size={20} className="text-foreground/70" />
              </div>
            </GlassCard>
          </div>

          {/* Quick Links */}
          <nav className="flex gap-6 mt-14 flex-wrap justify-center">
            <Link
              to="/generate"
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              Go to Studio
            </Link>
            <span className="text-border/60">·</span>
            <Link
              to="/pricing"
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              View Pricing
            </Link>
            {isAuthenticated && (
              <>
                <span className="text-border/60">·</span>
                <Link
                  to="/gallery"
                  className="text-caption text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Gallery
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Home;
