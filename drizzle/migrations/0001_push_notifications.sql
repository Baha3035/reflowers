-- ============ WEB PUSH ============
-- push_subscriptions: one row per browser/device that allowed notifications.
-- push_outbox: what to push. Filled by triggers (every in-app notification, every chat
-- message); src/lib/push.functions.ts sends pending rows and marks them sent.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Inserts/updates go through the server (service role), which may move an endpoint to the
-- user now signed in on that device.

CREATE TABLE IF NOT EXISTS public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  url text NOT NULL DEFAULT '/notifications',
  tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS push_outbox_pending_idx ON public.push_outbox (created_at) WHERE sent_at IS NULL;
GRANT ALL ON public.push_outbox TO service_role;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role reads or writes the outbox.

CREATE OR REPLACE FUNCTION public.tg_notifications_to_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_outbox(user_id, title, body, url, tag)
  VALUES (
    NEW.user_id,
    NEW.title,
    NEW.body,
    CASE
      WHEN NEW.conversation_id IS NOT NULL THEN '/conversation/' || NEW.conversation_id
      WHEN NEW.listing_id IS NOT NULL THEN '/listing/' || NEW.listing_id
      ELSE '/notifications'
    END,
    COALESCE('order-' || NEW.order_id, 'notification-' || NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_to_push ON public.notifications;
CREATE TRIGGER notifications_to_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_notifications_to_push();

CREATE OR REPLACE FUNCTION public.tg_messages_to_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c public.conversations%ROWTYPE;
  recipient uuid;
  sender_name text;
BEGIN
  IF NEW.kind = 'system' THEN RETURN NEW; END IF;
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF c.id IS NULL THEN RETURN NEW; END IF;
  recipient := CASE WHEN NEW.sender_id = c.buyer_id THEN c.seller_id ELSE c.buyer_id END;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(p.shop_name, ''), NULLIF(p.display_name, ''), 'Собеседник')
    INTO sender_name FROM public.profiles p WHERE p.id = NEW.sender_id;

  INSERT INTO public.push_outbox(user_id, title, body, url, tag)
  VALUES (
    recipient,
    COALESCE(sender_name, 'Собеседник'),
    CASE WHEN NEW.body IS NOT NULL AND NEW.body <> '' THEN left(NEW.body, 140) ELSE '📷 Фото' END,
    '/conversation/' || NEW.conversation_id,
    'chat-' || NEW.conversation_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_to_push ON public.messages;
CREATE TRIGGER messages_to_push
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_messages_to_push();

REVOKE ALL ON FUNCTION public.tg_notifications_to_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_messages_to_push() FROM PUBLIC, anon, authenticated;