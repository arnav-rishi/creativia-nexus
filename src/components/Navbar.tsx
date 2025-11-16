import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Image, User, CreditCard, Clock, Home, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface NavbarProps {
  credits?: number;
}

const Navbar = ({ credits = 0 }: NavbarProps) => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <nav className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            AI Studio
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Credits Display */}
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary/20 to-primary/20 border border-secondary/30 shadow-glow-secondary hover:scale-105 transition-transform">
            <div className="h-8 w-8 rounded-lg bg-gradient-secondary flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Credits</span>
              <span className="text-sm font-bold text-foreground">{credits}</span>
            </div>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-11 w-11 rounded-full hover:scale-110 transition-transform">
                <Avatar className="h-11 w-11 border-2 border-primary/50">
                  <AvatarFallback className="bg-gradient-accent text-white font-bold text-lg">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-xl border-border/50">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span>{credits} credits available</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              
              <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer hover:bg-primary/10">
                <Home className="mr-3 h-4 w-4 text-primary" />
                <span className="font-medium">Home</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/generate")} className="cursor-pointer hover:bg-secondary/10">
                <Sparkles className="mr-3 h-4 w-4 text-secondary" />
                <span className="font-medium">Generate</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer hover:bg-accent/10">
                <DollarSign className="mr-3 h-4 w-4 text-accent" />
                <span className="font-medium">Pricing</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/jobs")} className="cursor-pointer hover:bg-warning/10">
                <Clock className="mr-3 h-4 w-4 text-warning" />
                <span className="font-medium">Jobs</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/gallery")} className="cursor-pointer hover:bg-primary/10">
                <Image className="mr-3 h-4 w-4 text-primary" />
                <span className="font-medium">Gallery</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer hover:bg-secondary/10">
                <User className="mr-3 h-4 w-4 text-secondary" />
                <span className="font-medium">Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-border/50" />
              
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive hover:bg-destructive/10">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;