import { useState, useEffect, useRef } from "react";
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
import { Loader2, Image as ImageIcon, Video, Upload, Sparkles, Download, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Image models for Replicate
const IMAGE_MODELS = [
  { value: "flux-schnell", label: "Flux Schnell (Fast & High Quality)" },
  { value: "flux-dev", label: "Flux Dev (Slower, Higher Quality)" },
  { value: "flux-pro", label: "Flux Pro (Best Quality)" },
  { value: "stable-diffusion-xl", label: "Stable Diffusion XL" },
];

// Video models for Replicate
const VIDEO_MODELS = [
  { value: "sora-2", label: "Sora 2 (OpenAI - Fast)" },
  { value: "sora-2-pro", label: "Sora 2 Pro (OpenAI - High Quality)" },
  { value: "veo-3-fast", label: "Google Veo 3 Fast" },
  { value: "pixverse-v4.5", label: "Pixverse V4.5" },
  { value: "stable-video-diffusion", label: "Stable Video Diffusion (Image-to-Video)" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
];

const VIDEO_COST = 10;
const IMAGE_COST = 5;

interface GenerationResult {
  jobId: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  resultUrl?: string;
  type: "image" | "video";
  prompt: string;
  errorMessage?: string;
}

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
  const [currentGeneration, setCurrentGeneration] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Reset model when mode changes
  useEffect(() => {
    if (mode.includes("image")) {
      setModel("flux-schnell");
    } else {
      setModel("stable-video-diffusion");
    }
  }, [mode]);

  // Log current generation state changes
  useEffect(() => {
    console.log("[Generate] currentGeneration changed:", currentGeneration);
  }, [currentGeneration]);

  // Simulate progress animation during generation
  useEffect(() => {
    if (currentGeneration?.status === "pending" || currentGeneration?.status === "processing") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (currentGeneration?.status === "succeeded") {
      setProgress(100);
    }
  }, [currentGeneration?.status]);

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

  const pollJobStatus = (jobId: string, type: "image" | "video", promptText: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    console.log("[Generate] Starting poll for job:", jobId);
    
    pollingRef.current = setInterval(async () => {
      const { data: job, error } = await supabase
        .from("jobs")
        .select("status, result_url, error_message")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("[Generate] Error polling job:", error);
        return;
      }

      console.log("[Generate] Poll result:", { status: job.status, hasUrl: !!job.result_url });
      
      setCurrentGeneration({
        jobId,
        status: job.status as GenerationResult["status"],
        resultUrl: job.result_url || undefined,
        type,
        prompt: promptText,
        errorMessage: job.error_message || undefined,
      });

      if (job.status === "succeeded" || job.status === "failed") {
        console.log("[Generate] Job finished:", job.status, "URL:", job.result_url);
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsGenerating(false);
        fetchCredits(user.id);
        
        if (job.status === "succeeded") {
          toast.success("Generation complete!");
        } else {
          toast.error(job.error_message || "Generation failed");
        }
      }
    }, 2000);
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
    setProgress(0);
    setCurrentGeneration(null);
    toast.info("Starting generation...");

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
            duration: mode.includes("video") ? 8 : null,
          },
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const isVideo = mode === "text_to_video" || mode === "image_to_video";
      
      // Set initial generation state
      setCurrentGeneration({
        jobId: job.id,
        status: "pending",
        type: isVideo ? "video" : "image",
        prompt,
      });

      // Start polling for status
      pollJobStatus(job.id, isVideo ? "video" : "image", prompt);

      // Trigger appropriate function based on mode
      if (mode === "text_to_image" || mode === "image_to_image") {
        supabase.functions.invoke('generate-image', {
          body: { jobId: job.id }
        }).then(({ error }) => {
          if (error) {
            console.error('Processing error:', error);
            toast.error("Failed to start image generation");
          }
        });
      } else if (mode === "text_to_video" || mode === "image_to_video") {
        supabase.functions.invoke('generate-video', {
          body: { jobId: job.id }
        }).then(({ error }) => {
          if (error) {
            console.error('Processing error:', error);
            toast.error("Failed to start video generation");
          }
        });
      }

      setPrompt("");
      setUploadedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to start generation");
      setIsGenerating(false);
      setCurrentGeneration(null);
    }
  };

  const handleDownload = async (url: string, type: "image" | "video") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `generation-${Date.now()}.${type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download");
    }
  };

  const clearGeneration = () => {
    setCurrentGeneration(null);
    setProgress(0);
  };

  if (!user) return null;

  const getCreditCost = () => {
    return mode.includes("video") ? VIDEO_COST : IMAGE_COST;
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

        {/* Generation Preview Section */}
        {currentGeneration && (
          <Card className="mb-6 shadow-card border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {currentGeneration.status === "succeeded" ? "Generation Complete" : "Generating..."}
                </h3>
                {currentGeneration.status === "succeeded" && (
                  <Button variant="ghost" size="sm" onClick={clearGeneration}>
                    Clear
                  </Button>
                )}
              </div>

              {(currentGeneration.status === "pending" || currentGeneration.status === "processing") && (
                <div className="space-y-4">
                  <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_70%)]" />
                    
                    {/* Loading animation */}
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary/30 rounded-full animate-spin border-t-primary" />
                        {currentGeneration.type === "video" ? (
                          <Video className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                        ) : (
                          <ImageIcon className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        {currentGeneration.type === "video" 
                          ? "Creating your video... This may take a few minutes."
                          : "Creating your image..."}
                      </p>
                      <p className="text-xs text-muted-foreground/70 italic truncate max-w-sm">
                        "{currentGeneration.prompt}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {currentGeneration.status === "pending" ? "Queued..." : "Processing..."}
                    </p>
                  </div>
                </div>
              )}

              {currentGeneration.status === "succeeded" && (
                <div className="space-y-4">
                  <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center">
                    {currentGeneration.resultUrl ? (
                      currentGeneration.type === "video" ? (
                        <video
                          src={currentGeneration.resultUrl}
                          controls
                          autoPlay
                          loop
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <img
                          src={currentGeneration.resultUrl}
                          alt="Generated content"
                          className="max-h-full max-w-full object-contain"
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading result...</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-center text-muted-foreground">
                    ✓ Automatically saved to your Gallery
                  </p>
                  
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={clearGeneration}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate New
                    </Button>
                    {currentGeneration.resultUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(currentGeneration.resultUrl!, currentGeneration.type)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/gallery")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in Gallery
                    </Button>
                  </div>
                </div>
              )}

              {currentGeneration.status === "failed" && (
                <div className="aspect-video bg-destructive/10 rounded-lg flex flex-col items-center justify-center gap-4">
                  <div className="text-destructive text-lg font-medium">Generation Failed</div>
                  <p className="text-sm text-muted-foreground max-w-md text-center">
                    {currentGeneration.errorMessage || "Something went wrong. Please try again."}
                  </p>
                  <Button variant="outline" size="sm" onClick={clearGeneration}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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