import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Image, User, CreditCard, Clock } from "lucide-react";
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
    <nav className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-body font-semibold text-foreground">
            AI Studio
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
            <CreditCard className="h-3.5 w-3.5 text-secondary" />
            <span className="text-caption font-medium">{credits}</span>
            <span className="text-caption text-muted-foreground">credits</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-primary text-caption font-medium text-white">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-popover/95 backdrop-blur-md border-border/50">
              <DropdownMenuLabel className="pb-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-caption font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{credits} credits</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem onClick={() => navigate("/")} className="text-caption">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/generate")} className="text-caption">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Generate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing")} className="text-caption">
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Pricing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/jobs")} className="text-caption">
                <Clock className="mr-2 h-3.5 w-3.5" />
                Jobs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/gallery")} className="text-caption">
                <Image className="mr-2 h-3.5 w-3.5" />
                Gallery
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-caption">
                <User className="mr-2 h-3.5 w-3.5" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem onClick={handleSignOut} className="text-caption text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
