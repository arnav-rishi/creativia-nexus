import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-lg">
              Pay only for what you use with our credit-based system
            </p>
          </div>

          <div className="grid gap-8 mb-12">
            {/* Text to Image Section */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Text to Image Models</CardTitle>
                  <Badge variant="secondary">Per Image</Badge>
                </div>
                <CardDescription>
                  Generate images from text descriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">DALL-E 3 (OpenAI)</h3>
                      <p className="text-sm text-muted-foreground">Premium quality, 1024×1024 resolution</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.04</div>
                      <div className="text-xs text-muted-foreground">per image</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Imagen 3 (Google)</h3>
                      <p className="text-sm text-muted-foreground">High quality, multiple resolutions</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.04</div>
                      <div className="text-xs text-muted-foreground">per image</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="font-semibold mb-1">Imagen 3 Fast (Google)</h3>
                        <p className="text-sm text-muted-foreground">Faster generation, cost-effective</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-secondary">$0.02</div>
                      <div className="text-xs text-muted-foreground">per image</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Stability AI</h3>
                      <p className="text-sm text-muted-foreground">Standard quality, various models</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.03</div>
                      <div className="text-xs text-muted-foreground">per image</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Text to Video Section */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Text to Video Models</CardTitle>
                  <Badge variant="secondary">Per Second</Badge>
                </div>
                <CardDescription>
                  Create videos from text prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Sora 2 (OpenAI)</h3>
                      <p className="text-sm text-muted-foreground">720×1280 or 1280×720 resolution</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.10</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Sora 2 Pro (OpenAI)</h3>
                      <p className="text-sm text-muted-foreground">720×1280 or 1280×720 enhanced quality</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.30</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Sora 2 Pro HD (OpenAI)</h3>
                      <p className="text-sm text-muted-foreground">1024×1792 or 1792×1024 high resolution</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.50</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Veo 3 (Google)</h3>
                      <p className="text-sm text-muted-foreground">High-quality video generation</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.75</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Veo 3 Aggregator (Google)</h3>
                      <p className="text-sm text-muted-foreground">Third-party aggregator pricing</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.83</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="font-semibold mb-1">Veo 3 Fast (Google)</h3>
                        <p className="text-sm text-muted-foreground">Faster generation, reduced cost</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-secondary">$0.18</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image to Video Section */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Image to Video Models</CardTitle>
                  <Badge variant="secondary">Per Second</Badge>
                </div>
                <CardDescription>
                  Animate static images into videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">RunwayML Gen-4 Turbo</h3>
                      <p className="text-sm text-muted-foreground">Fast image-to-video animation</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.25</div>
                      <div className="text-xs text-muted-foreground">per second</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image to Image Section */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Image to Image Models</CardTitle>
                  <Badge variant="secondary">Per Image</Badge>
                </div>
                <CardDescription>
                  Transform and stylize existing images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30">
                    <div>
                      <h3 className="font-semibold mb-1">Stability AI Image-to-Image</h3>
                      <p className="text-sm text-muted-foreground">AI-powered image transformation</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$0.03</div>
                      <div className="text-xs text-muted-foreground">per image</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">How Credits Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Purchase credits in flexible amounts to use across all AI models</p>
              <p>• Credits are deducted based on the model and output length/size</p>
              <p>• Unused credits never expire and can be used anytime</p>
              <p>• Track your usage and remaining credits in your profile</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
