import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Trash2, Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Generation {
  id: string;
  prompt: string;
  result_url: string;
  provider: string;
  generation_type: string;
  created_at: string;
}

const Gallery = () => {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [generations, setGenerations] = useState<Generation[]>([]);
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

  const fetchGenerations = async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load gallery");
    } else {
      setGenerations(data || []);
    }
    setIsLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <Navbar credits={credits} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-2 animate-slide-up">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Your Gallery
          </h1>
          <p className="text-muted-foreground">
            All your AI-generated creations in one place
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : generations.length === 0 ? (
          <Card className="shadow-card border-border/50 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
              <ImageIcon className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No generations yet</p>
              <Button onClick={() => navigate("/")} className="bg-gradient-primary">
                Start Creating
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {generations.map((gen) => (
              <Card key={gen.id} className="group shadow-card border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-glow transition-shadow">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {gen.generation_type === "image" ? (
                    <img
                      src={gen.result_url}
                      alt={gen.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <video
                      src={gen.result_url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant="secondary" className="bg-card/80 backdrop-blur-sm">
                      {gen.generation_type}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm line-clamp-2 text-foreground">{gen.prompt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                    <span>{gen.provider}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(gen.result_url, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
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