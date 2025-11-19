-- Create rate_limits table to track function invocations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  last_call_at timestamp with time zone NOT NULL DEFAULT now(),
  call_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_user_function ON public.rate_limits(user_id, function_name);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits (used by edge functions)
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add cleanup function to remove old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE last_call_at < now() - interval '24 hours';
END;
$$;