-- Clean up invalid data before applying constraints
-- Delete parts with invalid part_name (too short)
DELETE FROM parts WHERE char_length(part_name) < 2;

-- Fix 1: Add RLS policies to part-images storage bucket
CREATE POLICY "Users can upload images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'part-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'part-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'part-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Part images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'part-images');

-- Fix 2: Add database-level input validation constraints
ALTER TABLE public.parts
  ADD CONSTRAINT part_name_length CHECK (char_length(part_name) BETWEEN 2 AND 100),
  ADD CONSTRAINT parts_description_length CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT parts_location_length CHECK (location IS NULL OR char_length(location) <= 100),
  ADD CONSTRAINT price_positive CHECK (price IS NULL OR price >= 0);

ALTER TABLE public.part_requests
  ADD CONSTRAINT request_part_name_length CHECK (char_length(part_name) BETWEEN 2 AND 100),
  ADD CONSTRAINT requests_description_length CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT requests_location_length CHECK (location IS NULL OR char_length(location) <= 100),
  ADD CONSTRAINT max_price_positive CHECK (max_price IS NULL OR max_price >= 0);

-- Fix 3: Update profile RLS policies to allow viewing public profile information
DROP POLICY IF EXISTS "Users can view own profile fully" ON public.profiles;

CREATE POLICY "Anyone can view public profile info"
ON public.profiles FOR SELECT
TO authenticated
USING (true);