
-- pi_payments: drop overly permissive policy; service role bypasses RLS so no policy needed for backend
DROP POLICY IF EXISTS "Anyone can view pi_payments" ON public.pi_payments;

-- security_events: replace permissive ALL policy
DROP POLICY IF EXISTS "Service role can manage security events" ON public.security_events;

-- rate_limits: replace permissive ALL policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- part_requests: require authentication for browsing
DROP POLICY IF EXISTS "Anyone can view active part requests" ON public.part_requests;
CREATE POLICY "Authenticated users can view active part requests"
  ON public.part_requests
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Lock down SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_security_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_suspicious_login_activity(uuid, text) FROM PUBLIC, anon, authenticated;

-- Realtime: require authentication to subscribe to channels
DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);
