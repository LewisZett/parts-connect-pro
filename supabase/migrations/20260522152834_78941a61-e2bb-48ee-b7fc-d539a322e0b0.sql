
CREATE TABLE public.pi_payments (
  id uuid primary key default gen_random_uuid(),
  payment_id text unique not null,
  pi_uid text not null,
  pi_username text,
  amount numeric not null,
  memo text,
  metadata jsonb,
  product_type text not null,
  part_id uuid,
  txid text,
  status text not null default 'created',
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.pi_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pi_payments"
ON public.pi_payments FOR SELECT
USING (true);

CREATE TRIGGER update_pi_payments_updated_at
BEFORE UPDATE ON public.pi_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
