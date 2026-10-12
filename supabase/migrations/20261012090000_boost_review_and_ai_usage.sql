-- ============ PAID BOOSTS: PENDING UNTIL AN ADMIN APPROVES THE RECEIPT ============
-- Before this migration the browser inserted listing_boosts and set boost_*_until on
-- its own listing directly, so a seller could boost for free. Now:
--   * price and duration are fixed by the database, not the client
--   * a new boost is always 'pending'
--   * sellers can no longer write boost columns on listings
--   * admin_review_boost() approves (applies the boost) or rejects it

ALTER TABLE public.listing_boosts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Boosts created before this change were already applied to their listings.
UPDATE public.listing_boosts SET status = 'approved' WHERE reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS listing_boosts_pending_idx
  ON public.listing_boosts (created_at DESC) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.boost_price(_kind public.boost_kind)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _kind
    WHEN 'bump' THEN 50
    WHEN 'highlight' THEN 80
    WHEN 'top' THEN 150
    WHEN 'urgent' THEN 100
  END
$$;

CREATE OR REPLACE FUNCTION public.boost_hours(_kind public.boost_kind)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _kind
    WHEN 'bump' THEN 24
    WHEN 'highlight' THEN 48
    WHEN 'top' THEN 24
    WHEN 'urgent' THEN 24
  END
$$;

CREATE OR REPLACE FUNCTION public.tg_listing_boosts_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.price := public.boost_price(NEW.kind);
  -- Provisional; recalculated from the approval time in admin_review_boost().
  NEW.expires_at := now() + make_interval(hours => public.boost_hours(NEW.kind));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_boosts_before_insert ON public.listing_boosts;
CREATE TRIGGER listing_boosts_before_insert
  BEFORE INSERT ON public.listing_boosts
  FOR EACH ROW EXECUTE FUNCTION public.tg_listing_boosts_before_insert();

-- Sellers may edit their listings, but not the paid boost columns.
CREATE OR REPLACE FUNCTION public.tg_listings_guard_boosts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_setting('app.applying_boost', true) = 'on' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.boost_bump_until := NULL;
    NEW.boost_highlight_until := NULL;
    NEW.boost_top_until := NULL;
    NEW.urgent := false;
  ELSE
    NEW.boost_bump_until := OLD.boost_bump_until;
    NEW.boost_highlight_until := OLD.boost_highlight_until;
    NEW.boost_top_until := OLD.boost_top_until;
    NEW.urgent := OLD.urgent;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_boosts ON public.listings;
CREATE TRIGGER listings_guard_boosts
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listings_guard_boosts();

CREATE OR REPLACE FUNCTION public.admin_review_boost(_boost_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.listing_boosts%ROWTYPE;
  exp timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admin';
  END IF;

  SELECT * INTO b FROM public.listing_boosts WHERE id = _boost_id FOR UPDATE;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Boost not found';
  END IF;
  IF b.status <> 'pending' THEN
    RAISE EXCEPTION 'Boost already reviewed';
  END IF;

  IF NOT _approve THEN
    UPDATE public.listing_boosts
       SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = _boost_id;

    INSERT INTO public.notifications(user_id, type, title, body, listing_id)
    VALUES (b.user_id, 'boost_rejected', 'Продвижение не подтверждено',
            'Мы не нашли оплату по чеку. Если это ошибка — напишите в поддержку.', b.listing_id);
    RETURN;
  END IF;

  exp := now() + make_interval(hours => public.boost_hours(b.kind));

  UPDATE public.listing_boosts
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), expires_at = exp
   WHERE id = _boost_id;

  PERFORM set_config('app.applying_boost', 'on', true);
  UPDATE public.listings
     SET boost_bump_until      = CASE WHEN b.kind = 'bump'      THEN GREATEST(boost_bump_until, exp)      ELSE boost_bump_until END,
         boost_highlight_until = CASE WHEN b.kind = 'highlight' THEN GREATEST(boost_highlight_until, exp) ELSE boost_highlight_until END,
         boost_top_until       = CASE WHEN b.kind = 'top'       THEN GREATEST(boost_top_until, exp)       ELSE boost_top_until END,
         urgent                = CASE WHEN b.kind = 'urgent'    THEN true                                  ELSE urgent END
   WHERE id = b.listing_id;
  PERFORM set_config('app.applying_boost', 'off', true);

  INSERT INTO public.notifications(user_id, type, title, body, listing_id)
  VALUES (b.user_id, 'boost_approved', 'Продвижение активировано',
          'Оплата подтверждена, объявление продвигается.', b.listing_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_boost(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_boost(uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.tg_listing_boosts_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_listings_guard_boosts() FROM PUBLIC, anon, authenticated;

-- ============ AI USAGE (rate limit for analyzeBouquet) ============
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'analyze_bouquet',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON public.ai_usage (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ai usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users log own ai usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
