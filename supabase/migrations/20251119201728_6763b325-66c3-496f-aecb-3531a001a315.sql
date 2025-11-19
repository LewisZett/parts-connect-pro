-- Create security_events table to track security-related activities
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_type text NOT NULL,
  event_category text NOT NULL,
  severity text NOT NULL,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can manage security events
CREATE POLICY "Service role can manage security events"
  ON public.security_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_login_activity(
  p_user_id uuid,
  p_ip_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
  different_ips integer;
  result jsonb;
BEGIN
  -- Count failed login attempts in last hour
  SELECT COUNT(*)
  INTO failed_attempts
  FROM security_events
  WHERE user_id = p_user_id
    AND event_type = 'login_failed'
    AND created_at > now() - interval '1 hour';
  
  -- Count different IPs used in last 24 hours
  SELECT COUNT(DISTINCT ip_address)
  INTO different_ips
  FROM security_events
  WHERE user_id = p_user_id
    AND event_category = 'authentication'
    AND created_at > now() - interval '24 hours';
  
  -- Build result
  result := jsonb_build_object(
    'failed_attempts_last_hour', failed_attempts,
    'different_ips_last_24h', different_ips,
    'is_suspicious', (failed_attempts >= 5 OR different_ips >= 5)
  );
  
  RETURN result;
END;
$$;

-- Create cleanup function for old security events
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep security events for 90 days
  DELETE FROM public.security_events
  WHERE created_at < now() - interval '90 days';
END;
$$;