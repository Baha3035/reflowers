CREATE POLICY "receipts_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-receipts' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  )
);

CREATE POLICY "receipts_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);