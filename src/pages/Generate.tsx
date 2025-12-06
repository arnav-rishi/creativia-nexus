import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Image as ImageIcon, 
  Video, 
  Upload, 
  Sparkles, 
  Download, 
  Share2,
  Wand2,
  Type,
  ChevronDown,
  X,
  ArrowLeft,
  CreditCard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import NeonBackground from "@/components/NeonBackground";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Image models for Replicate
const IMAGE_MODELS = [
  { value: "flux-schnell", label: "Flux Schnell", desc: "Fast & High Quality" },
  { value: "flux-dev", label: "Flux Dev", desc: "Slower, Higher Quality" },
  { value: "flux-pro", label: "Flux Pro", desc: "Best Quality" },
  { value: "stable-diffusion-xl", label: "SDXL", desc: "Stable Diffusion XL" },
];

// Video models for Replicate
const VIDEO_MODELS = [
  { value: "sora-2", label: "Sora 2", desc: "OpenAI - Fast" },
  { value: "sora-2-pro", label: "Sora 2 Pro", desc: "OpenAI - High Quality" },
  { value: "veo-3-fast", label: "Veo 3 Fast", desc: "Google - Fast" },
  { value: "pixverse-v4.5", label: "Pixverse V4.5", desc: "High Quality" },
  { value: "stable-video-diffusion", label: "SVD", desc: "Image-to-Video" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const VIDEO_COST = 10;
const IMAGE_COST = 5;

interface GenerationResult {
  jobId: string;
  status: "pending" | "processing" | "succeeded" | "completed" | "failed";
  resultUrl?: string;
  type: "image" | "video";
  prompt: string;
  errorMessage?: string;
}

const Generate = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode"); // "text" or "image"
  
  // Determine which mode tabs to show based on URL param
  const isTextRoute = initialMode === "text" || !initialMode;
  const isImageRoute = initialMode === "image";
  
  // Set initial mode based on URL param
  const getInitialMode = (): "text_to_image" | "image_to_image" | "text_to_video" | "image_to_video" => {
    if (initialMode === "image") return "image_to_image";
    return "text_to_image";
  };

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"text_to_image" | "image_to_image" | "text_to_video" | "image_to_video">(getInitialMode());
  const [provider] = useState("replicate");
  const [model, setModel] = useState("flux-schnell");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [seed] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Reset model when mode changes
  useEffect(() => {
    if (mode.includes("image") && !mode.includes("video")) {
      setModel("flux-schnell");
    } else {
      setModel("stable-video-diffusion");
    }
  }, [mode]);

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
    } else if (currentGeneration?.status === "succeeded" || currentGeneration?.status === "completed") {
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
      
      setCurrentGeneration({
        jobId,
        status: job.status as GenerationResult["status"],
        resultUrl: job.result_url || undefined,
        type,
        prompt: promptText,
        errorMessage: job.error_message || undefined,
      });

      if (job.status === "succeeded" || job.status === "completed" || job.status === "failed") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsGenerating(false);
        fetchCredits(user.id);
        
        if (job.status === "succeeded" || job.status === "completed") {
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
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setUploadedFile(file);
      toast.success("Image uploaded");
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
      let inputImageUrl = null;
      if (uploadedFile && user) {
        const fileName = `${user.id}/${Date.now()}_${uploadedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("user-uploads")
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("user-uploads")
          .getPublicUrl(fileName);
        
        inputImageUrl = publicUrl;
      }

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
      
      setCurrentGeneration({
        jobId: job.id,
        status: "pending",
        type: isVideo ? "video" : "image",
        prompt,
      });

      pollJobStatus(job.id, isVideo ? "video" : "image", prompt);

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

  const handleShare = async (jobId: string) => {
    try {
      const { data: generation, error: fetchError } = await supabase
        .from("generations")
        .select("id")
        .eq("job_id", jobId)
        .single();

      if (fetchError || !generation) {
        toast.error("Could not find generation to share");
        return;
      }

      const { error } = await supabase
        .from("generations")
        .update({ is_shared: true, shared_at: new Date().toISOString() })
        .eq("id", generation.id);

      if (error) {
        toast.error("Failed to share");
        return;
      }

      toast.success("Shared to community gallery!");
    } catch {
      toast.error("Failed to share");
    }
  };

  const clearGeneration = () => {
    setCurrentGeneration(null);
    setProgress(0);
  };

  const getCreditCost = () => {
    return mode.includes("video") ? VIDEO_COST : IMAGE_COST;
  };

  const isVideoMode = mode === "text_to_video" || mode === "image_to_video";
  const requiresImage = mode === "image_to_image" || mode === "image_to_video";
  const currentModels = isVideoMode ? VIDEO_MODELS : IMAGE_MODELS;
  const selectedModel = currentModels.find(m => m.value === model) || currentModels[0];

  const examplePrompts = [
    "Cyberpunk samurai in neon rain",
    "Ethereal underwater palace",
    "Liquid gold flowing through crystal",
  ];

  if (!user) return null;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <NeonBackground />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-6 py-4 z-20 flex justify-between items-center">
        <button 
          onClick={() => navigate("/")} 
          className="text-foreground/70 hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>
        
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-neon-blue" />
            <span className="font-semibold text-foreground">{credits}</span>
            <span className="text-sm text-foreground/60">credits</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 z-10">
        {/* Generation Result */}
        {currentGeneration && (
          <div className="w-full max-w-4xl mb-8 animate-fade-in">
            <div className="glass-input rounded-3xl p-6">
              {/* Loading State */}
              {(currentGeneration.status === "pending" || currentGeneration.status === "processing") && (
                <div className="space-y-4">
                  <div className="aspect-video bg-background/30 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-blue/20 to-neon-pink/20 animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-neon-purple/30 rounded-full animate-spin border-t-neon-purple" />
                        {currentGeneration.type === "video" ? (
                          <Video className="absolute inset-0 m-auto h-8 w-8 text-neon-purple" />
                        ) : (
                          <ImageIcon className="absolute inset-0 m-auto h-8 w-8 text-neon-purple" />
                        )}
                      </div>
                      <p className="text-sm text-foreground/70 text-center max-w-md">
                        {currentGeneration.type === "video" 
                          ? "Creating your video... This may take a few minutes."
                          : "Creating your image..."}
                      </p>
                      <p className="text-xs text-foreground/50 italic truncate max-w-sm">
                        "{currentGeneration.prompt}"
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-foreground/50 text-center">
                      {currentGeneration.status === "pending" ? "Queued..." : "Processing..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Success State */}
              {(currentGeneration.status === "succeeded" || currentGeneration.status === "completed") && (
                <div className="space-y-4">
                  <div className="aspect-video bg-background/30 rounded-2xl overflow-hidden flex items-center justify-center">
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
                        <Loader2 className="h-8 w-8 animate-spin text-neon-purple" />
                        <p className="text-sm text-foreground/60">Loading result...</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-center text-neon-blue/80">
                    ✓ Automatically saved to your Gallery
                  </p>
                  
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      onClick={() => handleShare(currentGeneration.jobId)}
                      className="glass-chip hover:bg-neon-purple/20 border-neon-purple/30"
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearGeneration}
                      className="glass-chip hover:bg-foreground/10"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      New
                    </Button>
                    {currentGeneration.resultUrl && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(currentGeneration.resultUrl!, currentGeneration.type)}
                        className="glass-chip hover:bg-foreground/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Failed State */}
              {currentGeneration.status === "failed" && (
                <div className="aspect-video bg-destructive/10 rounded-2xl flex flex-col items-center justify-center gap-4">
                  <div className="text-destructive text-lg font-medium">Generation Failed</div>
                  <p className="text-sm text-foreground/60 max-w-md text-center">
                    {currentGeneration.errorMessage || "Something went wrong. Please try again."}
                  </p>
                  <Button variant="outline" onClick={clearGeneration} className="glass-chip">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        {!currentGeneration && (
          <>
            <div className="text-center space-y-3 mb-10 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground drop-shadow-lg">
                Describe your imagination
              </h1>
              <p className="text-foreground/60 text-lg">
                Enter a prompt to generate stunning images or videos
              </p>
            </div>

            {/* Main Input Box */}
            <div className="w-full max-w-4xl animate-fade-in">
              <div className="glass-input rounded-3xl p-4 space-y-4">
                {/* Mode Tabs - filtered based on route */}
                <div className="flex flex-wrap gap-2 justify-center pb-2 border-b border-foreground/10">
                  {isTextRoute && (
                    <>
                      <button
                        onClick={() => setMode("text_to_image")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          mode === "text_to_image"
                            ? "bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
                            : "bg-foreground/5 text-foreground/60 border border-transparent hover:bg-foreground/10"
                        }`}
                      >
                        <Type size={16} />
                        Text → Image
                      </button>
                      <button
                        onClick={() => setMode("text_to_video")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          mode === "text_to_video"
                            ? "bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
                            : "bg-foreground/5 text-foreground/60 border border-transparent hover:bg-foreground/10"
                        }`}
                      >
                        <Video size={16} />
                        Text → Video
                      </button>
                    </>
                  )}
                  {isImageRoute && (
                    <>
                      <button
                        onClick={() => setMode("image_to_image")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          mode === "image_to_image"
                            ? "bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
                            : "bg-foreground/5 text-foreground/60 border border-transparent hover:bg-foreground/10"
                        }`}
                      >
                        <ImageIcon size={16} />
                        Image → Image
                      </button>
                      <button
                        onClick={() => setMode("image_to_video")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          mode === "image_to_video"
                            ? "bg-neon-purple/30 text-neon-purple border border-neon-purple/50"
                            : "bg-foreground/5 text-foreground/60 border border-transparent hover:bg-foreground/10"
                        }`}
                      >
                        <Video size={16} />
                        Image → Video
                      </button>
                    </>
                  )}
                </div>

                {/* Image Upload Area */}
                {requiresImage && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-foreground/20 rounded-2xl p-6 text-center cursor-pointer hover:border-neon-purple/50 hover:bg-neon-purple/5 transition-all"
                  >
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <ImageIcon className="h-5 w-5 text-neon-blue" />
                        <span className="text-foreground/80">{uploadedFile.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                          className="p-1 hover:bg-foreground/10 rounded-full"
                        >
                          <X size={16} className="text-foreground/60" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-foreground/40" />
                        <span className="text-foreground/60">Click to upload an image</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt Input */}
                <textarea
                  placeholder="A cyberpunk city with neon rain reflecting on wet streets..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-lg text-foreground placeholder-foreground/40 resize-none min-h-[60px] py-2"
                />

                {/* Bottom Controls */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-foreground/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Magic Wand Icon */}
                    <div className="p-3 rounded-xl bg-foreground/5 text-foreground/60">
                      <Wand2 size={20} />
                    </div>

                    {/* Model Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="glass-chip px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-foreground/10 transition-colors">
                          {selectedModel.label}
                          <ChevronDown size={14} className="text-foreground/60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="start" 
                        className="w-64 bg-card/95 backdrop-blur-xl border-foreground/10"
                      >
                        {currentModels.map((m) => (
                          <DropdownMenuItem 
                            key={m.value} 
                            onClick={() => setModel(m.value)}
                            className={`flex flex-col items-start cursor-pointer ${
                              model === m.value ? "bg-neon-purple/20" : ""
                            }`}
                          >
                            <span className="font-medium">{m.label}</span>
                            <span className="text-xs text-foreground/60">{m.desc}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Aspect Ratio Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="glass-chip px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-foreground/10 transition-colors">
                          {aspectRatio}
                          <ChevronDown size={14} className="text-foreground/60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="start" 
                        className="bg-card/95 backdrop-blur-xl border-foreground/10"
                      >
                        {ASPECT_RATIOS.map((ratio) => (
                          <DropdownMenuItem 
                            key={ratio.value} 
                            onClick={() => setAspectRatio(ratio.value)}
                            className={`cursor-pointer ${
                              aspectRatio === ratio.value ? "bg-neon-purple/20" : ""
                            }`}
                          >
                            {ratio.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Credit Cost */}
                    <span className="text-sm text-foreground/50 ml-2">
                      {getCreditCost()} credits
                    </span>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || credits < getCreditCost()}
                    className="h-14 w-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue hover:from-neon-purple/80 hover:to-neon-blue/80 flex items-center justify-center shadow-lg shadow-neon-purple/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isGenerating ? (
                      <Loader2 className="text-white animate-spin" size={24} />
                    ) : (
                      <Sparkles className="text-white" size={24} />
                    )}
                  </button>
                </div>
              </div>

              {/* Example Prompts */}
              <div className="flex justify-center gap-3 flex-wrap mt-6 opacity-60">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="text-sm text-foreground/60 hover:text-foreground bg-background/30 px-4 py-2 rounded-full border border-foreground/10 hover:border-foreground/30 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Generate;
