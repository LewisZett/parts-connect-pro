import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePiPayments } from "@/hooks/usePiPayments";
import { Loader2 } from "lucide-react";

interface PlaceAdDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PlaceAdDialog({ open, onOpenChange }: PlaceAdDialogProps) {
  const { toast } = useToast();
  const { createPayment, paying } = usePiPayments();
  const [businessName, setBusinessName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [bid, setBid] = useState("");
  const [floor, setFloor] = useState<{ required_min: number; current_lowest: number | null; reserve: number; activeCount: number; totalSlots: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: config } = await supabase.from("ad_slots_config").select("*").eq("id", 1).single();
      if (!config) return;
      const { data: actives } = await supabase
        .from("ads").select("bid_amount").eq("status", "active")
        .order("bid_amount", { ascending: true });
      const activeCount = actives?.length ?? 0;
      const lowest = actives?.[0] ? Number(actives[0].bid_amount) : null;
      const inc = 1 + Number(config.min_increment_pct) / 100;
      const required = activeCount >= Number(config.total_slots) && lowest
        ? Math.max(Number(config.reserve_price), lowest * inc)
        : Number(config.reserve_price);
      setFloor({
        required_min: required,
        current_lowest: lowest,
        reserve: Number(config.reserve_price),
        activeCount,
        totalSlots: Number(config.total_slots),
      });
    })();
  }, [open]);

  const handleSubmit = async () => {
    const bidNum = Number(bid);
    if (!businessName.trim() || !bidNum || bidNum <= 0) {
      toast({ title: "Fill out business name and a valid bid", variant: "destructive" });
      return;
    }
    if (floor && bidNum < floor.required_min) {
      toast({
        title: "Bid too low",
        description: `Minimum required: ${floor.required_min.toFixed(2)} π`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("place-ad-bid", {
        body: {
          business_name: businessName.trim(),
          image_url: imageUrl.trim() || null,
          link_url: linkUrl.trim() || null,
          bid_amount: bidNum,
        },
      });
      if (error || !data?.ad_id) {
        toast({ title: "Bid failed", description: data?.error?.toString?.() ?? error?.message, variant: "destructive" });
        return;
      }
      const adId = data.ad_id as string;

      await createPayment({
        amount: bidNum,
        memo: `Ad slot bid for ${businessName.trim()}`,
        metadata: { productType: "ad_slot", adId },
      });

      toast({
        title: "Payment complete",
        description: "Your ad will appear once placement is finalized.",
      });
      onOpenChange(false);
      setBusinessName(""); setImageUrl(""); setLinkUrl(""); setBid("");
    } catch (e: any) {
      toast({ title: "Payment failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bid for an Ad Slot</DialogTitle>
          <DialogDescription>
            Payments are non-refundable. A successful bid guarantees a minimum placement period.
          </DialogDescription>
        </DialogHeader>

        {floor && (
          <div className="text-xs space-y-1 bg-muted/40 rounded-md p-3">
            <div>Slots filled: <strong>{floor.activeCount}/{floor.totalSlots}</strong></div>
            <div>Current lowest active bid: <strong>{floor.current_lowest != null ? `${floor.current_lowest.toFixed(2)} π` : "none"}</strong></div>
            <div>Reserve price: <strong>{floor.reserve.toFixed(2)} π</strong></div>
            <div>Minimum required bid: <strong className="text-primary">{floor.required_min.toFixed(2)} π</strong></div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="biz">Business / Ad Name</Label>
            <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="img">Image URL (optional)</Label>
            <Input id="img" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="link">Click-through Link (optional)</Label>
            <Input id="link" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="bid">Bid amount (π)</Label>
            <Input id="bid" type="number" min="0" step="0.01" value={bid} onChange={(e) => setBid(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || paying}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || paying}>
            {(submitting || paying) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Place bid & pay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
