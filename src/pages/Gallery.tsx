import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Trash2, Clock, CheckCircle2, XCircle, Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Generation {
  id: string;
  prompt: string;
  result_url: string;
  provider: string;
  generation_type: string;
  created_at: string;
}

interface GenerationWithUrl extends Generation {
  displayUrl: string;
}

const Gallery = () => {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [generations, setGenerations] = useState<GenerationWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchCredits(session.user.id);
    fetchGenerations(session.user.id);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    if (data) setCredits(data.balance);
  };

  const getSignedUrl = async (resultUrl: string): Promise<string> => {
    try {
      // Parse Supabase storage URL
      const url = new URL(resultUrl);
      const pathParts = url.pathname.split('/').filter(p => p);
      
      // Find the bucket name - it's usually after 'public' or 'sign'
      const publicIndex = pathParts.indexOf('public');
      const signIndex = pathParts.indexOf('sign');
      const objectIndex = pathParts.indexOf('object');
      
      let bucketName = 'generations';
      let filePath = '';
      
      if (publicIndex !== -1 && publicIndex < pathParts.length - 1) {
        bucketName = pathParts[publicIndex + 1];
        filePath = pathParts.slice(publicIndex + 2).join('/');
      } else if (signIndex !== -1 && signIndex < pathParts.length - 1) {
        bucketName = pathParts[signIndex + 1];
        filePath = pathParts.slice(signIndex + 2).join('/');
        filePath = filePath.split('?')[0];
      } else if (objectIndex !== -1 && objectIndex < pathParts.length - 1) {
        bucketName = pathParts[objectIndex + 1];
        filePath = pathParts.slice(objectIndex + 2).join('/');
      } else {
        // Try regex extraction
        const match = resultUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+)/);
        if (match) {
          bucketName = match[1];
          filePath = match[2].split('?')[0];
        } else {
          // If we can't parse, return original URL
          return resultUrl;
        }
      }
      
      // Get fresh signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600);
      
      if (error || !data?.signedUrl) {
        console.warn('Failed to create signed URL, using original:', error);
        return resultUrl;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return resultUrl;
    }
  };

  const fetchGenerations = async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load gallery");
      setIsLoading(false);
      return;
    }

    // Get fresh signed URLs for all generations
    const generationsWithUrls = await Promise.all(
      (data || []).map(async (gen) => {
        const displayUrl = await getSignedUrl(gen.result_url);
        return {
          ...gen,
          displayUrl,
        };
      })
    );

    setGenerations(generationsWithUrls);
    setIsLoading(false);
  };

  const handleDownload = async (resultUrl: string, prompt: string, type: string) => {
    try {
      // Parse Supabase storage URL
      // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      // or: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]?token=...
      const url = new URL(resultUrl);
      const pathParts = url.pathname.split('/').filter(p => p);
      
      // Find the bucket name - it's usually after 'public' or 'sign'
      const publicIndex = pathParts.indexOf('public');
      const signIndex = pathParts.indexOf('sign');
      const objectIndex = pathParts.indexOf('object');
      
      let bucketName = 'generations'; // default
      let filePath = '';
      
      if (publicIndex !== -1 && publicIndex < pathParts.length - 1) {
        bucketName = pathParts[publicIndex + 1];
        filePath = pathParts.slice(publicIndex + 2).join('/');
      } else if (signIndex !== -1 && signIndex < pathParts.length - 1) {
        bucketName = pathParts[signIndex + 1];
        filePath = pathParts.slice(signIndex + 2).join('/');
        // Remove query params from filePath if any
        filePath = filePath.split('?')[0];
      } else if (objectIndex !== -1 && objectIndex < pathParts.length - 1) {
        // Try to find bucket after 'object'
        bucketName = pathParts[objectIndex + 1];
        filePath = pathParts.slice(objectIndex + 2).join('/');
      } else {
        // Fallback: try to extract from URL directly using regex
        const match = resultUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+)/);
        if (match) {
          bucketName = match[1];
          filePath = match[2].split('?')[0];
        } else {
          // Last resort: try direct download
          const link = document.createElement('a');
          link.href = resultUrl;
          link.download = `${prompt.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}.${type === 'image' ? 'png' : 'mp4'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }
      
      console.log('Download attempt:', { bucketName, filePath, resultUrl });
      
      // Get signed URL for download (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('Error creating signed URL:', error);
        // Fallback: try to download directly via fetch
        try {
          const response = await fetch(resultUrl);
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${prompt.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}.${type === 'image' ? 'png' : 'mp4'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started");
          } else {
            toast.error("Failed to download: " + (error.message || 'Bucket not found'));
          }
        } catch (fetchError: any) {
          toast.error("Failed to download: " + (error.message || fetchError.message || 'Unknown error'));
        }
      } else if (data?.signedUrl) {
        // Download using signed URL
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = `${prompt.substring(0, 50).replace(/[^a-z0-9]/gi, '_')}.${type === 'image' ? 'png' : 'mp4'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Failed to download file: " + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (generationId: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", generationId);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted successfully");
      setGenerations(generations.filter(g => g.id !== generationId));
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar credits={credits} />
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Your Gallery
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            All your AI-generated masterpieces in one beautiful collection
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your creations...</p>
          </div>
        ) : generations.length === 0 ? (
          <Card className="shadow-card-hover border-border/50 bg-card/90 backdrop-blur-xl max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="h-24 w-24 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                <ImageIcon className="h-12 w-12 text-white" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">No creations yet</h3>
                <p className="text-muted-foreground">Start your creative journey by generating your first masterpiece</p>
              </div>
              <Button 
                onClick={() => navigate("/generate")} 
                size="lg" 
                className="gap-2 shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-105"
              >
                <Sparkles className="h-5 w-5" />
                Start Creating
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {generations.map((gen, index) => (
              <Card 
                key={gen.id} 
                className="group shadow-card border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden hover:shadow-card-hover hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {gen.generation_type === "image" ? (
                    <img
                      src={gen.displayUrl}
                      alt={gen.prompt}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        if (e.currentTarget.src !== gen.result_url) {
                          e.currentTarget.src = gen.result_url;
                        } else {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <video
                      src={gen.displayUrl}
                      controls
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (e.currentTarget.src !== gen.result_url) {
                          e.currentTarget.src = gen.result_url;
                        }
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant="secondary" 
                      className="bg-card/90 backdrop-blur-sm border border-primary/30 shadow-lg"
                    >
                      {gen.generation_type}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm line-clamp-2 text-foreground font-medium leading-relaxed">
                    {gen.prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(gen.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-medium">{gen.provider}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                      onClick={() => handleDownload(gen.result_url, gen.prompt, gen.generation_type)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
                      onClick={() => handleDelete(gen.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;