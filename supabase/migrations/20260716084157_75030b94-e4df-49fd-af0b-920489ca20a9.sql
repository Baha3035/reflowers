
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;

-- Owners can read their own uploads (folder = auth.uid())
CREATE POLICY "listing-photos owner read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listing-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read images belonging to ACTIVE listings only
CREATE POLICY "listing-photos active listing read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listing-photos'
  AND EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.status = 'active'
      AND EXISTS (
        SELECT 1 FROM unnest(l.images) img
        WHERE img LIKE '%/listing-photos/' || storage.objects.name || '%'
      )
  )
);
