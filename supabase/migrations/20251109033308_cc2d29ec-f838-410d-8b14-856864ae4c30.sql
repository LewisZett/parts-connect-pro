-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view basic info of other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON profiles;

-- Create a single comprehensive read policy that allows anyone to view profile info
-- This will allow PostgREST joins to work properly
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles
FOR SELECT
USING (true);

-- Keep the existing policies for updates and inserts
-- (Users can still only update their own profile)