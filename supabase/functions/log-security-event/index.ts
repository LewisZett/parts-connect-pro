import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEvent {
  user_id?: string;
  event_type: string;
  event_category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event }: { event: SecurityEvent } = await req.json();

    if (!event || !event.event_type || !event.event_category || !event.severity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_type, event_category, severity" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve authenticated user (if any) from JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    let authedUserId: string | null = null;
    if (token) {
      const authClient = createClient(supabaseUrl, anonKey);
      const { data: userData } = await authClient.auth.getUser(token);
      authedUserId = userData?.user?.id ?? null;
    }

    // Allowlist of event types acceptable without authentication (pre-login flows)
    const PRE_AUTH_EVENT_TYPES = new Set([
      'login_failed',
      'signup_attempt',
      'password_reset_requested',
    ]);

    // Trust user_id only if it matches the verified JWT; otherwise drop it
    let safeUserId: string | null = null;
    if (event.user_id) {
      if (authedUserId && authedUserId === event.user_id) {
        safeUserId = authedUserId;
      } else {
        // Reject impersonation attempts
        return new Response(
          JSON.stringify({ error: 'Forbidden: user_id does not match authenticated session' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (authedUserId) {
      safeUserId = authedUserId;
    } else if (!PRE_AUTH_EVENT_TYPES.has(event.event_type)) {
      // Anonymous callers may only log allowlisted pre-auth events
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract IP and user agent from request headers
    const ip_address = req.headers.get('x-forwarded-for') ||
                       req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Log the security event
    const { error: insertError } = await supabase
      .from('security_events')
      .insert({
        user_id: safeUserId,
        event_type: event.event_type,
        event_category: event.event_category,
        severity: event.severity,
        ip_address,
        user_agent,
        details: event.details || {},
      });

    if (insertError) {
      console.error("Error logging security event:", insertError);
      throw insertError;
    }


    // Check for suspicious activity (only when user_id was verified via JWT)
    let suspiciousActivity = null;
    if (safeUserId && event.event_category === 'authentication') {
      const { data, error: rpcError } = await supabase
        .rpc('detect_suspicious_login_activity', {
          p_user_id: safeUserId,
          p_ip_address: ip_address,
        });

      if (!rpcError && data) {
        suspiciousActivity = data;

        if (data.is_suspicious) {
          console.warn(`Suspicious activity detected for user ${safeUserId}`);

          await supabase.from('security_events').insert({
            user_id: safeUserId,
            event_type: 'suspicious_activity_detected',
            event_category: 'security',
            severity: 'high',
            ip_address,
            user_agent,
            details: data,
          });
        }
      }
    }


    console.log(`Security event logged: ${event.event_type} (${event.severity})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Security event logged successfully",
        suspicious_activity: suspiciousActivity,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in log-security-event function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
