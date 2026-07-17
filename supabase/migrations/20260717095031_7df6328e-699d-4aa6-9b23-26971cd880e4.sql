
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: create notifications for deal events
CREATE OR REPLACE FUNCTION public.tg_deal_events_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  recipient uuid;
  n_title text;
  n_body text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id;
  IF o.id IS NULL THEN RETURN NEW; END IF;

  -- Determine recipient (the other party) and message
  IF NEW.event_type IN ('buyer_requested') THEN
    recipient := o.seller_id;
    n_title := 'Новый запрос на покупку';
    n_body := 'Покупатель хочет купить ваш букет.';
  ELSIF NEW.event_type = 'seller_confirmed' THEN
    recipient := o.buyer_id;
    n_title := 'Продавец подтвердил заказ';
    n_body := NULL;
  ELSIF NEW.event_type = 'seller_declined' THEN
    recipient := o.buyer_id;
    n_title := 'Продавец отклонил заказ';
    n_body := NULL;
  ELSIF NEW.event_type = 'seller_set_terms' THEN
    recipient := o.buyer_id;
    n_title := 'Продавец указал условия сделки';
    n_body := 'Проверьте цену и реквизиты в чате.';
  ELSIF NEW.event_type = 'buyer_sent_prepayment' THEN
    recipient := o.seller_id;
    n_title := 'Покупатель отправил предоплату';
    n_body := 'Проверьте зачисление и подтвердите.';
  ELSIF NEW.event_type = 'seller_confirmed_prepayment' THEN
    recipient := o.buyer_id;
    n_title := 'Предоплата получена';
    n_body := 'Продавец приступил к букету.';
  ELSIF NEW.event_type = 'seller_rejected_prepayment' THEN
    recipient := o.buyer_id;
    n_title := 'Оплата не поступила';
    n_body := 'Свяжитесь с продавцом в чате.';
  ELSIF NEW.event_type IN ('bouquet_ready_pickup','bouquet_shipped') THEN
    recipient := o.buyer_id;
    n_title := CASE WHEN NEW.event_type = 'bouquet_ready_pickup'
                    THEN 'Букет готов к самовывозу'
                    ELSE 'Букет передан в доставку' END;
    n_body := NULL;
  ELSIF NEW.event_type = 'buyer_received' THEN
    recipient := o.seller_id;
    n_title := 'Покупатель получил букет';
    n_body := NULL;
  ELSIF NEW.event_type = 'buyer_sent_full' THEN
    recipient := o.seller_id;
    n_title := 'Покупатель отправил остаток';
    n_body := NULL;
  ELSIF NEW.event_type = 'seller_confirmed_full' THEN
    recipient := o.buyer_id;
    n_title := 'Сделка завершена';
    n_body := 'Оставьте отзыв о продавце.';
  ELSIF NEW.event_type = 'cancelled' THEN
    recipient := CASE WHEN NEW.actor_id = o.buyer_id THEN o.seller_id ELSE o.buyer_id END;
    n_title := 'Сделка отменена';
    n_body := COALESCE(NEW.payload->>'reason', NULL);
  ELSIF NEW.event_type = 'problem_reported' THEN
    recipient := CASE WHEN NEW.actor_id = o.buyer_id THEN o.seller_id ELSE o.buyer_id END;
    n_title := 'По сделке сообщили о проблеме';
    n_body := COALESCE(NEW.payload->>'reason', NULL);
  ELSE
    RETURN NEW;
  END IF;

  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, order_id, listing_id, conversation_id)
    VALUES (recipient, NEW.event_type, n_title, n_body, o.id, o.listing_id, o.conversation_id);
  END IF;

  -- Notify all admins on problem reports
  IF NEW.event_type = 'problem_reported' THEN
    INSERT INTO public.notifications(user_id, type, title, body, order_id, listing_id, conversation_id)
    SELECT ur.user_id, 'problem_reported_admin', 'Жалоба по сделке', COALESCE(NEW.payload->>'reason', NULL), o.id, o.listing_id, o.conversation_id
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_events_notify ON public.deal_events;
CREATE TRIGGER deal_events_notify
AFTER INSERT ON public.deal_events
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_events_notify();

-- Allow admins to cancel/dispute any deal via a security definer function
CREATE OR REPLACE FUNCTION public.admin_cancel_deal(_order_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admin';
  END IF;

  UPDATE public.orders
     SET deal_status = 'cancelled',
         cancel_reason = COALESCE(_reason, cancel_reason)
   WHERE id = _order_id;

  UPDATE public.listings SET status = 'active'
   WHERE id = (SELECT listing_id FROM public.orders WHERE id = _order_id)
     AND status = 'reserved';

  INSERT INTO public.deal_events(order_id, actor_id, event_type, payload)
  VALUES (_order_id, auth.uid(), 'cancelled', jsonb_build_object('reason', COALESCE(_reason,'Отменено администратором'), 'by','admin'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cancel_deal(uuid, text) TO authenticated;
