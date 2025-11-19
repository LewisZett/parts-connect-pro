-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view profiles of people they have matches with
CREATE POLICY "Matched users can view contact info"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.matches
      WHERE (
        (matches.supplier_id = auth.uid() AND matches.requester_id = profiles.id)
        OR 
        (matches.requester_id = auth.uid() AND matches.supplier_id = profiles.id)
      )
    )
  );