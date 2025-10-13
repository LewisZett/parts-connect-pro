import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Edit } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [tradeType, setTradeType] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
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

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setTradeType(data.trade_type || "");
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          trade_type: tradeType,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      setEditing(false);
      fetchProfile(user.id);
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground mb-6">Manage your account information</p>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle>{profile?.full_name || "User"}</CardTitle>
                    <CardDescription>{profile?.email}</CardDescription>
                  </div>
                </div>
                {!editing && (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradeType">Trade Type</Label>
                    <Select value={tradeType} onValueChange={setTradeType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone_repair">Phone Repair</SelectItem>
                        <SelectItem value="computer_tech">Computer Tech</SelectItem>
                        <SelectItem value="car_mechanic">Car Mechanic</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="appliance_repair">Appliance Repair</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="general">General/Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProfile}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-lg">{profile?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Trade Type</Label>
                    <p className="text-lg capitalize">{profile?.trade_type?.replace("_", " ")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Verified</Label>
                    <p className="text-lg">{profile?.is_verified ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Member Since</Label>
                    <p className="text-lg">
                      {new Date(profile?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Parts Listed</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requests Made</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Matches</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">N/A</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;