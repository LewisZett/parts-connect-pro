-- Add length constraint for full_name in profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT full_name_length CHECK (char_length(full_name) <= 100);

-- Add phone number format validation in profiles table
-- Allows optional + prefix followed by 10-15 digits, or NULL
ALTER TABLE public.profiles
ADD CONSTRAINT phone_format CHECK (
  phone_number IS NULL OR 
  phone_number ~ '^\+?[0-9]{10,15}$'
);

-- Add length constraint for message content
ALTER TABLE public.messages
ADD CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000);