
-- 1) Reviews: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
CREATE POLICY "Reviews readable by authenticated"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Listing photos: replace LIKE-pattern with exact suffix match on stripped URL
DROP POLICY IF EXISTS "listing-photos active listing read" ON storage.objects;
CREATE POLICY "listing-photos active listing read"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1
      FROM public.listings l,
           unnest(l.images) AS img
      WHERE l.status = 'active'::listing_status
        AND right(split_part(img, '?', 1), length('/listing-photos/' || storage.objects.name))
            = '/listing-photos/' || storage.objects.name
    )
  );
