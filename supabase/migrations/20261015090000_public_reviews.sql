-- Seller reviews are public, like on every marketplace: buyers decide whom to trust from them.
-- Until now only the reviewer and the reviewed user could read a review, so listing pages showed
-- no reviews and signed-out visitors got a 401. Writing rules are unchanged.
DROP POLICY IF EXISTS "Participants read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone reads reviews" ON public.reviews;
CREATE POLICY "Anyone reads reviews" ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.reviews TO anon;
