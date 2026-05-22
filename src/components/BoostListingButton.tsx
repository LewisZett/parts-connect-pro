import { usePiPayments } from "@/hooks/usePiPayments";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Rocket } from "lucide-react";

interface BoostListingButtonProps {
  partId: string;
  partName: string;
  amount?: number; // Pi
  className?: string;
}

export function BoostListingButton({
  partId,
  partName,
  amount = 1,
  className,
}: BoostListingButtonProps) {
  const { paying, createPayment } = usePiPayments();
  const { toast } = useToast();

  const handleBoost = async () => {
    try {
      await createPayment({
        amount,
        memo: `Premium listing boost: ${partName}`,
        metadata: { productType: "listing_boost", partId, days: 7 },
      });
      toast({
        title: "Boost activated",
        description: `${partName} is featured for 7 days.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: e?.message || "Could not complete Pi payment.",
      });
    }
  };

  return (
    <Button onClick={handleBoost} disabled={paying} className={className} variant="secondary">
      <Rocket className="mr-2 h-4 w-4" />
      {paying ? "Processing…" : `Boost listing (${amount} π)`}
    </Button>
  );
}
