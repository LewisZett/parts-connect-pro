// Validates an ad bid and creates a pending ad row. Returns adId + required bid floor.
// Auth: requires a valid Supabase JWT in Authorization header.

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

const BodySchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  image_url: z.string().url().max(1024).optional().nullable(),
  link_url: z.string().url().max(1024).optional().nullable(),
  bid_amount: z.number().positive().max(1_000_000),
  part_id: z.string().uuid().optional().nullable(),
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
    const userId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;

    const { data: config } = await admin.from("ad_slots_config").select("*").eq("id", 1).single();
    if (!config) return json({ error: "Config missing" }, 500);

    const { data: actives } = await admin
      .from("ads")
      .select("id, bid_amount, guaranteed_until")
      .eq("status", "active")
      .order("bid_amount", { ascending: true });

    const activeCount = actives?.length ?? 0;
    const lowest = actives?.[0];
    const minIncrement = 1 + Number(config.min_increment_pct) / 100;

    let requiredMin = Number(config.reserve_price);
    if (activeCount >= Number(config.total_slots) && lowest) {
      requiredMin = Math.max(requiredMin, Number(lowest.bid_amount) * minIncrement);
    }

    if (input.bid_amount < requiredMin) {
      return json({
        error: "Bid too low",
        required_min: requiredMin,
        reserve_price: Number(config.reserve_price),
        current_lowest: lowest ? Number(lowest.bid_amount) : null,
        min_increment_pct: Number(config.min_increment_pct),
      }, 400);
    }

    const { data: ad, error: insErr } = await admin
      .from("ads")
      .insert({
        user_id: userId,
        part_id: input.part_id ?? null,
        business_name: input.business_name,
        image_url: input.image_url ?? null,
        link_url: input.link_url ?? null,
        bid_amount: input.bid_amount,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !ad) return json({ error: insErr?.message ?? "Insert failed" }, 500);

    return json({
      ad_id: ad.id,
      required_min: requiredMin,
      reserve_price: Number(config.reserve_price),
      current_lowest: lowest ? Number(lowest.bid_amount) : null,
      active_count: activeCount,
      total_slots: Number(config.total_slots),
    });
  } catch (e) {
    console.error("place-ad-bid error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
