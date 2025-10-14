-- Add phone_number field to profiles table for WhatsApp notifications
ALTER TABLE public.profiles
ADD COLUMN phone_number text;

-- Add a check constraint to validate phone number format (international format)
ALTER TABLE public.profiles
ADD CONSTRAINT phone_number_format CHECK (
  phone_number IS NULL OR 
  phone_number ~ '^\+[1-9]\d{1,14}$'
);

COMMENT ON COLUMN public.profiles.phone_number IS 'Phone number in international format (e.g., +1234567890) for WhatsApp notifications';