
-- Rework admin_cancel_deal to take actor as argument (called via service role from server fn)
CREATE OR REPLACE FUNCTION public.admin_cancel_deal(_order_id uuid, _reason text, _actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
     SET deal_status = 'cancelled',
         cancel_reason = COALESCE(_reason, cancel_reason)
   WHERE id = _order_id;

  UPDATE public.listings SET status = 'active'
   WHERE id = (SELECT listing_id FROM public.orders WHERE id = _order_id)
     AND status = 'reserved';

  INSERT INTO public.deal_events(order_id, actor_id, event_type, payload)
  VALUES (_order_id, _actor, 'cancelled',
          jsonb_build_object('reason', COALESCE(_reason,'Отменено администратором'), 'by','admin'));
END;
$$;

-- Drop the old 2-arg version (was callable by authenticated)
DROP FUNCTION IF EXISTS public.admin_cancel_deal(uuid, text);

-- Revoke EXECUTE from PUBLIC/anon/authenticated on all our SECURITY DEFINER functions.
-- Trigger functions do not need EXECUTE from API roles; the trigger owner runs them.
REVOKE ALL ON FUNCTION public.admin_cancel_deal(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_bump_conversation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_orders_enforce_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_offers_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_orders_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_messages_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_recompute_profile_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_orders_guard_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_deal_events_apply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_deal_events_notify() FROM PUBLIC, anon, authenticated;
