
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
-- policies still evaluate has_role because RLS runs functions with definer privileges internally
