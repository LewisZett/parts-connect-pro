-- Create storage bucket for part images (if not exists)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('part-images', 'part-images', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
on conflict (id) do nothing;