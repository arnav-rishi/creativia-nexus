import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Type, Image, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeonBackground from "@/components/NeonBackground";
import GlassCard from "@/components/GlassCard";
import PromptWorkspace from "@/components/PromptWorkspace";
import Navbar from "@/components/Navbar";

type ViewMode = "landing" | "workspace";
type GenerationMode = "text" | "image" | null;

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credits, setCredits] = useState(0);
  const [view, setView] = useState<ViewMode>("landing");
  const [selectedMode, setSelectedMode] = useState<GenerationMode>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingCard, setAnimatingCard] = useState<GenerationMode>(null);

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
    setSelectedMode(mode);

    setTimeout(() => {
      setView("workspace");
      setIsAnimating(false);
      setAnimatingCard(null);
    }, 500);
  };

  const handleBack = () => {
    setView("landing");
    setSelectedMode(null);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <NeonBackground />

      {/* Only show navbar on landing view */}
      {view === "landing" && <Navbar credits={isAuthenticated ? credits : undefined} />}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        {/* Landing View */}
        {view === "landing" && (
          <div
            className={`flex flex-col items-center w-full max-w-6xl px-4 transition-all duration-500 ${
              isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
          >
            {/* Hero Header */}
            <div className="text-center mb-12 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-6">
                <Sparkles size={16} className="text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Next-Gen AI Creation</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 leading-tight drop-shadow-lg mb-4">
                Create Impossible
                <br />
                Things
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Transform your ideas into stunning images and videos with cutting-edge AI
              </p>
            </div>

            {/* Selection Cards */}
            <div className="flex flex-col md:flex-row gap-6 w-full justify-center max-w-4xl">
              {/* Text Card */}
              <GlassCard
                onClick={() => handleCardSelection("text")}
                glowColor="violet"
                isAnimating={animatingCard === "text"}
                className={`flex-1 h-80 md:max-w-md ${animatingCard === "image" ? "opacity-0 scale-90" : ""}`}
              >
                <div className="p-4 rounded-2xl bg-foreground/5 border border-border group-hover:border-primary/50 transition-colors">
                  <Type size={32} className="text-primary" />
                </div>

                <div className="relative z-10 mt-auto">
                  <h3 className="text-2xl font-bold mb-2 text-foreground">Generate with Text</h3>
                  <p className="text-muted-foreground text-sm">
                    Transform words into stunning Images or Videos. Perfect for detailed prompts and creative scripts.
                  </p>
                </div>

                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="text-foreground" />
                </div>
              </GlassCard>

              {/* Image Card */}
              <GlassCard
                onClick={() => handleCardSelection("image")}
                glowColor="pink"
                isAnimating={animatingCard === "image"}
                className={`flex-1 h-80 md:max-w-md ${animatingCard === "text" ? "opacity-0 scale-90" : ""}`}
              >
                <div className="p-4 rounded-2xl bg-foreground/5 border border-border group-hover:border-accent/50 transition-colors">
                  <Image size={32} className="text-accent" />
                </div>

                <div className="relative z-10 mt-auto">
                  <h3 className="text-2xl font-bold mb-2 text-foreground">Generate with Image</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload to animate, edit, or transform existing visuals using AI-powered generation.
                  </p>
                </div>

                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="text-foreground" />
                </div>
              </GlassCard>
            </div>

            {/* Quick Links */}
            <div className="flex gap-4 mt-12 flex-wrap justify-center">
              <Link
                to="/generate"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Go to Studio
              </Link>
              <span className="text-border">•</span>
              <Link
                to="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                View Pricing
              </Link>
              {isAuthenticated && (
                <>
                  <span className="text-border">•</span>
                  <Link
                    to="/gallery"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    My Gallery
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Workspace View */}
        {view === "workspace" && selectedMode && <PromptWorkspace mode={selectedMode} onBack={handleBack} />}
      </div>
    </div>
  );
};

export default Home;
