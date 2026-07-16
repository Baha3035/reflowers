
-- 1) handle_new_user: подхватывает seller_type и shop_name из метаданных
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_type public.seller_type;
  v_shop_name text;
BEGIN
  v_seller_type := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'seller_type','')::public.seller_type,
    'private'
  );
  v_shop_name := NULLIF(NEW.raw_user_meta_data->>'shop_name','');

  INSERT INTO public.profiles (id, display_name, avatar_url, seller_type, shop_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_seller_type,
    v_shop_name
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 2) Админ-доступ к отслеживанию (без рекурсии — через has_role)
CREATE POLICY "Admins view all profiles extra" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all listings" ON public.listings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
