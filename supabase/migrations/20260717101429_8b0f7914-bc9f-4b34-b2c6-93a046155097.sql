
CREATE OR REPLACE FUNCTION public.tg_compute_commission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.commission := 0;
  NEW.seller_amount := NEW.price;
  RETURN NEW;
END; $function$;
