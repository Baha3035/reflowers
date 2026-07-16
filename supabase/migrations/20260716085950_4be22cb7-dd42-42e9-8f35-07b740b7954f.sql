DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'bump_conversation_on_message'
      AND tgrelid = 'public.messages'::regclass
  ) THEN
    CREATE TRIGGER bump_conversation_on_message
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_bump_conversation();
  END IF;
END $$;