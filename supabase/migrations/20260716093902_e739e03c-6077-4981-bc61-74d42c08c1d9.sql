
DROP POLICY IF EXISTS "chat_photos_select_auth" ON storage.objects;

-- Path format: <user_id>/<conversation_id>/<filename>
-- Allow SELECT only when the requesting user is a participant of that conversation.
CREATE POLICY "chat_photos_select_participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-photos'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);
