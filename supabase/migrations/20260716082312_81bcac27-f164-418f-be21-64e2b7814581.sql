ALTER TABLE public.orders DROP CONSTRAINT orders_buyer_id_fkey, DROP CONSTRAINT orders_seller_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;