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

async function loadPiSdk(): Promise<void> {
  if (typeof window === "undefined") throw new Error("No window");
  if (window.Pi) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.minepi.com/pi-sdk.js"]',
    );
    const onLoad = () => (window.Pi ? resolve() : reject(new Error("Pi SDK failed to load")));
    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", () => reject(new Error("Pi SDK script error")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.minepi.com/pi-sdk.js";
    s.async = true;
    s.onload = onLoad;
    s.onerror = () => reject(new Error("Pi SDK script error"));
    document.head.appendChild(s);
  });
}

async function ensurePiInit() {
  await loadPiSdk();
  if (!window.Pi) throw new Error("Pi SDK not available. Open in Pi Browser.");
  await Promise.resolve(window.Pi.init({ version: "2.0", sandbox: true }));
}

let currentPiAccessToken: string | null = null;

async function ensurePaymentsScope(): Promise<string> {
  // Pi requires authenticating with the 'payments' scope before createPayment.
  const result = await window.Pi!.authenticate(["username", "payments"], onIncompletePaymentFound);
  const token: string | undefined = result?.accessToken;
  if (!token) throw new Error("Pi authentication did not return an access token");
  currentPiAccessToken = token;
  return token;
}

function onIncompletePaymentFound(payment: any) {
  console.warn("[Pi] Incomplete payment found:", payment);
  const paymentId = payment?.identifier;
  const txid = payment?.transaction?.txid;
  if (paymentId && txid && currentPiAccessToken) {
    supabase.functions.invoke("pi-payments", {
      body: { action: "complete", paymentId, txid, piAccessToken: currentPiAccessToken },
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
      const piAccessToken = await ensurePaymentsScope();

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
                body: { action: "approve", paymentId, piAccessToken },
              });
              if (error || !data?.success) {
                console.error("[Pi] approve failed", error, data);
                reject(new Error(data?.error || "Server approval failed"));
              }
            },
            onReadyForServerCompletion: async (paymentId: string, txid: string) => {
              const { data, error } = await supabase.functions.invoke("pi-payments", {
                body: { action: "complete", paymentId, txid, piAccessToken },
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
