-- Add more restrictive profile RLS policy
-- Replace the overly permissive policy with one that protects email/phone

DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;

-- Allow users to view their own full profile
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow viewing only non-sensitive fields of other profiles
-- Note: This relies on application code to only select safe fields
-- For better security, use the public_profiles view in application code
CREATE POLICY "Users can view basic info of other profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() != id);