import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Zap, Shield, CheckCircle } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-primary font-orbitron text-xl">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full">
          <Navbar user={user} />
          
          <main className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold text-primary mb-4 tracking-wider">
                  PARTSPRO
                </h1>
                <p className="text-xl text-muted-foreground">
                  Where Supply Meets Demand in Real-Time
                </p>
              </div>

              <div className="text-center">
                <Button 
                  size="lg"
                  onClick={() => navigate("/my-listings")}
                  className="text-lg px-8 py-6"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  LIST SPARES
                </Button>
              </div>

              <Card className="bg-card/95 backdrop-blur-sm border-primary/20 shadow-large">
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-start space-x-4 group">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold shadow-medium group-hover:scale-110 transition-transform">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Upload className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold text-primary">LIST SPARES</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Upload your construction parts inventory or requirements. Our system processes bulk data instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold shadow-medium group-hover:scale-110 transition-transform">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-5 w-5 text-accent" />
                        <h3 className="text-xl font-bold text-accent">Auto-Match Engaged</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Advanced AI algorithms scan the network and identify optimal matches in seconds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold shadow-medium group-hover:scale-110 transition-transform">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="h-5 w-5 text-secondary" />
                        <h3 className="text-xl font-bold text-secondary">Secure Channel</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Connect through our encrypted messaging system. Negotiate terms, share details, close deals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold shadow-medium group-hover:scale-110 transition-transform">
                      4
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold text-primary">Mission Complete</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Rate your experience. Build your reputation. Unlock the next opportunity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
