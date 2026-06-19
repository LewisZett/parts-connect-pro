// Admin-only edge function for managing ad slots config and removing ads.
// Requires JWT + 'admin' role.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ConfigSchema = z.object({
  reserve_price: z.number().positive().max(1_000_000).optional(),
  min_increment_pct: z.number().min(0).max(1000).optional(),
  guaranteed_hours: z.number().int().min(1).max(720).optional(),
  total_slots: z.number().int().min(1).max(20).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action } = body ?? {};

    if (action === "update_config") {
      const parsed = ConfigSchema.safeParse(body.config ?? {});
      if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
      const update = { ...parsed.data, updated_at: new Date().toISOString() };
      const { error } = await admin.from("ad_slots_config").update(update).eq("id", 1);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "remove_ad") {
      const adId = String(body.ad_id ?? "");
      if (!adId) return json({ error: "Missing ad_id" }, 400);
      const { data: ad } = await admin.from("ads").select("user_id, bid_amount").eq("id", adId).single();
      const { error } = await admin
        .from("ads")
        .update({ status: "removed", slot_position: null })
        .eq("id", adId);
      if (error) return json({ error: error.message }, 500);
      if (ad) {
        await admin.from("bids_history").insert({
          ad_id: adId, user_id: ad.user_id, amount: ad.bid_amount, action: "removed",
        });
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-ads error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
