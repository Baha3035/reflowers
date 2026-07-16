CREATE POLICY "Conversation participants view related listings"
  ON public.listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.listing_id = listings.id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );