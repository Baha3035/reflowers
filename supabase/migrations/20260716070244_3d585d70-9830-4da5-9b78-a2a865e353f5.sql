
CREATE OR REPLACE FUNCTION public.tg_offers_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock immutable fields
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Offer fields cannot be modified';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending'::offer_status THEN
      RAISE EXCEPTION 'Only pending offers can change status';
    END IF;

    IF v_uid = OLD.seller_id THEN
      IF NEW.status NOT IN ('accepted'::offer_status, 'declined'::offer_status) THEN
        RAISE EXCEPTION 'Seller can only accept or decline';
      END IF;
    ELSIF v_uid = OLD.buyer_id THEN
      IF NEW.status <> 'cancelled'::offer_status THEN
        RAISE EXCEPTION 'Buyer can only cancel their offer';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not a participant of this offer';
    END IF;

    NEW.responded_at := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_offers_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS offers_guard_update ON public.offers;
CREATE TRIGGER offers_guard_update
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.tg_offers_guard_update();
