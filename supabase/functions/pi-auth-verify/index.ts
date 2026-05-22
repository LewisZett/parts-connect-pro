// Verifies a Pi Network access token by calling the official Pi API /v2/me endpoint.
// No Pi Network API key required for this flow.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing accessToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const piRes = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!piRes.ok) {
      const text = await piRes.text();
      console.error("Pi /v2/me validation failed:", piRes.status, text);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Pi access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const piUser = await piRes.json();
    // piUser typically: { uid: string, username: string }

    // Establish a lightweight session payload. Client persists this.
    const session = {
      provider: "pi-network",
      uid: piUser.uid,
      username: piUser.username,
      issuedAt: Date.now(),
    };

    return new Response(
      JSON.stringify({ success: true, user: piUser, session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("pi-auth-verify error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
