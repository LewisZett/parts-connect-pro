import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search, MessageSquare, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

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
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 glow-cyan"></div>
          <p className="text-primary font-orbitron text-xl">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-pulse">
              PARTSMATCH PRO
            </h1>
            <p className="text-xl text-foreground/80 font-rajdhani">
              CONNECT • TRADE • DOMINATE THE MARKET
            </p>
          </div>


          <Card className="bg-gradient-to-br from-card/50 to-card/30 border-primary/30 glass-card">
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-start space-x-4 group">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold glow-cyan group-hover:scale-110 transition-transform">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-primary text-lg font-orbitron">DEPLOY ASSETS</h3>
                  <p className="text-sm text-foreground/80">
                    List parts for sale or create requests for required components
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-accent text-secondary-foreground flex items-center justify-center flex-shrink-0 font-bold glow-purple group-hover:scale-110 transition-transform">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-secondary text-lg font-orbitron">AUTO-MATCH ENGAGED</h3>
                  <p className="text-sm text-foreground/80">
                    AI system instantly connects suppliers with requesters
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-primary text-accent-foreground flex items-center justify-center flex-shrink-0 font-bold glow-magenta group-hover:scale-110 transition-transform">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-accent text-lg font-orbitron">SECURE CHANNEL</h3>
                  <p className="text-sm text-foreground/80">
                    Encrypted in-app comms - contact data shared on mutual consent
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold glow-cyan group-hover:scale-110 transition-transform">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-primary text-lg font-orbitron">MISSION COMPLETE</h3>
                  <p className="text-sm text-foreground/80">
                    Execute transaction and rate performance metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;