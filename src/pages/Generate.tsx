import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Video, Upload, Sparkles } from "lucide-react";

// Image models/styles
const IMAGE_MODELS = [
  { value: "anime", label: "Anime" },
  { value: "realistic", label: "Realistic" },
  { value: "flux-dev", label: "Flux Dev" },
  { value: "flux-schnell", label: "Flux Schnell" },
  { value: "imagine-turbo", label: "Imagine Turbo" },
  { value: "sdxl-1.0", label: "SDXL 1.0" },
];

// Video models/styles
const VIDEO_MODELS = [
  { value: "kling-1.0-pro", label: "Kling 1.0 Pro" },
  { value: "kling-1.5-pro", label: "Kling 1.5 Pro" },
  { value: "kling-1.6-pro", label: "Kling 1.6 Pro" },
  { value: "kling-1.6-standard", label: "Kling 1.6 Standard" },
  { value: "fast-svd-lcm", label: "Fast SVD LCM" },
  { value: "fast-svd", label: "Fast SVD" },
  { value: "luma-dream-machine-ray-2", label: "Luma Dream Machine Ray 2" },
  { value: "luma-dream-machine-ray-2-flash", label: "Luma Dream Machine Ray 2 Flash" },
  { value: "luma-dream-machine", label: "Luma Dream Machine" },
  { value: "magi", label: "Magi" },
  { value: "magi-distilled", label: "Magi Distilled" },
  { value: "minimax-video-01", label: "MiniMax Video 01" },
  { value: "minimax-video-01-director", label: "MiniMax Video 01 Director" },
  { value: "minimax-video-01-live", label: "MiniMax Video 01 Live" },
  { value: "mochi-v1", label: "Mochi V1" },
  { value: "pika-2.1", label: "Pika 2.1" },
  { value: "pika-2.2", label: "Pika 2.2" },
  { value: "pixverse-3.5", label: "Pixverse 3.5" },
  { value: "veo-2", label: "Veo 2" },
  { value: "ltx-video-v095", label: "LTX Video V095" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
];

const Generate = () => {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"text_to_image" | "image_to_image" | "text_to_video" | "image_to_video">("text_to_image");
  const [provider, setProvider] = useState("vyro_ai");
  const [model, setModel] = useState("realistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [seed, setSeed] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  // Reset model when mode changes
  useEffect(() => {
    if (mode.includes("image")) {
      setModel("realistic");
    } else {
      setModel("kling-1.0-pro");
    }
  }, [mode]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchCredits(session.user.id);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    if (data) setCredits(data.balance);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (mode.includes("image") && !file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setUploadedFile(file);
      toast.success("File uploaded successfully");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if ((mode === "image_to_image" || mode === "image_to_video") && !uploadedFile) {
      toast.error("Please upload an image first");
      return;
    }

    if (credits < getCreditCost()) {
      toast.error("Insufficient credits");
      return;
    }

    setIsGenerating(true);
    toast.info("Job submitted! Processing...");

    try {
      // Upload file if needed
      let inputImageUrl = null;
      if (uploadedFile && user) {
        const fileName = `${user.id}/${Date.now()}_${uploadedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("user-uploads")
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("user-uploads")
          .getPublicUrl(fileName);
        
        inputImageUrl = publicUrl;
      }

      // Create job with metadata
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          job_type: mode,
          prompt,
          input_image_url: inputImageUrl,
          provider,
          cost_credits: getCreditCost(),
          status: "pending",
          metadata: {
            model,
            aspect_ratio: aspectRatio,
            seed: seed || null,
          },
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Trigger appropriate function based on mode
      if (provider === "vyro_ai") {
        if (mode === "text_to_image" || mode === "image_to_image") {
          // Trigger image generation
          supabase.functions.invoke('generate-image', {
            body: { jobId: job.id }
          }).then(({ data, error }) => {
            if (error) {
              console.error('Processing error:', error);
              toast.error("Failed to start image generation");
            }
          });
        } else if (mode === "text_to_video" || mode === "image_to_video") {
          // Trigger video generation
          supabase.functions.invoke('generate-video', {
            body: { jobId: job.id }
          }).then(({ data, error }) => {
            if (error) {
              console.error('Processing error:', error);
              toast.error("Failed to start video generation");
            }
          });
        }
        
        toast.success("Generation started! Check your gallery in a moment.");
      } else if (provider === "studio_ai" && mode === "text_to_image") {
        // Keep support for Studio AI
        supabase.functions.invoke('generate-image', {
          body: { jobId: job.id }
        }).then(({ data, error }) => {
          if (error) {
            console.error('Processing error:', error);
          }
        });
        
        toast.success("Generation started! Check your gallery in a moment.");
      } else {
        toast.info("This mode requires additional API configuration. Job queued.");
      }

      setPrompt("");
      setUploadedFile(null);
      
      // Navigate to gallery after a brief delay
      setTimeout(() => navigate("/gallery"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to start generation");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  const getCreditCost = () => {
    return mode.includes("video") ? 10 : 5;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar credits={credits} />
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Create with AI
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Transform your ideas into stunning visuals with advanced AI technology
          </p>
        </div>

        <Card className="shadow-card-hover border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8">
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-muted/50 p-2 rounded-xl">
                <TabsTrigger 
                  value="text_to_image" 
                  className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Text → Image</span>
                  <span className="sm:hidden">T→I</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="image_to_image" 
                  className="gap-2 data-[state=active]:bg-gradient-secondary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Image → Image</span>
                  <span className="sm:hidden">I→I</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="text_to_video" 
                  className="gap-2 data-[state=active]:bg-gradient-accent data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Text → Video</span>
                  <span className="sm:hidden">T→V</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="image_to_video" 
                  className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg transition-all"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Image → Video</span>
                  <span className="sm:hidden">I→V</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={mode} className="space-y-6 mt-8">
                {(mode === "image_to_image" || mode === "image_to_video") && (
                  <div className="space-y-3">
                    <Label htmlFor="file-upload" className="text-base font-semibold">Upload Image</Label>
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <Input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="bg-input border-border/50 hover:border-primary/50 transition-colors"
                        />
                      </div>
                      {uploadedFile && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <Upload className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{uploadedFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="prompt" className="text-base font-semibold">Your Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      mode === "text_to_image"
                        ? "A serene mountain landscape at sunset with vibrant colors..."
                        : mode === "image_to_image"
                        ? "Transform this into a watercolor painting with soft colors..."
                        : mode === "text_to_video"
                        ? "A time-lapse of clouds moving across a colorful sunset sky..."
                        : "Animate this image with gentle, flowing motion..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] resize-none bg-input border-border/50 hover:border-primary/50 focus:border-primary transition-colors text-base"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">AI Provider</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="bg-input border-border/50 hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vyro_ai">Vyro AI (Image & Video)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Model / Style</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="bg-input border-border/50 hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mode.includes("image")
                          ? IMAGE_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))
                          : VIDEO_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="bg-input border-border/50 hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ar) => (
                          <SelectItem key={ar.value} value={ar.value}>
                            {ar.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="seed" className="text-base font-semibold">
                      Seed (Optional)
                    </Label>
                    <Input
                      id="seed"
                      type="text"
                      placeholder="Random seed"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="bg-input border-border/50 hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isGenerating || credits < getCreditCost()}
                    className="w-full gap-3 text-lg py-6 rounded-xl shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center justify-center gap-3">
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Generate ({getCreditCost()} credits)
                        </>
                      )}
                    </span>
                  </Button>
                  {credits < getCreditCost() && (
                    <p className="text-destructive text-sm text-center mt-3 font-medium">
                      Insufficient credits. You need {getCreditCost()} credits but have {credits}.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Generate;