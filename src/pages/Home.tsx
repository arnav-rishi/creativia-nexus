import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Image, Video, Wand2, Zap, ArrowRight, Stars } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm px-6 py-3 text-sm border border-primary/30 animate-pulse-glow">
              <Stars className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              <span className="font-medium text-foreground">Powered by Advanced AI Models</span>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>

            {/* Main Heading */}
            <h1 className="mb-8 text-6xl md:text-8xl font-black leading-tight">
              <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-shimmer">
                Create Magic
              </span>
              <span className="block mt-2 bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                with AI
              </span>
            </h1>

            {/* Description */}
            <p className="mb-12 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Transform your imagination into stunning <span className="text-primary font-semibold">images</span> and 
              <span className="text-secondary font-semibold"> videos</span> using the latest AI technology. 
              All in one powerful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/generate">
                <Button size="lg" className="gap-3 text-lg px-8 py-6 rounded-xl shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-105 group">
                  <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Start Creating Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary transition-all hover:scale-105">
                  View Pricing
                  <Zap className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">20+</div>
                <div className="text-sm text-muted-foreground">AI Models</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-secondary bg-clip-text text-transparent mb-2">4</div>
                <div className="text-sm text-muted-foreground">Generation Modes</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-2">Fast</div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 bg-gradient-to-b from-background via-card/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Generation Modes
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Choose the perfect tool for your creative vision
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Text to Image */}
            <Card className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-card-hover hover:scale-105 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-primary group-hover:scale-110 transition-transform">
                  <Image className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">Text to Image</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generate stunning images from text descriptions using DALL-E 3, Stability AI, and more
                </p>
              </div>
            </Card>

            {/* Image to Image */}
            <Card className="group relative overflow-hidden border-border/50 hover:border-secondary/50 transition-all duration-500 hover:shadow-card-hover hover:scale-105 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-secondary flex items-center justify-center mb-6 shadow-glow-secondary group-hover:scale-110 transition-transform">
                  <Wand2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-secondary transition-colors">Image to Image</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Transform and stylize existing images with AI-powered editing and style transfer
                </p>
              </div>
            </Card>

            {/* Text to Video */}
            <Card className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-card-hover hover:scale-105 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-primary group-hover:scale-110 transition-transform">
                  <Video className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">Text to Video</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create dynamic videos from text prompts using Kling, Veo 2, and Luma Dream Machine
                </p>
              </div>
            </Card>

            {/* Image to Video */}
            <Card className="group relative overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-500 hover:shadow-card-hover hover:scale-105 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center mb-6 shadow-glow-accent group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">Image to Video</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Bring your images to life with AI animation and video generation technology
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container relative mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-primary/30 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm shadow-card-hover">
            <div className="p-12 md:p-16 text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-8 text-primary animate-float" />
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Ready to Create Something Amazing?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join thousands of creators using AI to bring their ideas to life. Start generating for free today.
              </p>
              <Link to="/auth">
                <Button size="lg" className="gap-3 text-lg px-10 py-7 rounded-xl shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-110 group">
                  <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                  Get Started Free
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
