import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  job_type: string;
  prompt: string;
  status: string;
  provider: string;
  cost_credits: number;
  error_message: string | null;
  created_at: string;
  result_url: string | null;
}

const Jobs = () => {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    // Set up polling for job updates
    const interval = setInterval(() => {
      if (user) {
        fetchJobs(user.id, true);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchCredits(session.user.id);
    fetchJobs(session.user.id);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    if (data) setCredits(data.balance);
  };

  const fetchJobs = async (userId: string, silent = false) => {
    if (!silent) setIsLoading(true);
    
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (!silent) toast.error("Failed to load jobs");
    } else {
      setJobs(data || []);
    }
    
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    await fetchJobs(user.id);
    setIsRefreshing(false);
    toast.success("Jobs refreshed");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "processing":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <Navbar credits={credits} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-2 animate-slide-up flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Generation Jobs
            </h1>
            <p className="text-muted-foreground">
              Track the status of your AI generation requests
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="shadow-card border-border/50 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No jobs yet</p>
              <Button onClick={() => navigate("/")} className="bg-gradient-primary">
                Start Creating
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {jobs.map((job) => (
              <Card key={job.id} className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <h3 className="font-semibold">{job.job_type.replace(/_/g, " ").toUpperCase()}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(job.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm">{job.prompt}</p>
                      
                      {job.error_message && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive">{job.error_message}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <Badge variant="outline">
                          {job.provider}
                        </Badge>
                        <Badge variant="outline">
                          {job.cost_credits} credits
                        </Badge>
                      </div>
                    </div>
                    
                    {job.result_url && job.status === "completed" && (
                      <Button
                        onClick={() => navigate("/gallery")}
                        className="bg-gradient-primary"
                      >
                        View Result
                      </Button>
                    )}
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

export default Jobs;