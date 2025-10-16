-- Create a public storage bucket for part images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'part-images',
  'part-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create storage policies for part images
CREATE POLICY "Anyone can view part images"
ON storage.objects FOR SELECT
USING (bucket_id = 'part-images');

CREATE POLICY "Authenticated users can upload part images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'part-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own part images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'part-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own part images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'part-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);