
-- Chat photos: users upload to their own folder (user_id/...)
CREATE POLICY "chat_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Any authenticated user can read chat photos they know the path to;
-- URLs are signed and only exchanged inside conversations they participate in.
CREATE POLICY "chat_photos_select_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-photos');

CREATE POLICY "chat_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
