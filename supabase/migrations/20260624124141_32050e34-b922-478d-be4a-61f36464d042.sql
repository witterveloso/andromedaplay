
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_for_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS sales_headline text,
  ADD COLUMN IF NOT EXISTS sales_subheadline text,
  ADD COLUMN IF NOT EXISTS sales_description text,
  ADD COLUMN IF NOT EXISTS sales_hero_url text,
  ADD COLUMN IF NOT EXISTS sales_video_url text,
  ADD COLUMN IF NOT EXISTS sales_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS access_duration_days integer;

DROP POLICY IF EXISTS "Anyone can view courses for sale" ON public.courses;
CREATE POLICY "Anyone can view courses for sale"
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (is_for_sale = true AND status = 'published');

GRANT SELECT ON public.courses TO anon;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','approved','rejected','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text NOT NULL,
  buyer_name text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status public.order_status NOT NULL DEFAULT 'pending',
  mp_preference_id text,
  mp_payment_id text,
  mp_status_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers see their orders" ON public.orders;
CREATE POLICY "Buyers see their orders"
  ON public.orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_course_id_idx ON public.orders(course_id);
CREATE INDEX IF NOT EXISTS orders_mp_preference_id_idx ON public.orders(mp_preference_id);
CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx ON public.orders(mp_payment_id);
