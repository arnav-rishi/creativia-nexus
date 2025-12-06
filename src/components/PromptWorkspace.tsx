import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Wand2, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptWorkspaceProps {
  mode: "text" | "image";
  onBack: () => void;
}

const PromptWorkspace = ({ mode, onBack }: PromptWorkspaceProps) => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    // Navigate to generate page with pre-filled data
    const generationType = mode === "text" 
      ? (prompt.toLowerCase().includes("video") ? "text-to-video" : "text-to-image")
      : "image-to-image";
    navigate(`/generate?type=${generationType}&prompt=${encodeURIComponent(prompt)}`);
  };

  const examplePrompts = [
    "Cyberpunk samurai in neon rain",
    "Ethereal underwater palace",
    "Liquid gold flowing through crystal",
  ];

  return (
    <div className="z-10 w-full max-w-4xl min-h-screen flex flex-col justify-center px-4 animate-fade-in-up">
      {/* Header */}
      <div className="absolute top-8 left-0 w-full px-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="glass-panel px-4 py-1.5 rounded-full text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Mode: {mode === "text" ? "Text-to-Gen" : "Image-to-Gen"}
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Title */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground/90">
            {mode === "text" ? "Describe your imagination" : "Upload & Transform"}
          </h2>
          <p className="text-muted-foreground">
            {mode === "text"
              ? "Enter a prompt to generate stunning images or videos"
              : "Upload an image to animate, edit, or transform"}
          </p>
        </div>

        {/* Image Upload Area (for image mode) */}
        {mode === "image" && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "glass-input rounded-2xl p-8 border-2 border-dashed transition-all duration-300 cursor-pointer",
              "flex flex-col items-center justify-center min-h-[200px] gap-4",
              isDragging && "border-primary bg-primary/10",
              uploadedImage && "border-solid border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {uploadedImage ? (
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="max-h-48 rounded-lg object-contain"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedImage(null);
                  }}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-full bg-foreground/5 border border-border">
                  <ImageIcon size={32} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">
                    Drop your image here or click to upload
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Supports PNG, JPG, WEBP
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* The Prompt Input Box */}
        <div className="glass-input rounded-3xl p-2 flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/50">
          {/* Left Icon */}
          <button className="p-4 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
            {mode === "text" ? <Wand2 size={24} /> : <Upload size={24} />}
          </button>

          {/* Text Input Area */}
          <div className="flex-1 pb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "text"
                  ? "A cyberpunk city with neon rain reflecting on wet streets..."
                  : "Describe how you want to transform this image..."
              }
              className="w-full bg-transparent border-none outline-none text-lg text-foreground placeholder-muted-foreground/50 resize-none py-2"
              style={{ minHeight: "3rem", maxHeight: "150px" }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
              }}
            />
            
            {/* Tags / Settings */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-foreground/5 border border-border text-xs text-muted-foreground cursor-pointer hover:bg-foreground/10 transition-colors">
                16:9
              </span>
              <span className="px-3 py-1 rounded-lg bg-foreground/5 border border-border text-xs text-muted-foreground cursor-pointer hover:bg-foreground/10 transition-colors">
                Ultra HD
              </span>
              {uploadedImage && (
                <span className="px-3 py-1 rounded-lg bg-primary/20 border border-primary/30 text-xs text-primary">
                  Image Reference Active
                </span>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() && !(mode === "image" && uploadedImage)}
            className={cn(
              "h-16 w-16 mb-1 mr-1 rounded-[20px] flex items-center justify-center transition-all duration-300",
              "bg-gradient-neon hover:scale-105 active:scale-95",
              "shadow-lg shadow-primary/30 animate-glow-pulse",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <Sparkles className="text-foreground" size={24} />
          </button>
        </div>

        {/* Example Prompts */}
        <div className="flex justify-center gap-3 flex-wrap">
          {examplePrompts.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="text-xs text-muted-foreground hover:text-foreground bg-background/30 px-4 py-2 rounded-full border border-border/50 hover:border-border transition-all hover:bg-foreground/5"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptWorkspace;
