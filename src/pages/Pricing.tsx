import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import NeonBackground from "@/components/NeonBackground";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <NeonBackground />
      <Navbar />
      
      <div className="relative z-10 container mx-auto px-6 py-section">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-16">
            <h1 className="text-hero text-gradient mb-4">
              Simple Credit Pricing
            </h1>
            <p className="text-body text-muted-foreground max-w-xl mx-auto">
              Purchase credits and use them across all AI models. No subscriptions, no hidden fees.
            </p>
          </header>

          <div className="space-y-8">
            {/* Text to Image Section */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-heading">Text to Image</CardTitle>
                  <Badge variant="secondary" className="text-caption">Per Image</Badge>
                </div>
                <CardDescription className="text-caption">
                  Generate images from text descriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PricingRow title="DALL-E 3 (OpenAI)" desc="Premium quality, 1024×1024" credits={80} />
                  <PricingRow title="Imagen 3 (Google)" desc="High quality, multiple resolutions" credits={80} />
                  <PricingRow title="Imagen 3 Fast (Google)" desc="Faster generation, cost-effective" credits={30} recommended />
                  <PricingRow title="Stability AI" desc="Standard quality, various models" credits={50} />
                </div>
              </CardContent>
            </Card>

            {/* Text to Video Section */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-heading">Text to Video</CardTitle>
                  <Badge variant="secondary" className="text-caption">Per Second</Badge>
                </div>
                <CardDescription className="text-caption">
                  Create videos from text prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PricingRow title="Sora 2 (OpenAI)" desc="720×1280 or 1280×720" credits={150} />
                  <PricingRow title="Sora 2 Pro (OpenAI)" desc="Enhanced quality" credits={450} />
                  <PricingRow title="Sora 2 Pro HD (OpenAI)" desc="1024×1792 or 1792×1024" credits={750} />
                  <PricingRow title="Veo 3 (Google)" desc="High-quality video generation" credits={1000} />
                  <PricingRow title="Veo 3 Aggregator (Google)" desc="Third-party aggregator" credits={1100} />
                  <PricingRow title="Veo 3 Fast (Google)" desc="Faster generation, reduced cost" credits={250} recommended />
                </div>
              </CardContent>
            </Card>

            {/* Image to Video Section */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-heading">Image to Video</CardTitle>
                  <Badge variant="secondary" className="text-caption">Per Second</Badge>
                </div>
                <CardDescription className="text-caption">
                  Animate static images into videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PricingRow title="RunwayML Gen-4 Turbo" desc="Fast image-to-video animation" credits={400} />
                </div>
              </CardContent>
            </Card>

            {/* Image to Image Section */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-heading">Image to Image</CardTitle>
                  <Badge variant="secondary" className="text-caption">Per Image</Badge>
                </div>
                <CardDescription className="text-caption">
                  Transform and stylize existing images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PricingRow title="Stability AI Image-to-Image" desc="AI-powered image transformation" credits={50} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Credits Work */}
          <Card className="mt-12 bg-card/30 border-primary/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading">How Credits Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-caption text-muted-foreground">
              <p>• <span className="text-foreground/80 font-medium">Purchase credits</span> in flexible amounts to use across all AI models</p>
              <p>• <span className="text-foreground/80 font-medium">1000 credits = $1.00</span> — Simple and transparent pricing</p>
              <p>• Credits are deducted based on the model and output length/size</p>
              <p>• <span className="text-foreground/80 font-medium">Never expire</span> — Use your credits anytime</p>
              <p>• Track your usage and remaining credits in your profile</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface PricingRowProps {
  title: string;
  desc: string;
  credits: number;
  recommended?: boolean;
}

const PricingRow = ({ title, desc, credits, recommended }: PricingRowProps) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border/30">
    <div className="flex items-center gap-3">
      <div>
        <h3 className="text-caption font-medium text-foreground">{title}</h3>
        <p className="text-caption text-muted-foreground">{desc}</p>
      </div>
      {recommended && (
        <Badge variant="outline" className="text-xs border-secondary/40 text-secondary">Recommended</Badge>
      )}
    </div>
    <div className="text-right">
      <div className={`text-xl font-semibold ${recommended ? 'text-secondary' : 'text-primary'}`}>{credits}</div>
      <div className="text-xs text-muted-foreground">credits</div>
    </div>
  </div>
);

export default Pricing;
