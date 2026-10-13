-- ============ LISTING EXPIRY ============
-- The sell page promises "active for 24 hours". Every listing now has expires_at; buyers stop
-- seeing it after that (RLS), sellers can extend it while the bouquet is still fresh.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.listings SET expires_at = created_at + interval '24 hours' WHERE expires_at IS NULL;
ALTER TABLE public.listings
  ALTER COLUMN expires_at SET DEFAULT now() + interval '24 hours',
  ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS listings_active_expiry_idx
  ON public.listings (expires_at DESC) WHERE status = 'active';

-- Only the database sets expires_at: 24h on insert, and extend_listing() afterwards.
CREATE OR REPLACE FUNCTION public.tg_listings_guard_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_setting('app.extending_listing', true) = 'on' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.expires_at := now() + interval '24 hours';
  ELSE
    NEW.expires_at := OLD.expires_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_expiry ON public.listings;
CREATE TRIGGER listings_guard_expiry
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listings_guard_expiry();

-- Buyers see active, unexpired listings. Sellers always see their own; conversation
-- participants and admins keep their existing policies.
DROP POLICY IF EXISTS "Anyone reads active listings" ON public.listings;
CREATE POLICY "Anyone reads active listings" ON public.listings FOR SELECT
  USING ((status = 'active' AND expires_at > now()) OR auth.uid() = seller_id);

-- Seller extends their listing by 24h from now. A bouquet older than 5 days can't be extended.
CREATE OR REPLACE FUNCTION public.extend_listing(_listing_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.listings%ROWTYPE;
  new_expiry timestamptz := now() + interval '24 hours';
BEGIN
  SELECT * INTO l FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF l.id IS NULL OR l.seller_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF l.status NOT IN ('active', 'expired') THEN
    RAISE EXCEPTION 'Only active or expired listings can be extended';
  END IF;
  IF l.created_at < now() - interval '5 days' THEN
    RAISE EXCEPTION 'Bouquet is older than 5 days';
  END IF;

  PERFORM set_config('app.extending_listing', 'on', true);
  UPDATE public.listings SET expires_at = new_expiry, status = 'active' WHERE id = _listing_id;
  PERFORM set_config('app.extending_listing', 'off', true);
  RETURN new_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_listing(uuid) TO authenticated;

-- ============ PUBLIC SELLER PROFILES ============
-- public_profiles was security_invoker, but profiles is only readable by its owner, admins and
-- chat partners, so buyers saw every seller as "Продавец" with a made-up rating. The view now
-- runs as its owner and exposes only safe columns (never phone).
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, display_name, avatar_url, seller_type, shop_name,
       city, district, bio, verified, rating, reviews_count, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ============ SELLER CONTACTS ============
-- A seller chooses how buyers may reach them besides the in-app chat. profiles.phone stays
-- private; get_listing_contacts() hands it out only for channels the seller turned on, and only
-- to signed-in users.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_username text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_kg_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_kg_format CHECK (phone IS NULL OR phone ~ '^\+996[0-9]{9}$') NOT VALID;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_telegram_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_telegram_username_format
  CHECK (telegram_username IS NULL OR telegram_username ~ '^[A-Za-z0-9_]{5,32}$');

CREATE OR REPLACE FUNCTION public.get_listing_contacts(_listing_id uuid)
RETURNS TABLE (call boolean, whatsapp boolean, telegram boolean, phone text, telegram_username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.contact_call AND p.phone IS NOT NULL,
    p.contact_whatsapp AND p.phone IS NOT NULL,
    p.telegram_username IS NOT NULL,
    CASE WHEN auth.uid() IS NOT NULL AND (p.contact_call OR p.contact_whatsapp) THEN p.phone END,
    CASE WHEN auth.uid() IS NOT NULL THEN p.telegram_username END
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.seller_id
  WHERE l.id = _listing_id
    AND l.status = 'active'
    AND l.expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.get_listing_contacts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_contacts(uuid) TO anon, authenticated;
