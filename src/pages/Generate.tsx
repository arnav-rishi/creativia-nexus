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

// Image models for Replicate
const IMAGE_MODELS = [
  { value: "flux-schnell", label: "Flux Schnell (Fast & High Quality)" },
  { value: "flux-dev", label: "Flux Dev (Slower, Higher Quality)" },
  { value: "flux-pro", label: "Flux Pro (Best Quality)" },
  { value: "stable-diffusion-xl", label: "Stable Diffusion XL" },
];

// Video models for Replicate
const VIDEO_MODELS = [
  { value: "veo-3-fast", label: "Google Veo 3 Fast (Recommended)" },
  { value: "pixverse-v4.5", label: "Pixverse V4.5 (Fast & Quality)" },
  { value: "stable-video-diffusion", label: "Stable Video Diffusion (Image-to-Video)" },
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
  const [provider, setProvider] = useState("replicate");
  const [model, setModel] = useState("flux-schnell");
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
      setModel("flux-schnell");
    } else {
      setModel("stable-video-diffusion");
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

    if (prompt.length > 1000) {
      toast.error("Prompt too long (max 1000 characters)");
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
        toast.success("Generation started! Check your gallery in a moment.");
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
        toast.success("Generation started! Check your gallery in a moment.");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <Navbar credits={credits} />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8 space-y-2 animate-slide-up">
          <h1 className="text-5xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            Create with AI
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate stunning images and videos with AI-powered creativity
          </p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm animate-slide-up">
          <CardContent className="p-6">
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="text_to_image" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Text → Image
                </TabsTrigger>
                <TabsTrigger value="image_to_image" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Image → Image
                </TabsTrigger>
                <TabsTrigger value="text_to_video" className="gap-2">
                  <Video className="h-4 w-4" />
                  Text → Video
                </TabsTrigger>
                <TabsTrigger value="image_to_video" className="gap-2">
                  <Video className="h-4 w-4" />
                  Image → Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value={mode} className="space-y-6">
                {(mode === "image_to_image" || mode === "image_to_video") && (
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload Image</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="flex-1"
                      />
                      {uploadedFile && (
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          {uploadedFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      mode === "text_to_image"
                        ? "A serene mountain landscape at sunset..."
                        : mode === "image_to_image"
                        ? "Transform this into a watercolor painting..."
                        : mode === "text_to_video"
                        ? "A time-lapse of clouds moving across the sky..."
                        : "Animate this image with gentle motion..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select value={provider} onValueChange={setProvider} disabled>
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replicate">Replicate (All Features)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Using Replicate for all generation types
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Model/Style</Label>
                  <Select 
                    value={model} 
                    onValueChange={setModel}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(mode.includes("image") ? IMAGE_MODELS : VIDEO_MODELS).map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {mode.includes("image") && (
                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed (Optional)</Label>
                    <Input
                      id="seed"
                      type="number"
                      placeholder="Leave empty for random"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="bg-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the same seed to reproduce similar images
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cost: </span>
                    <span className="font-semibold">{getCreditCost()} credits</span>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || credits < getCreditCost()}
                    className="bg-gradient-primary hover:opacity-90 transition-opacity min-w-[160px]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : credits < getCreditCost() ? (
                      "Insufficient Credits"
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
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