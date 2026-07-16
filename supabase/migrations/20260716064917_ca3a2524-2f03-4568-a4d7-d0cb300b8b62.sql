
-- 1. Protect profiles.phone from public exposure
DROP POLICY IF EXISTS "Profiles are public readable" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Safe public view without phone or other sensitive columns
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, seller_type, shop_name,
       city, district, bio, verified, rating, reviews_count, created_at
FROM public.profiles;

-- View needs its own SELECT policy on the underlying table to work for anon/authenticated.
-- Since security_invoker=true, add a policy that permits reading these safe rows publicly.
CREATE POLICY "Public safe profile fields"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- The row is readable but we only expose safe columns through the view.
-- Revoke direct table SELECT from anon so scrapers can't grab phone via PostgREST.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Authenticated users can still read profiles via PostgREST (phone included).
-- Restrict phone: drop broad authenticated select, keep only self + admin + view.
DROP POLICY "Public safe profile fields" ON public.profiles;
-- Owner-only + admin (already exists: "Admins view all profiles extra" and new "Users read own profile")
-- For public/other-user browsing, code must use public_profiles view.

-- 2. Orders: enforce price from listings and lock financial fields
CREATE OR REPLACE FUNCTION public.tg_orders_enforce_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_price integer;
  v_seller_id uuid;
BEGIN
  SELECT price, seller_id INTO v_listing_price, v_seller_id
  FROM public.listings WHERE id = NEW.listing_id;

  IF v_listing_price IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  NEW.price := v_listing_price;
  NEW.seller_id := v_seller_id;
  NEW.status := 'pending'::order_status;
  NEW.paid_at := NULL;
  NEW.completed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_price ON public.orders;
CREATE TRIGGER orders_enforce_price
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_enforce_price();

-- 3. Orders: restrict status transitions & lock immutable fields on update
CREATE OR REPLACE FUNCTION public.tg_orders_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Skip guard for service_role (no auth.uid())
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Immutable financial/identity fields
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.commission IS DISTINCT FROM OLD.commission
     OR NEW.seller_amount IS DISTINCT FROM OLD.seller_amount
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'Order financial fields cannot be modified';
  END IF;

  -- Status transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- 'paid' can only be set by trusted server-side path (service role, filtered above)
    IF NEW.status = 'paid'::order_status THEN
      RAISE EXCEPTION 'Only the platform can mark an order as paid';
    END IF;

    -- Buyer can mark completed (pending or paid -> completed)
    IF NEW.status = 'completed'::order_status THEN
      IF v_uid <> OLD.buyer_id THEN
        RAISE EXCEPTION 'Only the buyer can mark the order completed';
      END IF;
      IF OLD.status NOT IN ('pending'::order_status, 'paid'::order_status) THEN
        RAISE EXCEPTION 'Invalid status transition';
      END IF;
      NEW.completed_at := now();
    ELSIF NEW.status = 'cancelled'::order_status THEN
      IF OLD.status NOT IN ('pending'::order_status) THEN
        RAISE EXCEPTION 'Cannot cancel a non-pending order';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid status transition';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_guard_update();

-- 4. Offers: split update policy so buyers can only cancel, sellers accept/decline
DROP POLICY IF EXISTS "Sellers respond offers" ON public.offers;

CREATE POLICY "Sellers accept or decline offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Buyers cancel own pending offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id AND status = 'pending'::offer_status)
  WITH CHECK (auth.uid() = buyer_id AND status = 'cancelled'::offer_status);
