
-- Public read of listing photos
CREATE POLICY "listing-photos public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-photos');

-- Users manage their own folder (uid()/...)
CREATE POLICY "listing-photos owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-photos owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-photos owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
