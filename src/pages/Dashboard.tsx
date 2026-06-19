import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Upload, Zap, Shield, CheckCircle } from "lucide-react";
import { AdSlotsShowcase } from "@/components/AdSlotsShowcase";


const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
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

  useEffect(() => {
    const fetchBoostedParts = async () => {
      setBoostedLoading(true);
      try {
        const now = new Date().toISOString();
        const { data: partsData, error } = await supabase
          .from("parts")
          .select("id, part_name, category, condition, price, location, image_url, supplier_id, boosted_until")
          .gt("boosted_until", now)
          .eq("status", "available")
          .order("boosted_until", { ascending: false })
          .limit(12);

        if (error || !partsData || partsData.length === 0) {
          setBoostedParts([]);
          setBoostedLoading(false);
          return;
        }

        const supplierIds = Array.from(new Set(partsData.map((p: any) => p.supplier_id).filter(Boolean)));
        let profilesById: Record<string, any> = {};
        if (supplierIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("public_profiles")
            .select("id, full_name, trade_type")
            .in("id", supplierIds);
          if (profilesData) {
            profilesById = Object.fromEntries(profilesData.map((p: any) => [p.id, p]));
          }
        }

        const enriched = partsData.map((p: any) => ({
          ...p,
          public_profiles: profilesById[p.supplier_id] ?? null,
        }));

        // Duplicate the list so the marquee can scroll seamlessly
        setBoostedParts([...enriched, ...enriched]);
      } catch (e) {
        console.error("Error fetching boosted parts:", e);
        setBoostedParts([]);
      } finally {
        setBoostedLoading(false);
      }
    };

    fetchBoostedParts();
  }, []);

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
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground font-orbitron">
            Welcome to PartMatch
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The smart marketplace connecting spares/parts suppliers and buyers
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/browse")}>
              Browse Parts
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/my-listings")}>
              List Parts
            </Button>
          </div>
        </div>

        {/* How It Works Section */}
        <Accordion
          type="single"
          collapsible
          className="w-full"
          onValueChange={(value) => setHowItWorksOpen(value === "how-it-works")}
        >
          <AccordionItem value="how-it-works" className="border-none">
            <AccordionTrigger className="text-3xl md:text-4xl font-bold text-foreground font-orbitron hover:no-underline cursor-pointer">
              <span className="flex-1 text-center">How It Works</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground max-w-2xl mx-auto text-center mb-8">
                Get started in just four simple steps
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Step 1 */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="pt-8 pb-6 space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-2">
                        1
                      </div>
                      <h3 className="text-xl font-semibold text-foreground font-orbitron">
                        List or Request Parts
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Add parts you want to sell or create requests for parts you need
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="pt-8 pb-6 space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-2">
                        2
                      </div>
                      <h3 className="text-xl font-semibold text-foreground font-orbitron">
                        Get Matched Instantly
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Our system automatically connects buyers with suppliers
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3 */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="pt-8 pb-6 space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-2">
                        3
                      </div>
                      <h3 className="text-xl font-semibold text-foreground font-orbitron">
                        Connect Securely
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Chat safely in-app - contact info is shared only when both parties agree
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4 */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <CardContent className="pt-8 pb-6 space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-2">
                        4
                      </div>
                      <h3 className="text-xl font-semibold text-foreground font-orbitron">
                        Complete the Deal
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Finalize your transaction and rate your experience
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Boosted Parts Marquee — only when How It Works is collapsed */}
        {!howItWorksOpen && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <Rocket className="h-5 w-5 text-secondary" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground font-orbitron">
                Featured Listings
              </h2>
              <Rocket className="h-5 w-5 text-secondary" />
            </div>

            {boostedLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : boostedParts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No boosted listings right now — be the first to boost yours!
              </p>
            ) : (
              <div className="relative overflow-hidden py-2">
                {/* Fade edges */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />

                <div className="flex gap-4 animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
                  {boostedParts.map((part, idx) => (
                    <button
                      key={`${part.id}-${idx}`}
                      onClick={() => navigate("/browse")}
                      className="inline-flex items-center gap-3 bg-card border border-primary/20 rounded-full px-4 py-2 shadow-soft hover:shadow-medium hover:border-primary/40 transition-all duration-200 group"
                    >
                      {part.image_url ? (
                        <img
                          src={part.image_url}
                          alt={part.part_name}
                          className="w-10 h-10 rounded-full object-cover border border-primary/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground font-orbitron text-sm group-hover:text-primary transition-colors">
                            {part.part_name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-secondary/20 text-secondary border border-secondary/40">
                            BOOSTED
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{part.category}</span>
                          {part.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {part.location}
                              </span>
                            </>
                          )}
                          {part.price !== null && (
                            <>
                              <span>•</span>
                              <span className="text-primary font-semibold">${part.price}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;