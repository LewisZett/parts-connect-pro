-- Fix: Security Definer View issue
-- Recreate the view with SECURITY INVOKER to prevent privilege escalation
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = true) AS
  SELECT 
    id,
    full_name,
    trade_type,
    is_verified,
    created_at
  FROM public.profiles;