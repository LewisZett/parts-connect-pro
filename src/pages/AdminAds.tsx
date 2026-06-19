import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

const AdminAds = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) {
        refresh();
      }
    })();
  }, [navigate]);

  const refresh = async () => {
    const { data: cfg } = await supabase.from("ad_slots_config").select("*").eq("id", 1).single();
    setConfig(cfg);
    const { data: allAds } = await supabase
      .from("ads")
      .select("*")
      .in("status", ["active", "waiting", "pending"])
      .order("status")
      .order("bid_amount", { ascending: false });
    setAds(allAds ?? []);
  };

  const updateConfig = async () => {
    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-ads", {
      body: {
        action: "update_config",
        config: {
          reserve_price: Number(config.reserve_price),
          min_increment_pct: Number(config.min_increment_pct),
          guaranteed_hours: Number(config.guaranteed_hours),
          total_slots: Number(config.total_slots),
        },
      },
    });
    setSaving(false);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Config updated" }); refresh(); }
  };

  const removeAd = async (id: string) => {
    const { error } = await supabase.functions.invoke("admin-ads", {
      body: { action: "remove_ad", ad_id: id },
    });
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Ad removed" }); refresh(); }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <AppLayout user={user}>
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-6">
              <p>You do not have admin access.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold font-orbitron">Ad Slots Admin</h1>

        {config && (
          <Card>
            <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Reserve price (π)</Label>
                <Input type="number" step="0.01" value={config.reserve_price} onChange={(e) => setConfig({ ...config, reserve_price: e.target.value })} />
              </div>
              <div>
                <Label>Min bid increment (%)</Label>
                <Input type="number" step="0.1" value={config.min_increment_pct} onChange={(e) => setConfig({ ...config, min_increment_pct: e.target.value })} />
              </div>
              <div>
                <Label>Guaranteed hours</Label>
                <Input type="number" value={config.guaranteed_hours} onChange={(e) => setConfig({ ...config, guaranteed_hours: e.target.value })} />
              </div>
              <div>
                <Label>Total slots</Label>
                <Input type="number" value={config.total_slots} onChange={(e) => setConfig({ ...config, total_slots: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={updateConfig} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save config
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Ads</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ads.length === 0 ? <p className="text-sm text-muted-foreground">No ads.</p> : ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-3 border rounded-md p-3">
                <Badge variant={ad.status === "active" ? "default" : "secondary"}>{ad.status}</Badge>
                <div className="flex-1">
                  <div className="font-semibold">{ad.business_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Number(ad.bid_amount).toFixed(2)} π
                    {ad.slot_position && ` · slot #${ad.slot_position}`}
                    {ad.guaranteed_until && ` · until ${new Date(ad.guaranteed_until).toLocaleString()}`}
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeAd(ad.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminAds;
