UPDATE public.orders o
SET conversation_id = c.id
FROM public.conversations c
WHERE o.conversation_id IS NULL
  AND c.listing_id = o.listing_id
  AND c.buyer_id = o.buyer_id
  AND c.seller_id = o.seller_id;

NOTIFY pgrst, 'reload schema';