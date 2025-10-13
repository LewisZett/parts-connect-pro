import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { z } from "zod";

const partSchema = z.object({
  part_name: z.string().min(2, "Part name must be at least 2 characters").max(100),
  category: z.string().min(1, "Category is required"),
  condition: z.enum(["new", "used", "refurbished"]),
  price: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

const requestSchema = z.object({
  part_name: z.string().min(2, "Part name must be at least 2 characters").max(100),
  category: z.string().min(1, "Category is required"),
  condition_preference: z.string().optional(),
  max_price: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

const MyListings = () => {
  const [user, setUser] = useState<any>(null);
  const [myParts, setMyParts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"part" | "request">("part");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    part_name: "",
    category: "",
    condition: "new",
    price: "",
    max_price: "",
    description: "",
    location: "",
    condition_preference: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchMyData(session.user.id);
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

  const fetchMyData = async (userId: string) => {
    setLoading(true);
    const [partsResult, requestsResult] = await Promise.all([
      supabase.from("parts").select("*").eq("supplier_id", userId),
      supabase.from("part_requests").select("*").eq("requester_id", userId),
    ]);

    if (partsResult.data) setMyParts(partsResult.data);
    if (requestsResult.data) setMyRequests(requestsResult.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (dialogType === "part") {
        const validation = partSchema.safeParse({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : undefined,
        });

        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.error.errors[0].message,
          });
          return;
        }

        const { error } = await supabase.from("parts").insert({
          supplier_id: user.id,
          part_name: formData.part_name,
          category: formData.category,
          condition: formData.condition,
          price: formData.price ? parseFloat(formData.price) : null,
          description: formData.description || null,
          location: formData.location || null,
        });

        if (error) throw error;
        toast({ title: "Part listed successfully!" });
      } else {
        const validation = requestSchema.safeParse({
          ...formData,
          max_price: formData.max_price ? parseFloat(formData.max_price) : undefined,
        });

        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.error.errors[0].message,
          });
          return;
        }

        const { error } = await supabase.from("part_requests").insert({
          requester_id: user.id,
          part_name: formData.part_name,
          category: formData.category,
          condition_preference: formData.condition_preference || null,
          max_price: formData.max_price ? parseFloat(formData.max_price) : null,
          description: formData.description || null,
          location: formData.location || null,
        });

        if (error) throw error;
        toast({ title: "Request created successfully!" });
      }

      setDialogOpen(false);
      setFormData({
        part_name: "",
        category: "",
        condition: "new",
        price: "",
        max_price: "",
        description: "",
        location: "",
        condition_preference: "",
      });
      fetchMyData(user.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (type: "part" | "request", id: string) => {
    try {
      const table = type === "part" ? "parts" : "part_requests";
      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;
      toast({ title: `${type === "part" ? "Part" : "Request"} deleted successfully!` });
      fetchMyData(user.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Listings</h1>
              <p className="text-muted-foreground">Manage your parts and requests</p>
            </div>
          </div>

          <Tabs defaultValue="parts" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="parts">My Parts ({myParts.length})</TabsTrigger>
              <TabsTrigger value="requests">My Requests ({myRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="parts" className="space-y-4">
              <Dialog open={dialogOpen && dialogType === "part"} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setDialogType("part"); setDialogOpen(true); }} className="mb-4">
                    <Plus className="mr-2 h-4 w-4" />
                    List a Part
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>List a Part</DialogTitle>
                    <DialogDescription>Add a part you want to sell</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="part_name">Part Name *</Label>
                      <Input
                        id="part_name"
                        value={formData.part_name}
                        onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition">Condition *</Label>
                      <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="refurbished">Refurbished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">List Part</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myParts.map((part) => (
                  <Card key={part.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{part.part_name}</CardTitle>
                      <CardDescription>{part.category} - {part.condition}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {part.description && <p className="text-sm mb-2">{part.description}</p>}
                      {part.price && <p className="text-xl font-bold text-primary mb-2">${part.price}</p>}
                      <p className="text-xs text-muted-foreground mb-3">Status: {part.status}</p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDelete("part", part.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {myParts.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">You haven't listed any parts yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <Dialog open={dialogOpen && dialogType === "request"} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setDialogType("request"); setDialogOpen(true); }} className="mb-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a Part Request</DialogTitle>
                    <DialogDescription>Tell us what part you're looking for</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="part_name_req">Part Name *</Label>
                      <Input
                        id="part_name_req"
                        value={formData.part_name}
                        onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category_req">Category *</Label>
                      <Input
                        id="category_req"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition_preference">Condition Preference</Label>
                      <Input
                        id="condition_preference"
                        value={formData.condition_preference}
                        onChange={(e) => setFormData({ ...formData, condition_preference: e.target.value })}
                        placeholder="e.g., new, used"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_price">Max Price ($)</Label>
                      <Input
                        id="max_price"
                        type="number"
                        step="0.01"
                        value={formData.max_price}
                        onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location_req">Location</Label>
                      <Input
                        id="location_req"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description_req">Description</Label>
                      <Textarea
                        id="description_req"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Request</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{request.part_name}</CardTitle>
                      <CardDescription>{request.category}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {request.description && <p className="text-sm mb-2">{request.description}</p>}
                      {request.max_price && <p className="text-lg font-semibold text-accent mb-2">
                        Budget: Up to ${request.max_price}
                      </p>}
                      <p className="text-xs text-muted-foreground mb-3">Status: {request.status}</p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDelete("request", request.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {myRequests.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">You haven't created any requests yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyListings;