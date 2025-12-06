import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Type, Image, Video, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeonBackground from "@/components/NeonBackground";
import Navbar from "@/components/Navbar";
import CommunityGallery from "@/components/CommunityGallery";
import CapabilityCard from "@/components/CapabilityCard";
import ModelCarousel from "@/components/ModelCarousel";
import ExampleGenerations from "@/components/ExampleGenerations";
import { Button } from "@/components/ui/button";
const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [credits, setCredits] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id);
      if (session?.user) {
        fetchCredits(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUserId(session?.user?.id);
    if (session?.user) {
      fetchCredits(session.user.id);
    }
  };
  const fetchCredits = async (userId: string) => {
    const {
      data
    } = await supabase.from("credits").select("balance").eq("user_id", userId).single();
    if (data) setCredits(data.balance);
  };
  const handleGenerateClick = () => {
    navigate("/generate");
  };
  const capabilities = [{
    title: "Text to Image",
    description: "Transform your words into stunning visuals with state-of-the-art AI models.",
    icon: <Type size={24} className="text-primary" />,
    mode: "text",
    type: "image"
  }, {
    title: "Text to Video",
    description: "Create cinematic videos from simple text descriptions.",
    icon: <Video size={24} className="text-primary" />,
    mode: "text",
    type: "video"
  }, {
    title: "Image to Image",
    description: "Edit, enhance, or completely transform existing images with AI.",
    icon: <Image size={24} className="text-accent" />,
    mode: "image",
    type: "image"
  }, {
    title: "Image to Video",
    description: "Bring your still images to life with smooth AI animation.",
    icon: <Video size={24} className="text-accent" />,
    mode: "image",
    type: "video"
  }];
  return <div className="min-h-screen bg-background relative">
      <NeonBackground />
      <Navbar credits={isAuthenticated ? credits : undefined} />

      {/* Hero Section - Clean Apple-inspired */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-6 pt-24 pb-16 py-[9px]">
        <div className="flex flex-col items-center w-full max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-8 animate-fade-in">
            <Sparkles size={14} className="text-primary" />
            <span className="text-sm text-muted-foreground">Next-Generation AI Creation</span>
          </div>

          {/* Main Headline - Strong typography hierarchy */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in" style={{
          animationDelay: "100ms"
        }}>
            <span className="text-foreground">Create </span>
            <span className="text-gradient">Impossible</span>
            <br />
            <span className="text-gradient-pink">Things</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-in" style={{
          animationDelay: "200ms"
        }}>
            Transform your ideas into stunning images and videos with cutting-edge AI models. 
            No expertise required.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 items-center animate-fade-in" style={{
          animationDelay: "300ms"
        }}>
            <Button onClick={handleGenerateClick} size="lg" className="h-14 px-10 text-base font-medium rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 hover:bg-primary/30 text-foreground shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
              Generate Now
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* Capability Cards Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Four Ways to Create
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Choose your starting point and let AI do the rest.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {capabilities.map(cap => <CapabilityCard key={cap.title} title={cap.title} description={cap.description} icon={cap.icon} onClick={() => navigate(`/generate?mode=${cap.mode}`)} />)}
          </div>
        </div>
      </section>

      {/* Model Showcase Section */}
      <section className="relative z-10 py-24 px-6 bg-card/20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powered by the Best AI Models
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Access industry-leading models from OpenAI, Google, Stability AI, and more.
            </p>
          </div>

          {/* Model Carousel */}
          <ModelCarousel />
        </div>
      </section>

      {/* Example Generations Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              See What's Possible
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Sample outputs from our AI models. Your imagination is the only limit.
            </p>
          </div>

          {/* Examples Grid */}
          <ExampleGenerations />
        </div>
      </section>

      {/* Community Gallery Section */}
      <section className="relative z-10 py-24 px-6 bg-card/20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Community Creations
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Explore what others are creating with AI. Get inspired and share your own.
            </p>
          </div>

          {/* Gallery */}
          <CommunityGallery isAuthenticated={isAuthenticated} currentUserId={currentUserId} />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Create?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start generating stunning images and videos in seconds.
          </p>
          <Button onClick={handleGenerateClick} size="lg" className="h-14 px-10 text-base font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            Get Started Free
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </section>
    </div>;
};
export default Home;