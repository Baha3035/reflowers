
-- 1. Allow image messages in chat
ALTER TYPE public.message_kind ADD VALUE IF NOT EXISTS 'image';

-- 2. Anti-spam: rate-limit messages per sender (max 10 / 30s)
CREATE OR REPLACE FUNCTION public.tg_messages_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent int;
BEGIN
  SELECT count(*) INTO v_recent
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at > now() - interval '30 seconds';

  IF v_recent >= 10 THEN
    RAISE EXCEPTION 'Слишком много сообщений. Подождите немного и попробуйте снова.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
CREATE TRIGGER messages_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_messages_rate_limit();
