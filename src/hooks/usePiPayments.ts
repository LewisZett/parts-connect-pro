import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Pi?: any;
  }
}

export interface PiPaymentArgs {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

async function ensurePiInit() {
  if (!window.Pi) throw new Error("Pi SDK not available. Open in Pi Browser.");
  await Promise.resolve(window.Pi.init({ version: "2.0", sandbox: true }));
}

function onIncompletePaymentFound(payment: any) {
  console.warn("[Pi] Incomplete payment found:", payment);
  const paymentId = payment?.identifier;
  const txid = payment?.transaction?.txid;
  if (paymentId && txid) {
    supabase.functions.invoke("pi-payments", {
      body: { action: "complete", paymentId, txid },
    });
  }
}

export function usePiPayments() {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async (args: PiPaymentArgs) => {
    setPaying(true);
    setError(null);
    try {
      await ensurePiInit();

      return await new Promise<{ paymentId: string; txid: string }>((resolve, reject) => {
        window.Pi!.createPayment(
          {
            amount: args.amount,
            memo: args.memo,
            metadata: args.metadata,
          },
          {
            onReadyForServerApproval: async (paymentId: string) => {
              const { data, error } = await supabase.functions.invoke("pi-payments", {
                body: { action: "approve", paymentId },
              });
              if (error || !data?.success) {
                console.error("[Pi] approve failed", error, data);
                reject(new Error(data?.error || "Server approval failed"));
              }
            },
            onReadyForServerCompletion: async (paymentId: string, txid: string) => {
              const { data, error } = await supabase.functions.invoke("pi-payments", {
                body: { action: "complete", paymentId, txid },
              });
              if (error || !data?.success) {
                console.error("[Pi] complete failed", error, data);
                reject(new Error(data?.error || "Server completion failed"));
                return;
              }
              resolve({ paymentId, txid });
            },
            onCancel: (paymentId: string) => {
              console.warn("[Pi] payment cancelled", paymentId);
              reject(new Error("Payment cancelled"));
            },
            onError: (err: Error, payment?: unknown) => {
              console.error("[Pi] payment error", err, payment);
              reject(err);
            },
            onIncompletePaymentFound,
          },
        );
      });
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setPaying(false);
    }
  }, []);

  return { paying, error, createPayment };
}
