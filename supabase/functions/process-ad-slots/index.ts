// Background processor for ad slots. Intended to be called by pg_cron every 10 minutes.
// - Promotes highest waiting bid into the lowest expired-guarantee slot if it qualifies.
// - Recomputes slot_position for all active ads (highest bid -> position 1).
// - Logs actions to bids_history.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function recomputePositions() {
  const { data: actives } = await admin
    .from("ads")
    .select("id, bid_amount")
    .eq("status", "active")
    .order("bid_amount", { ascending: false });

  if (!actives) return;
  for (let i = 0; i < actives.length; i++) {
    await admin.from("ads").update({ slot_position: i + 1 }).eq("id", actives[i].id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data: config } = await admin.from("ad_slots_config").select("*").eq("id", 1).single();
    if (!config) return json({ error: "Config missing" }, 500);
    const inc = 1 + Number(config.min_increment_pct) / 100;
    const totalSlots = Number(config.total_slots);
    const now = new Date().toISOString();

    const promotions: string[] = [];
    const demotions: string[] = [];

    // Loop until no more valid promotions
    for (let i = 0; i < 10; i++) {
      const { data: actives } = await admin
        .from("ads")
        .select("id, user_id, bid_amount, guaranteed_until")
        .eq("status", "active")
        .order("bid_amount", { ascending: true });

      const { data: waitings } = await admin
        .from("ads")
        .select("id, user_id, bid_amount")
        .eq("status", "waiting")
        .order("bid_amount", { ascending: false })
        .limit(1);

      const activeCount = actives?.length ?? 0;
      const top = waitings?.[0];
      if (!top) break;

      // Open slot -> promote highest waiting if above reserve
      if (activeCount < totalSlots && Number(top.bid_amount) >= Number(config.reserve_price)) {
        await admin
          .from("ads")
          .update({
            status: "active",
            placed_at: now,
            guaranteed_until: new Date(Date.now() + Number(config.guaranteed_hours) * 3600_000).toISOString(),
          })
          .eq("id", top.id);
        await admin.from("bids_history").insert({
          ad_id: top.id, user_id: top.user_id, amount: top.bid_amount, action: "promoted",
        });
        promotions.push(top.id);
        continue;
      }

      const lowest = actives?.[0];
      if (!lowest) break;
      if (new Date(lowest.guaranteed_until).getTime() > Date.now()) break; // still guaranteed
      if (Number(top.bid_amount) < Number(lowest.bid_amount) * inc) break; // doesn't beat floor

      // Displace lowest with top waiting
      await admin
        .from("ads")
        .update({ status: "expired", slot_position: null })
        .eq("id", lowest.id);
      await admin.from("bids_history").insert({
        ad_id: lowest.id, user_id: lowest.user_id, amount: lowest.bid_amount, action: "outbid",
      });
      demotions.push(lowest.id);

      await admin
        .from("ads")
        .update({
          status: "active",
          placed_at: now,
          guaranteed_until: new Date(Date.now() + Number(config.guaranteed_hours) * 3600_000).toISOString(),
        })
        .eq("id", top.id);
      await admin.from("bids_history").insert({
        ad_id: top.id, user_id: top.user_id, amount: top.bid_amount, action: "promoted",
      });
      promotions.push(top.id);
    }

    await recomputePositions();

    return json({ ok: true, promotions, demotions });
  } catch (e) {
    console.error("process-ad-slots error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
