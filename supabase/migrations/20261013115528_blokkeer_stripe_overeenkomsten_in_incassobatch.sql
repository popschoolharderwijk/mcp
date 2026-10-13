-- blokkeer_stripe_overeenkomsten_in_incassobatch
-- Stripe and own SEPA run side by side per agreement; a batch item may never belong
-- to an agreement that pays via Stripe (double-payment guard).

CREATE OR REPLACE FUNCTION public.prevent_stripe_agreement_in_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lesson_agreement_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lesson_agreements la
    WHERE la.id = NEW.lesson_agreement_id AND la.payment_method = 'stripe'
  ) THEN
    RAISE EXCEPTION 'stripe_agreement_not_allowed_in_batch'
      USING HINT = 'Overeenkomsten met betaalmethode Stripe horen niet in een SEPA-incassobatch.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_stripe_agreement_in_batch() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_stripe_agreement_in_batch ON public.direct_debit_batch_items;
CREATE TRIGGER trg_prevent_stripe_agreement_in_batch
  BEFORE INSERT OR UPDATE OF lesson_agreement_id ON public.direct_debit_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_stripe_agreement_in_batch();

-- When an agreement switches to Stripe, remove its items from draft batches.
CREATE OR REPLACE FUNCTION public.remove_stripe_agreement_from_draft_batches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_ids uuid[];
  v_batch_id uuid;
BEGIN
  IF NEW.payment_method = 'stripe' AND OLD.payment_method IS DISTINCT FROM 'stripe' THEN
    SELECT array_agg(DISTINCT i.batch_id) INTO v_batch_ids
    FROM public.direct_debit_batch_items i
    JOIN public.direct_debit_batches b ON b.id = i.batch_id
    WHERE b.status = 'draft' AND i.lesson_agreement_id = NEW.id;

    IF v_batch_ids IS NOT NULL THEN
      DELETE FROM public.direct_debit_batch_items
      WHERE lesson_agreement_id = NEW.id AND batch_id = ANY (v_batch_ids);
      FOREACH v_batch_id IN ARRAY v_batch_ids LOOP
        PERFORM public.recalc_direct_debit_batch(v_batch_id);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_stripe_agreement_from_draft_batches() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_remove_stripe_agreement_from_draft_batches ON public.lesson_agreements;
CREATE TRIGGER trg_remove_stripe_agreement_from_draft_batches
  AFTER UPDATE OF payment_method ON public.lesson_agreements
  FOR EACH ROW EXECUTE FUNCTION public.remove_stripe_agreement_from_draft_batches();