import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Home, Search, Package, MessageSquare, User } from "lucide-react";

interface NavbarProps {
  user: any;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
    navigate("/auth");
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl hidden sm:block">PartsMatch Pro</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <Home className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">
                  <Search className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Browse</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my-listings">
                  <Package className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">My Listings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/matches">
                  <MessageSquare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Matches</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">
                  <User className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;