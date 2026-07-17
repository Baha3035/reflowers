ALTER TABLE public.listing_boosts ADD COLUMN IF NOT EXISTS receipt_url text;

CREATE POLICY "Admins read all boosts"
ON public.listing_boosts
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));