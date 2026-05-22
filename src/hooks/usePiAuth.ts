import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Pi?: any;
  }
}

const STORAGE_KEY = "pi_network_session";
const SANDBOX_MODE = true; // set to false in production Pi Browser

export interface PiSession {
  provider: "pi-network";
  uid: string;
  username: string;
  accessToken: string;
  issuedAt: number;
}

let initPromise: Promise<void> | null = null;

function loadPiSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Pi) return Promise.resolve();
  return new Promise((resolve, reject) => {
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

async function ensurePiInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPiSdk();
      // Pi.init may be sync or return a Promise — await Promise.resolve to be safe
      await Promise.resolve(window.Pi!.init({ version: "2.0", sandbox: SANDBOX_MODE }));
    })().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

function onIncompletePaymentFound(payment: any) {
  // Complete any in-flight Pi payment found at auth time.
  console.warn("[Pi] Incomplete payment found, completing via backend:", payment);
  try {
    const paymentId = payment?.identifier;
    const txid = payment?.transaction?.txid;
    if (paymentId && txid) {
      supabase.functions.invoke("pi-payments", {
        body: { action: "complete", paymentId, txid },
      });
    }
  } catch (e) {
    console.error("[Pi] Failed to complete incomplete payment:", e);
  }
}


export function usePiAuth() {
  const [session, setSession] = useState<PiSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PiSession) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (): Promise<PiSession | null> => {
    setLoading(true);
    setError(null);
    try {
      await ensurePiInit();

      const authResult = await window.Pi!.authenticate(["username", "payments"], onIncompletePaymentFound);
      const accessToken: string = authResult?.accessToken;
      if (!accessToken) throw new Error("No accessToken returned by Pi.authenticate");

      // Server-side validation via /v2/me
      const { data, error: fnError } = await supabase.functions.invoke("pi-auth-verify", {
        body: { accessToken },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Pi token validation failed");

      const piSession: PiSession = {
        provider: "pi-network",
        uid: data.user.uid,
        username: data.user.username,
        accessToken,
        issuedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(piSession));
      setSession(piSession);
      return piSession;
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error("[Pi] sign-in failed:", msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return { session, loading, error, signIn, signOut };
}
