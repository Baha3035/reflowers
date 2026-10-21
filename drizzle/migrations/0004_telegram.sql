-- ============ TELEGRAM: login, private notifications, verified phone ============
-- profiles.telegram_id: the user's Telegram id (= their private chat id with the bot). Set only by the
--   server: after "Log in with Telegram" or after the user opens the bot link from /notifications.
-- profiles.telegram_notify: send notifications to Telegram (user can turn it off).
-- profiles.phone_verified_at: set when the user shares their own contact with the bot.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_notify boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- One-time tokens for linking an existing account to Telegram via t.me/<bot>?start=<token>.
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
GRANT ALL ON public.telegram_link_tokens TO service_role;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: only the server (service role) reads or writes link tokens.

-- Users may edit their own profile, but not the fields that other people trust:
-- verified badge, rating, review count, Telegram id and phone verification. Before this guard any
-- signed-in user could give themselves `verified = true` or a 5.0 rating through the API.
-- The rating trigger and server code run as a privileged role, so they are not affected.
CREATE OR REPLACE FUNCTION public.tg_profiles_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.rating := 0;
    NEW.reviews_count := 0;
    NEW.telegram_id := NULL;
    NEW.phone_verified_at := NULL;
    RETURN NEW;
  END IF;
  NEW.verified := OLD.verified;
  NEW.rating := OLD.rating;
  NEW.reviews_count := OLD.reviews_count;
  -- The user may unlink Telegram (set NULL), never point it at another account.
  IF NEW.telegram_id IS NOT NULL THEN
    NEW.telegram_id := OLD.telegram_id;
  END IF;
  -- Changing the phone drops its verification; the flag itself can't be set by the user.
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified_at := NULL;
  ELSE
    NEW.phone_verified_at := OLD.phone_verified_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_guard();

-- Public profile gets a "phone verified" flag (never the phone itself). Same columns as before + 1.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, display_name, avatar_url, seller_type, shop_name,
       city, district, bio, verified, rating, reviews_count, created_at,
       (phone_verified_at IS NOT NULL) AS phone_verified
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
