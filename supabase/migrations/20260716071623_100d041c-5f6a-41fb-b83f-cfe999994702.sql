
-- Move has_role() out of the public API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop dependent policies so we can drop the public function
DROP POLICY IF EXISTS "Users see own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins view all profiles extra" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins view all listings" ON public.listings;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Recreate policies referencing private.has_role
CREATE POLICY "Users see own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id
    OR private.has_role(auth.uid(), 'moderator'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins view all profiles extra"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins view all listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Restrict reviews to participants only
DROP POLICY IF EXISTS "Authenticated read reviews" ON public.reviews;
CREATE POLICY "Participants read reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = reviewer_id OR auth.uid() = target_user_id);
