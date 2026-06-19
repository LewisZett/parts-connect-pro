
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Slots config (single row, id=1)
CREATE TABLE public.ad_slots_config (
  id int PRIMARY KEY DEFAULT 1,
  reserve_price numeric NOT NULL DEFAULT 1.0,
  min_increment_pct numeric NOT NULL DEFAULT 15,
  guaranteed_hours int NOT NULL DEFAULT 48,
  total_slots int NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.ad_slots_config TO anon, authenticated;
GRANT ALL ON public.ad_slots_config TO service_role;
ALTER TABLE public.ad_slots_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ad config" ON public.ad_slots_config FOR SELECT USING (true);
CREATE POLICY "Admins can update ad config" ON public.ad_slots_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.ad_slots_config (id) VALUES (1);

-- Ads
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  image_url text,
  link_url text,
  bid_amount numeric NOT NULL CHECK (bid_amount > 0),
  slot_position int,
  placed_at timestamptz,
  guaranteed_until timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','waiting','expired','removed')),
  payment_id uuid REFERENCES public.pi_payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ads_status_bid_idx ON public.ads (status, bid_amount DESC);
CREATE INDEX ads_user_idx ON public.ads (user_id);
GRANT SELECT ON public.ads TO anon, authenticated;
GRANT INSERT, UPDATE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible ads" ON public.ads FOR SELECT
  USING (status IN ('active','waiting'));
CREATE POLICY "Owners can view their own ads" ON public.ads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all ads" ON public.ads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own ads" ON public.ads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their pending ads" ON public.ads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any ad" ON public.ads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bids history
CREATE TABLE public.bids_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  action text NOT NULL CHECK (action IN ('placed','outbid','promoted','expired','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bids_history_ad_idx ON public.bids_history (ad_id, created_at DESC);
GRANT SELECT ON public.bids_history TO authenticated;
GRANT ALL ON public.bids_history TO service_role;
ALTER TABLE public.bids_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their bid history" ON public.bids_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bid history" ON public.bids_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger on ads
CREATE TRIGGER set_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_ad_slots_config_updated_at
  BEFORE UPDATE ON public.ad_slots_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_slots_config;
