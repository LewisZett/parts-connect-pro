-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  trade_type TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create parts table for supplier listings
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used', 'refurbished')),
  price DECIMAL(10, 2),
  description TEXT,
  location TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available parts"
  ON public.parts FOR SELECT
  USING (status = 'available');

CREATE POLICY "Suppliers can insert own parts"
  ON public.parts FOR INSERT
  WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can update own parts"
  ON public.parts FOR UPDATE
  USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can delete own parts"
  ON public.parts FOR DELETE
  USING (auth.uid() = supplier_id);

-- Create part_requests table for buyer requests
CREATE TABLE public.part_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition_preference TEXT,
  max_price DECIMAL(10, 2),
  description TEXT,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active part requests"
  ON public.part_requests FOR SELECT
  USING (status = 'active');

CREATE POLICY "Requesters can insert own requests"
  ON public.part_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can update own requests"
  ON public.part_requests FOR UPDATE
  USING (auth.uid() = requester_id);

CREATE POLICY "Requesters can delete own requests"
  ON public.part_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- Create matches table to track part/request connections
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.part_requests(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'both_agreed', 'cancelled')),
  supplier_agreed BOOLEAN DEFAULT false,
  requester_agreed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = supplier_id OR auth.uid() = requester_id);

CREATE POLICY "Users can insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = supplier_id OR auth.uid() = requester_id);

CREATE POLICY "Users can update own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = supplier_id OR auth.uid() = requester_id);

-- Create messages table for in-app communication
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their matches"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages in their matches"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create ratings table for user reviews
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rated_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, rater_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert ratings for completed matches"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_part_requests_updated_at
  BEFORE UPDATE ON public.part_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();