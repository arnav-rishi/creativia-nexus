import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Image, Video, Wand2, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CommunityGallery from "@/components/CommunityGallery";
import Navbar from "@/components/Navbar";

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credits, setCredits] = useState(0);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar credits={isAuthenticated ? credits : undefined} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-background to-background" />
        
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-secondary/20 px-4 py-2 text-sm border border-border/50">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-muted-foreground">Powered by Advanced AI Models</span>
            </div>

            <h1 className="mb-6 text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
              Create Stunning AI Content in Seconds
            </h1>

            <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas into beautiful images and videos using the latest AI technology. 
              From OpenAI's DALL-E to Google's Veo, all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generate">
                <Button size="lg" className="gap-2 shadow-glow">
                  <Sparkles className="h-5 w-5" />
                  Start Creating
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Four Powerful Generation Modes
            </h2>
            <p className="text-muted-foreground text-lg">
              Choose the perfect tool for your creative vision
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Image className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Text to Image</h3>
              <p className="text-muted-foreground text-sm">
                Generate stunning images from text descriptions using DALL-E 3 or Stability AI
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-secondary flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Image to Image</h3>
              <p className="text-muted-foreground text-sm">
                Transform and stylize existing images with AI-powered editing
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Text to Video</h3>
              <p className="text-muted-foreground text-sm">
                Create dynamic videos from text prompts using Sora 2 or Veo 3
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-secondary flex items-center justify-center mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Image to Video</h3>
              <p className="text-muted-foreground text-sm">
                Bring static images to life with AI-powered animation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Gallery Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Community Creations
              </h2>
              <p className="text-muted-foreground">
                Explore amazing AI-generated content from our community
              </p>
            </div>
            {isAuthenticated && (
              <Link to="/gallery">
                <Button variant="outline" className="gap-2">
                  My Gallery
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          
          <CommunityGallery isAuthenticated={isAuthenticated} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-2xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start generating amazing AI content today with our credit-based system
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-glow">
                <Sparkles className="h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
