import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Image, User, CreditCard, Clock, ArrowUpRight, Zap, Video, ImageIcon, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NavbarProps {
  credits?: number;
}

const Navbar = ({ credits = 0 }: NavbarProps) => {
  const [user, setUser] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className={`bg-transparent fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">
            AI Studio
          </span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive("/")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Home
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger 
                  className={cn(
                    "px-4 py-2 h-auto rounded-full text-sm font-medium bg-transparent hover:bg-muted/50 data-[state=open]:bg-foreground data-[state=open]:text-background",
                    isActive("/generate") ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Studio
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[500px] p-6 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left column */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Create</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Generate stunning AI content with our advanced models and intuitive interface.
                        </p>
                        <Link
                          to="/generate"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Go to Studio <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* Right column - Features */}
                      <div className="space-y-3">
                        <Link
                          to="/generate?mode=text"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <Zap className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Text to Image</p>
                            <p className="text-xs text-muted-foreground">Generate images from text</p>
                          </div>
                        </Link>
                        <Link
                          to="/generate?mode=image"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <ImageIcon className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Image to Image</p>
                            <p className="text-xs text-muted-foreground">Transform existing images</p>
                          </div>
                        </Link>
                        <Link
                          to="/generate?mode=video"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <Video className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Video Generation</p>
                            <p className="text-xs text-muted-foreground">Create AI-powered videos</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Link
            to="/gallery"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive("/gallery")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Gallery
          </Link>

          <Link
            to="/jobs"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive("/jobs")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Jobs
          </Link>

          <Link
            to="/pricing"
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive("/pricing")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Pricing
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Credits badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/30">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium">{credits}</span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>

          {/* Generate CTA */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/generate")}
            className="hidden sm:inline-flex rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground gap-1.5"
          >
            Create <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-muted/50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-primary text-xs font-medium text-white">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 rounded-xl">
              <DropdownMenuLabel className="pb-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{credits} credits available</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />
              
              {/* Mobile nav items */}
              <div className="md:hidden">
                <DropdownMenuItem onClick={() => navigate("/")} className="text-sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/generate")} className="text-sm">
                  <Zap className="mr-2 h-4 w-4" />
                  Generate
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
              </div>

              <DropdownMenuItem onClick={() => navigate("/gallery")} className="text-sm">
                <Image className="mr-2 h-4 w-4" />
                Gallery
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/jobs")} className="text-sm">
                <Clock className="mr-2 h-4 w-4" />
                Jobs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing")} className="text-sm">
                <CreditCard className="mr-2 h-4 w-4" />
                Pricing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-sm">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={handleSignOut} className="text-sm text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
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
