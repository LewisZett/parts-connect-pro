-- Fix 1: Add fixed search_path to SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trade_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'trade_type', 'general')
  );
  RETURN NEW;
END;
$$;

-- Fix 2: Add message content validation constraints
ALTER TABLE public.messages 
ADD CONSTRAINT message_content_length 
CHECK (char_length(content) > 0 AND char_length(content) <= 2000);

-- Fix 3: Add explicit UPDATE and DELETE policies for ratings (make immutable)
CREATE POLICY "Ratings cannot be modified"
  ON public.ratings FOR UPDATE
  USING (false);

CREATE POLICY "Ratings cannot be deleted"
  ON public.ratings FOR DELETE
  USING (false);