import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CommunityGallery from "@/components/CommunityGallery";
import Navbar from "@/components/Navbar";

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credits, setCredits] = useState(0);
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session?.user) {
      fetchCredits(session.user.id);
    }
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    if (data) setCredits(data.balance);
  };

  const handleGenerate = () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    navigate("/generate", { state: { prompt } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar credits={isAuthenticated ? credits : undefined} />
      
      {/* Hero Section with Prompt Input */}
      <section className="relative py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-8">
            <h1 className="mb-4 text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
              Create AI Art & Videos
            </h1>
            <p className="text-muted-foreground mb-6">
              Transform your ideas into stunning visuals. Join our creative community.
            </p>
            
            {/* Prompt Input */}
            <div className="relative max-w-xl mx-auto">
              <Input
                placeholder="Describe the image..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="pr-28 h-12 text-base bg-card/50 border-border/50 focus:border-primary/50"
              />
              <Button 
                onClick={handleGenerate}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 gap-2 shadow-glow"
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Gallery Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Community Creations</h2>
            {isAuthenticated && (
              <Link to="/gallery">
                <Button variant="ghost" size="sm" className="gap-2">
                  My Gallery
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          
          <CommunityGallery isAuthenticated={isAuthenticated} />
        </div>
      </section>
    </div>
  );
};

export default Home;
