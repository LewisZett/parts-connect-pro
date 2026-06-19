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

async function verifyPiUser(accessToken: string): Promise<{ uid: string; username?: string } | null> {
  try {
    const res = await fetch(`${PI_API}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.uid) return null;
    return { uid: data.uid, username: data.username };
  } catch (e) {
    console.error("Pi /v2/me failed:", e);
    return null;
  }
}

async function finalizeAdPlacement(adId: string, paymentRecId: string) {
  const { data: ad } = await supabase.from("ads").select("*").eq("id", adId).single();
  if (!ad || ad.status !== "pending") return;

  const { data: config } = await supabase.from("ad_slots_config").select("*").eq("id", 1).single();
  if (!config) return;
  const inc = 1 + Number(config.min_increment_pct) / 100;
  const totalSlots = Number(config.total_slots);
  const guaranteedMs = Number(config.guaranteed_hours) * 3600_000;

  const { data: actives } = await supabase
    .from("ads")
    .select("id, user_id, bid_amount, guaranteed_until")
    .eq("status", "active")
    .order("bid_amount", { ascending: true });
  const activeCount = actives?.length ?? 0;
  const lowest = actives?.[0];
  const now = new Date();

  const activate = async () => {
    await supabase.from("ads").update({
      status: "active",
      placed_at: now.toISOString(),
      guaranteed_until: new Date(now.getTime() + guaranteedMs).toISOString(),
      payment_id: paymentRecId,
    }).eq("id", adId);
    await supabase.from("bids_history").insert({
      ad_id: adId, user_id: ad.user_id, amount: ad.bid_amount, action: "placed",
    });
  };

  const wait = async () => {
    await supabase.from("ads").update({
      status: "waiting", payment_id: paymentRecId,
    }).eq("id", adId);
    await supabase.from("bids_history").insert({
      ad_id: adId, user_id: ad.user_id, amount: ad.bid_amount, action: "placed",
    });
  };

  if (activeCount < totalSlots && Number(ad.bid_amount) >= Number(config.reserve_price)) {
    await activate();
  } else if (
    lowest &&
    new Date(lowest.guaranteed_until).getTime() <= now.getTime() &&
    Number(ad.bid_amount) >= Number(lowest.bid_amount) * inc
  ) {
    // Displace lowest
    await supabase.from("ads").update({ status: "expired", slot_position: null }).eq("id", lowest.id);
    await supabase.from("bids_history").insert({
      ad_id: lowest.id, user_id: lowest.user_id, amount: lowest.bid_amount, action: "outbid",
    });
    await activate();
  } else {
    await wait();
  }

  // Recompute positions for active ads
  const { data: refreshed } = await supabase
    .from("ads")
    .select("id, bid_amount")
    .eq("status", "active")
    .order("bid_amount", { ascending: false });
  if (refreshed) {
    for (let i = 0; i < refreshed.length; i++) {
      await supabase.from("ads").update({ slot_position: i + 1 }).eq("id", refreshed[i].id);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!PI_KEY) return json({ success: false, error: "PI_NETWORK_API_KEY not configured" }, 500);

  try {
    const body = await req.json();
    const { action, paymentId, piAccessToken } = body ?? {};
    if (!action || !paymentId) return json({ success: false, error: "Missing action or paymentId" }, 400);

    // Require a Pi access token and verify it server-side so we know who is calling.
    if (!piAccessToken || typeof piAccessToken !== "string") {
      return json({ success: false, error: "Missing piAccessToken" }, 401);
    }
    const piUser = await verifyPiUser(piAccessToken);
    if (!piUser) {
      return json({ success: false, error: "Invalid Pi access token" }, 401);
    }

    if (action === "approve") {
      // Fetch payment details from Pi to validate amount/memo/metadata server-side.
      const detailsRes = await piFetch(`/v2/payments/${paymentId}`);
      if (!detailsRes.ok) {
        const t = await detailsRes.text();
        console.error("Pi GET payment failed:", detailsRes.status, t);
        return json({ success: false, error: "Pi payment lookup failed" }, 502);
      }
      const details = await detailsRes.json();

      // Ensure the caller owns this payment.
      if (details.user_uid !== piUser.uid) {
        return json({ success: false, error: "Forbidden: payment does not belong to caller" }, 403);
      }

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

      // Load existing record to confirm caller owns the payment.
      const { data: rec } = await supabase
        .from("pi_payments")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (rec && rec.pi_uid && rec.pi_uid !== piUser.uid) {
        return json({ success: false, error: "Forbidden: payment does not belong to caller" }, 403);
      }

      // If no prior record exists, double-check ownership via Pi API.
      if (!rec) {
        const detailsRes = await piFetch(`/v2/payments/${paymentId}`);
        if (!detailsRes.ok) {
          return json({ success: false, error: "Pi payment lookup failed" }, 502);
        }
        const details = await detailsRes.json();
        if (details.user_uid !== piUser.uid) {
          return json({ success: false, error: "Forbidden: payment does not belong to caller" }, 403);
        }
      }

      const completeRes = await piFetch(`/v2/payments/${paymentId}/complete`, {
        method: "POST",
        body: JSON.stringify({ txid }),
      });
      if (!completeRes.ok) {
        const t = await completeRes.text();
        console.error("Pi complete failed:", completeRes.status, t);
        return json({ success: false, error: "Pi complete failed" }, 502);
      }

      await supabase
        .from("pi_payments")
        .update({ status: "completed", txid, completed_at: new Date().toISOString() })
        .eq("payment_id", paymentId);

      // Product fulfillment: Premium Listing Boost -> set boosted_until = now + 7 days
      if (rec?.product_type === "listing_boost" && rec?.part_id) {
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("parts").update({ boosted_until: until }).eq("id", rec.part_id);
      }

      // Product fulfillment: Ad Slot bid -> finalize ad placement
      const adId = rec?.metadata?.adId as string | undefined;
      if (rec?.product_type === "ad_slot" && adId) {
        await finalizeAdPlacement(adId, rec.id);
      }

      return json({ success: true });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    console.error("pi-payments error:", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});

