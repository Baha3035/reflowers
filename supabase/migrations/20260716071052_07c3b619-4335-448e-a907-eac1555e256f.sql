
-- listing_boosts: remove public read, restrict to owner and listing seller
DROP POLICY IF EXISTS "Anyone reads active boosts" ON public.listing_boosts;
CREATE POLICY "Owners and sellers read boosts"
  ON public.listing_boosts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_boosts.listing_id AND l.seller_id = auth.uid()
    )
  );
REVOKE SELECT ON public.listing_boosts FROM anon;

-- reviews: remove public read, require authentication
DROP POLICY IF EXISTS "Reviews public read" ON public.reviews;
CREATE POLICY "Authenticated read reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.reviews FROM anon;

-- offers: tighten seller update WITH CHECK so only accepted/declined status is allowed
DROP POLICY IF EXISTS "Sellers accept or decline offers" ON public.offers;
CREATE POLICY "Sellers accept or decline offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id AND status = 'pending'::offer_status)
  WITH CHECK (
    auth.uid() = seller_id
    AND status IN ('accepted'::offer_status, 'declined'::offer_status)
  );
