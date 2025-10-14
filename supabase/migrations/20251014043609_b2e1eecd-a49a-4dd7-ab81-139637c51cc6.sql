-- Fix: User Email Addresses Exposed Platform-Wide
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for users to view their own full profile
CREATE POLICY "Users can view own profile fully"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Create a view for public profile information (without email)
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT 
    id,
    full_name,
    trade_type,
    is_verified,
    created_at
  FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.public_profiles TO authenticated;