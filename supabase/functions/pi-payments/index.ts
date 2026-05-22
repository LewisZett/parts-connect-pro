// Pi Network U2A payments: approve + complete server-to-server.
// Endpoints (POST JSON):
//   { action: "approve",  paymentId, payment? }
//   { action: "complete", paymentId, txid }
// Requires PI_NETWORK_API_KEY env var.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PI_API = "https://api.minepi.com";
const PI_KEY = Deno.env.get("PI_NETWORK_API_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function piFetch(path: string, init: RequestInit = {}) {
  return fetch(`${PI_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Key ${PI_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!PI_KEY) return json({ success: false, error: "PI_NETWORK_API_KEY not configured" }, 500);

  try {
    const body = await req.json();
    const { action, paymentId } = body ?? {};
    if (!action || !paymentId) return json({ success: false, error: "Missing action or paymentId" }, 400);

    if (action === "approve") {
      // Fetch payment details from Pi to validate amount/memo/metadata server-side.
      const detailsRes = await piFetch(`/v2/payments/${paymentId}`);
      if (!detailsRes.ok) {
        const t = await detailsRes.text();
        console.error("Pi GET payment failed:", detailsRes.status, t);
        return json({ success: false, error: "Pi payment lookup failed" }, 502);
      }
      const details = await detailsRes.json();

      // Persist a 'created' record (idempotent upsert by payment_id).
      await supabase.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          pi_uid: details.user_uid,
          amount: details.amount,
          memo: details.memo,
          metadata: details.metadata,
          product_type: details?.metadata?.productType ?? "unknown",
          part_id: details?.metadata?.partId ?? null,
          status: "approved",
          approved_at: new Date().toISOString(),
        },
        { onConflict: "payment_id" },
      );

      const approveRes = await piFetch(`/v2/payments/${paymentId}/approve`, { method: "POST" });
      if (!approveRes.ok) {
        const t = await approveRes.text();
        console.error("Pi approve failed:", approveRes.status, t);
        return json({ success: false, error: "Pi approve failed" }, 502);
      }
      return json({ success: true });
    }

    if (action === "complete") {
      const { txid } = body;
      if (!txid) return json({ success: false, error: "Missing txid" }, 400);

      const completeRes = await piFetch(`/v2/payments/${paymentId}/complete`, {
        method: "POST",
        body: JSON.stringify({ txid }),
      });
      if (!completeRes.ok) {
        const t = await completeRes.text();
        console.error("Pi complete failed:", completeRes.status, t);
        return json({ success: false, error: "Pi complete failed" }, 502);
      }

      // Load record to apply product effect
      const { data: rec } = await supabase
        .from("pi_payments")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();

      await supabase
        .from("pi_payments")
        .update({ status: "completed", txid, completed_at: new Date().toISOString() })
        .eq("payment_id", paymentId);

      // Product fulfillment: Premium Listing Boost -> set boosted_until = now + 7 days
      if (rec?.product_type === "listing_boost" && rec?.part_id) {
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("parts").update({ boosted_until: until }).eq("id", rec.part_id);
      }

      return json({ success: true });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    console.error("pi-payments error:", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
