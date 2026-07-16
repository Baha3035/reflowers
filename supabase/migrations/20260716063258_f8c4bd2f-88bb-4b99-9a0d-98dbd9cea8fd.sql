
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.seller_type AS ENUM ('private', 'shop');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'hidden', 'expired');
CREATE TYPE public.listing_condition AS ENUM ('new', 'fresh', 'day_old');
CREATE TYPE public.message_kind AS ENUM ('text', 'offer', 'location', 'system');
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.boost_kind AS ENUM ('bump', 'highlight', 'top', 'urgent');
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  city text DEFAULT 'Бишкек',
  district text,
  seller_type public.seller_type NOT NULL DEFAULT 'private',
  shop_name text,
  bio text,
  verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
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
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ LISTINGS ============
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  original_price integer,
  category text NOT NULL,
  condition public.listing_condition NOT NULL DEFAULT 'fresh',
  city text NOT NULL DEFAULT 'Бишкек',
  district text,
  images text[] NOT NULL DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'active',
  urgent boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  favorites_count integer NOT NULL DEFAULT 0,
  boost_bump_until timestamptz,
  boost_highlight_until timestamptz,
  boost_top_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_status_idx ON public.listings (status, created_at DESC);
CREATE INDEX listings_seller_idx ON public.listings (seller_id);
CREATE INDEX listings_city_idx ON public.listings (city, district);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active listings" ON public.listings FOR SELECT
  USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Sellers insert own listings" ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own listings" ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own listings" ON public.listings FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CONVERSATIONS ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);
CREATE INDEX conv_seller_idx ON public.conversations (seller_id, last_message_at DESC);
CREATE INDEX conv_buyer_idx ON public.conversations (buyer_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers start conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants update conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.message_kind NOT NULL DEFAULT 'text',
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (auth.uid() = c.buyer_id OR auth.uid() = c.seller_id)));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (auth.uid() = c.buyer_id OR auth.uid() = c.seller_id)));
CREATE POLICY "Receivers mark read" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (auth.uid() = c.buyer_id OR auth.uid() = c.seller_id)));

-- bump conversation last_message_at
CREATE OR REPLACE FUNCTION public.tg_bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_bump_conv AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_conversation();

-- ============ OFFERS ============
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  status public.offer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read offers" ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers create offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Sellers respond offers" ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- ============ ORDERS (эскроу + комиссия 7%) ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  price integer NOT NULL CHECK (price >= 0),
  commission integer NOT NULL DEFAULT 0,
  seller_amount integer NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  buyer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX orders_seller_idx ON public.orders (seller_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants update orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- auto commission on insert (7%)
CREATE OR REPLACE FUNCTION public.tg_compute_commission()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.commission := ROUND(NEW.price * 0.07);
  NEW.seller_amount := NEW.price - NEW.commission;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_commission BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_compute_commission();

-- ============ LISTING BOOSTS (продвижение) ============
CREATE TABLE public.listing_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.boost_kind NOT NULL,
  price integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boosts_listing_idx ON public.listing_boosts (listing_id, expires_at DESC);
GRANT SELECT, INSERT ON public.listing_boosts TO authenticated;
GRANT ALL ON public.listing_boosts TO service_role;
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active boosts" ON public.listing_boosts FOR SELECT USING (true);
GRANT SELECT ON public.listing_boosts TO anon;
CREATE POLICY "Owners buy boosts" ON public.listing_boosts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.seller_id = auth.uid()
  ));

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Buyers write reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.status IN ('completed','paid')
  ));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
