import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
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
    fetchProfile(session.user.id);
    fetchCredits(session.user.id);
    fetchTransactions(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) setProfile(data);
    setIsLoading(false);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (data) setCredits(data);
  };

  const fetchTransactions = async (userId: string) => {
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setTransactions(data);
  };

  const handleBuyCredits = () => {
    toast.info("Stripe payment integration coming soon!");
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <Navbar credits={credits?.balance || 0} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6 animate-slide-up">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your account and credits
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile?.full_name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credit Balance
                </CardTitle>
                <CardDescription>Purchase more credits to continue creating</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <p className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {credits?.balance || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Available Credits</p>
                </div>
                <Button 
                  onClick={handleBuyCredits} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Buy Credits
                </Button>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Purchased</p>
                    <p className="text-lg font-semibold">{credits?.total_purchased || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-semibold">{credits?.total_spent || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your credit activity</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            transaction.type === "purchase" || transaction.type === "bonus"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {transaction.type}
                        </Badge>
                        <span
                          className={`font-bold ${
                            transaction.amount > 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;