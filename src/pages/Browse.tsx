import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, ShoppingCart, MapPin } from "lucide-react";

const Browse = () => {
  const [user, setUser] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchData();
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [partsResult, requestsResult] = await Promise.all([
      supabase.from("parts").select("*, public_profiles(full_name, trade_type)").eq("status", "available"),
      supabase.from("part_requests").select("*, public_profiles(full_name, trade_type)").eq("status", "active"),
    ]);

    if (partsResult.data) setParts(partsResult.data);
    if (requestsResult.data) setRequests(requestsResult.data);
    setLoading(false);
  };

  const handleCreateMatch = async (type: "part" | "request", itemId: string, ownerId: string) => {
    if (!user) return;

    try {
      const matchData = type === "part"
        ? { part_id: itemId, supplier_id: ownerId, requester_id: user.id }
        : { request_id: itemId, requester_id: ownerId, supplier_id: user.id };

      const { data: matchResult, error } = await supabase.from("matches").insert(matchData).select().single();

      if (error) throw error;

      // Get the item name for notifications
      let itemName = "Unknown Item";
      if (type === "part") {
        const part = parts.find(p => p.id === itemId);
        itemName = part?.part_name || "Unknown Part";
      } else {
        const request = requests.find(r => r.id === itemId);
        itemName = request?.part_name || "Unknown Request";
      }

      // Send notifications in background (don't await)
      supabase.functions.invoke("send-match-notification", {
        body: {
          matchId: matchResult.id,
          supplierId: matchData.supplier_id,
          requesterId: matchData.requester_id,
          itemName,
          itemType: type,
        },
      }).then(({ error: notifError }) => {
        if (notifError) {
          console.error("Error sending notifications:", notifError);
        } else {
          console.log("Notifications sent successfully");
        }
      });

      toast({
        title: "Match Created!",
        description: "Notifications sent. You can now start chatting with this user.",
      });
      navigate("/matches");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredParts = parts.filter(
    (part) =>
      part.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(
    (request) =>
      request.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Browse Parts & Requests</h1>
          <p className="text-muted-foreground mb-6">
            Find what you need or discover who needs what you have
          </p>

          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by part name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs defaultValue="parts" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="parts">Available Parts ({filteredParts.length})</TabsTrigger>
              <TabsTrigger value="requests">Part Requests ({filteredRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="parts" className="space-y-4">
              {filteredParts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No parts found matching your search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredParts.map((part) => (
                    <Card key={part.id} className="hover:shadow-medium transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg">{part.part_name}</CardTitle>
                          <Badge variant="secondary">{part.condition}</Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Package className="h-4 w-4 mr-1" />
                            {part.category}
                          </div>
                          {part.location && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-1" />
                              {part.location}
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {part.description && (
                          <p className="text-sm text-muted-foreground mb-3">{part.description}</p>
                        )}
                        {part.price && (
                          <p className="text-2xl font-bold text-primary mb-3">${part.price}</p>
                        )}
                        <div className="text-sm text-muted-foreground mb-3">
                          Listed by: {part.public_profiles?.full_name || "Anonymous"} ({part.public_profiles?.trade_type})
                        </div>
                        {part.supplier_id !== user?.id && (
                          <Button
                            className="w-full"
                            onClick={() => handleCreateMatch("part", part.id, part.supplier_id)}
                          >
                            Contact Supplier
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {filteredRequests.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No requests found matching your search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-medium transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg">{request.part_name}</CardTitle>
                          {request.condition_preference && (
                            <Badge variant="secondary">{request.condition_preference}</Badge>
                          )}
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Package className="h-4 w-4 mr-1" />
                            {request.category}
                          </div>
                          {request.location && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-1" />
                              {request.location}
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {request.description && (
                          <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
                        )}
                        {request.max_price && (
                          <p className="text-lg font-semibold text-accent mb-3">
                            Budget: Up to ${request.max_price}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground mb-3">
                          Requested by: {request.public_profiles?.full_name || "Anonymous"} ({request.public_profiles?.trade_type})
                        </div>
                        {request.requester_id !== user?.id && (
                          <Button
                            className="w-full"
                            onClick={() => handleCreateMatch("request", request.id, request.requester_id)}
                          >
                            I Have This Part
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Browse;