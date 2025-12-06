import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, User, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface SharedGeneration {
  id: string;
  prompt: string;
  result_url: string;
  generation_type: string;
  provider: string;
  shared_at: string | null;
  user_id: string;
}

interface CommunityGalleryProps {
  isAuthenticated: boolean;
}

const CommunityGallery = ({ isAuthenticated }: CommunityGalleryProps) => {
  const [generations, setGenerations] = useState<SharedGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSharedGenerations();
  }, []);

  const fetchSharedGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id, prompt, result_url, generation_type, provider, shared_at, user_id")
        .eq("is_shared", true)
        .order("shared_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching shared generations:", error);
        setLoading(false);
        return;
      }

      setGenerations(data || []);
      
      // Fetch creator names separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(g => g.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach(p => {
            names[p.id] = p.full_name || p.email.split("@")[0] || "Anonymous";
          });
          setCreatorNames(names);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSignedUrl = async (resultUrl: string) => {
    try {
      const path = resultUrl.replace(/^.*\/generations\//, "").split("?")[0];
      const { data } = await supabase.storage
        .from("generations")
        .createSignedUrl(path, 3600);
      return data?.signedUrl || resultUrl;
    } catch {
      return resultUrl;
    }
  };

  const handleDownload = async (generation: SharedGeneration) => {
    try {
      const signedUrl = await getSignedUrl(generation.result_url);
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = generation.generation_type.includes("video") ? "mp4" : "png";
      a.download = `generation-${generation.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  useEffect(() => {
    const loadSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const gen of generations) {
        try {
          urls[gen.id] = await getSignedUrl(gen.result_url);
        } catch {
          urls[gen.id] = gen.result_url;
        }
      }
      setSignedUrls(urls);
    };
    if (generations.length > 0) {
      loadSignedUrls();
    }
  }, [generations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No shared creations yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
      {generations.map((generation) => (
        <Card
          key={generation.id}
          className="break-inside-avoid overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 group"
        >
          <div className="relative">
            {generation.generation_type.includes("video") ? (
              <video
                src={signedUrls[generation.id] || generation.result_url}
                className="w-full object-cover"
                muted
                loop
                playsInline
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
            ) : (
              <img
                src={signedUrls[generation.id] || generation.result_url}
                alt={generation.prompt}
                className="w-full object-cover"
                loading="lazy"
              />
            )}
            
            {/* Overlay with prompt */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-xs line-clamp-3 mb-2">
                  {generation.prompt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white/70 text-xs">
                    <User className="h-3 w-3" />
                    <span>{creatorNames[generation.user_id] || "Anonymous"}</span>
                  </div>
                  {isAuthenticated ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-white hover:bg-white/20"
                      onClick={() => handleDownload(generation)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Link to="/auth">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-white hover:bg-white/20"
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Sign in</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CommunityGallery;
