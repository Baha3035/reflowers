
-- 1) Deal status enum
DO $$ BEGIN
  CREATE TYPE public.deal_status AS ENUM (
    'awaiting_confirmation',
    'awaiting_payment',
    'in_progress',
    'awaiting_completion',
    'completed',
    'cancelled',
    'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_event_type AS ENUM (
    'buyer_requested',
    'seller_confirmed',
    'seller_declined',
    'seller_set_terms',
    'buyer_sent_prepayment',
    'seller_confirmed_prepayment',
    'seller_rejected_prepayment',
    'bouquet_ready_pickup',
    'bouquet_shipped',
    'buyer_received',
    'buyer_sent_full',
    'seller_confirmed_full',
    'cancelled',
    'problem_reported'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deal_status public.deal_status NOT NULL DEFAULT 'awaiting_confirmation',
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_price integer,
  ADD COLUMN IF NOT EXISTS prepayment_amount integer,
  ADD COLUMN IF NOT EXISTS delivery_cost integer,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_details text,
  ADD COLUMN IF NOT EXISTS prepayment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS orders_enforce_price ON public.orders;
DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
DROP TRIGGER IF EXISTS orders_commission ON public.orders;

CREATE OR REPLACE FUNCTION public.tg_orders_guard_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Order identity fields cannot be modified';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_guard_identity ON public.orders;
CREATE TRIGGER orders_guard_identity
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_guard_identity();

-- 3) deal_events
CREATE TABLE IF NOT EXISTS public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type public.deal_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_events_order_idx ON public.deal_events(order_id, created_at);

GRANT SELECT, INSERT ON public.deal_events TO authenticated;
GRANT ALL ON public.deal_events TO service_role;

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read deal_events" ON public.deal_events;
CREATE POLICY "Participants read deal_events" ON public.deal_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = deal_events.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Participants insert deal_events" ON public.deal_events;
CREATE POLICY "Participants insert deal_events" ON public.deal_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_events.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- 4) apply trigger
CREATE OR REPLACE FUNCTION public.tg_deal_events_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  new_status public.deal_status;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NEW.event_type IN ('seller_confirmed','seller_declined','seller_set_terms',
                        'seller_confirmed_prepayment','seller_rejected_prepayment',
                        'bouquet_ready_pickup','bouquet_shipped','seller_confirmed_full') THEN
    IF NEW.actor_id <> o.seller_id THEN
      RAISE EXCEPTION 'Only seller can perform this action';
    END IF;
  ELSIF NEW.event_type IN ('buyer_requested','buyer_sent_prepayment','buyer_received','buyer_sent_full') THEN
    IF NEW.actor_id <> o.buyer_id THEN
      RAISE EXCEPTION 'Only buyer can perform this action';
    END IF;
  ELSIF NEW.event_type IN ('cancelled','problem_reported') THEN
    IF NEW.actor_id NOT IN (o.buyer_id, o.seller_id) THEN
      RAISE EXCEPTION 'Only participants can perform this action';
    END IF;
  END IF;

  new_status := o.deal_status;

  IF NEW.event_type = 'seller_declined' THEN
    new_status := 'cancelled';
  ELSIF NEW.event_type = 'seller_set_terms' AND o.deal_status = 'awaiting_confirmation' THEN
    new_status := 'awaiting_payment';
  ELSIF NEW.event_type = 'seller_confirmed_prepayment' AND o.deal_status = 'awaiting_payment' THEN
    new_status := 'in_progress';
  ELSIF NEW.event_type IN ('bouquet_ready_pickup','bouquet_shipped') AND o.deal_status = 'in_progress' THEN
    new_status := 'awaiting_completion';
  ELSIF NEW.event_type = 'seller_confirmed_full' AND o.deal_status IN ('awaiting_completion','in_progress') THEN
    new_status := 'completed';
  ELSIF NEW.event_type = 'cancelled' AND o.deal_status NOT IN ('completed','cancelled') THEN
    new_status := 'cancelled';
  ELSIF NEW.event_type = 'problem_reported' AND o.deal_status NOT IN ('completed','cancelled') THEN
    new_status := 'disputed';
  END IF;

  IF new_status IS DISTINCT FROM o.deal_status THEN
    UPDATE public.orders
       SET deal_status = new_status,
           completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE completed_at END,
           cancel_reason = CASE WHEN new_status = 'cancelled' THEN COALESCE(NEW.payload->>'reason', cancel_reason) ELSE cancel_reason END,
           dispute_reason = CASE WHEN new_status = 'disputed' THEN COALESCE(NEW.payload->>'reason', dispute_reason) ELSE dispute_reason END
     WHERE id = o.id;

    IF new_status = 'awaiting_payment' THEN
      UPDATE public.listings SET status = 'reserved' WHERE id = o.listing_id AND status = 'active';
    ELSIF new_status = 'completed' THEN
      UPDATE public.listings SET status = 'sold' WHERE id = o.listing_id;
    ELSIF new_status = 'cancelled' THEN
      UPDATE public.listings SET status = 'active' WHERE id = o.listing_id AND status = 'reserved';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_deal_events_apply() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS deal_events_apply ON public.deal_events;
CREATE TRIGGER deal_events_apply
  BEFORE INSERT ON public.deal_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_deal_events_apply();

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_events;

-- 6) Storage RLS for deal-receipts (bucket already created via API)
DROP POLICY IF EXISTS "deal_receipts_participants_select" ON storage.objects;
CREATE POLICY "deal_receipts_participants_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-receipts'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = split_part(storage.objects.name, '/', 1)
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "deal_receipts_participants_insert" ON storage.objects;
CREATE POLICY "deal_receipts_participants_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-receipts'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = split_part(storage.objects.name, '/', 1)
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );
