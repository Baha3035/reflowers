
-- Expand reviews for both-sided ratings (buyer↔seller) after a sold deal.
ALTER TABLE public.reviews
  ALTER COLUMN order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

-- One review per reviewer→target per listing.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_listing
  ON public.reviews (reviewer_id, target_user_id, listing_id)
  WHERE listing_id IS NOT NULL;

-- Reviews are public (so shop pages show them to everyone).
DROP POLICY IF EXISTS "Participants read reviews" ON public.reviews;
CREATE POLICY "Reviews are public"
  ON public.reviews FOR SELECT
  USING (true);

-- INSERT: allow when the reviewer participated in the sold deal.
DROP POLICY IF EXISTS "Buyers write reviews" ON public.reviews;
CREATE POLICY "Deal participants write reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND auth.uid() <> target_user_id
    AND (
      -- Order-based path (kept for compatibility)
      (order_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = reviews.order_id
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
          AND o.status = ANY(ARRAY['completed'::order_status, 'paid'::order_status])
      ))
      OR
      -- Sold-listing + conversation path
      (listing_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.listings l
        JOIN public.conversations c ON c.listing_id = l.id
        WHERE l.id = reviews.listing_id
          AND l.status = 'sold'
          AND (
            (c.buyer_id = auth.uid()  AND c.seller_id = reviews.target_user_id)
            OR
            (c.seller_id = auth.uid() AND c.buyer_id  = reviews.target_user_id)
          )
      ))
    )
  );

-- Trigger: keep profiles.rating and reviews_count in sync.
CREATE OR REPLACE FUNCTION public.tg_recompute_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target uuid;
BEGIN
  v_target := COALESCE(NEW.target_user_id, OLD.target_user_id);
  UPDATE public.profiles p
     SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE target_user_id = v_target), 0),
         reviews_count = (SELECT count(*) FROM public.reviews WHERE target_user_id = v_target)
   WHERE p.id = v_target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recompute_rating ON public.reviews;
CREATE TRIGGER reviews_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_profile_rating();
