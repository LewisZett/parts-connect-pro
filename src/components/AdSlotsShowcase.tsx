import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Package, Clock, Rocket } from "lucide-react";
import { PlaceAdDialog } from "./PlaceAdDialog";

interface Ad {
  id: string;
  business_name: string;
  image_url: string | null;
  link_url: string | null;
  bid_amount: number;
  slot_position: number | null;
  guaranteed_until: string | null;
  status: string;
}

function formatRemaining(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h guaranteed`;
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m guaranteed`;
}

export function AdSlotsShowcase() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [totalSlots, setTotalSlots] = useState(5);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, forceTick] = useState(0);

  const fetchAds = async () => {
    const { data } = await supabase
      .from("ads")
      .select("id, business_name, image_url, link_url, bid_amount, slot_position, guaranteed_until, status")
      .eq("status", "active")
      .order("bid_amount", { ascending: false });
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("ad_slots_config").select("total_slots").eq("id", 1).single().then(({ data }) => {
      if (data?.total_slots) setTotalSlots(Number(data.total_slots));
    });
    fetchAds();

    const channel = supabase
      .channel("ads-showcase")
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, () => fetchAds())
      .subscribe();

    const tick = setInterval(() => forceTick((n) => n + 1), 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, []);

  const filled: (Ad | null)[] = Array.from({ length: totalSlots }, (_, i) => ads[i] ?? null);
  const duplicated = [...filled, ...filled];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-center gap-2">
        <Rocket className="h-5 w-5 text-secondary" />
        <h2 className="text-xl md:text-2xl font-bold text-foreground font-orbitron">
          Featured Ad Slots
        </h2>
        <Rocket className="h-5 w-5 text-secondary" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {ads.length}/{totalSlots} slots filled · bid to take the lowest spot
      </p>

      {loading ? null : (
        <div className="relative overflow-hidden py-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />

          <div className="flex gap-4 animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
            {duplicated.map((ad, idx) => (
              <SlotCard key={`${ad?.id ?? "open"}-${idx}`} ad={ad} index={idx % totalSlots} />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button onClick={() => setDialogOpen(true)} size="sm" variant="secondary">
          <Crown className="h-4 w-4 mr-1" /> Bid for a slot
        </Button>
      </div>

      <PlaceAdDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function SlotCard({ ad, index }: { ad: Ad | null; index: number }) {
  const position = index + 1;

  if (!ad) {
    return (
      <Card className="inline-flex items-center gap-3 px-4 py-2 border-dashed border-muted-foreground/40 bg-muted/30 rounded-full">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-left">
          <div className="font-orbitron text-sm text-muted-foreground">Slot #{position} open</div>
          <div className="text-xs text-muted-foreground">Bid to claim</div>
        </div>
      </Card>
    );
  }

  const Body = (
    <>
      {ad.image_url ? (
        <img
          src={ad.image_url}
          alt={ad.business_name}
          className="w-10 h-10 rounded-full object-cover border border-secondary/40"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/40">
          <Package className="w-5 h-5 text-secondary" />
        </div>
      )}
      <div className="text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground font-orbitron text-sm">
            {ad.business_name}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            #{position}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary font-semibold">{Number(ad.bid_amount).toFixed(2)} π</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> {formatRemaining(ad.guaranteed_until)}
          </span>
        </div>
      </div>
    </>
  );

  const className =
    "inline-flex items-center gap-3 bg-card border border-secondary/30 rounded-full px-4 py-2 shadow-soft hover:shadow-medium hover:border-secondary/60 transition-all duration-200";

  return ad.link_url ? (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={className}>
      {Body}
    </a>
  ) : (
    <div className={className}>{Body}</div>
  );
}
