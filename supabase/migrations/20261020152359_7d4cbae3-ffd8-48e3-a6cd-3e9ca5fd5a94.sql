-- BEGIN PURE TARIFF FUNCTIONS
-- Minimum term: 6 calendar months from start minus one day, rounded up to the end of that month.
CREATE OR REPLACE FUNCTION public.compute_minimum_term_end(p_start_date date)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT (date_trunc('month', p_start_date + interval '6 months' - interval '1 day') + interval '1 month' - interval '1 day')::date $$;
-- END PURE TARIFF FUNCTIONS

UPDATE public.lesson_agreements
   SET minimum_term_end = public.compute_minimum_term_end(start_date)
 WHERE minimum_term_end IS DISTINCT FROM public.compute_minimum_term_end(start_date);

-- =============================================================================
-- Stripe catalog (derived from lesson_type_options + tariffs; written only by service_role)
-- =============================================================================
CREATE TABLE public.stripe_catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_type_option_id uuid UNIQUE REFERENCES public.lesson_type_options(id) ON DELETE SET NULL,
  stripe_product_id text UNIQUE,
  product_name text,
  is_active_in_stripe boolean NOT NULL DEFAULT true,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'in_sync', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
SELECT public.apply_audit_trail('public.stripe_catalog_products');
GRANT SELECT ON public.stripe_catalog_products TO authenticated;
GRANT ALL ON public.stripe_catalog_products TO service_role;
ALTER TABLE public.stripe_catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_catalog_products_select ON public.stripe_catalog_products
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_site_admin()));

CREATE TABLE public.stripe_catalog_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_product_id uuid NOT NULL REFERENCES public.stripe_catalog_products(id) ON DELETE CASCADE,
  tariff_id uuid REFERENCES public.lesson_type_option_tariffs(id) ON DELETE SET NULL,
  age_category text NOT NULL CHECK (age_category IN ('under_21', 'adult')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  recurring boolean NOT NULL,
  lookup_key text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL UNIQUE,
  is_active_in_stripe boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX stripe_catalog_prices_product_idx ON public.stripe_catalog_prices(catalog_product_id);
CREATE INDEX stripe_catalog_prices_tariff_idx ON public.stripe_catalog_prices(tariff_id);
SELECT public.apply_audit_trail('public.stripe_catalog_prices');
GRANT SELECT ON public.stripe_catalog_prices TO authenticated;
GRANT ALL ON public.stripe_catalog_prices TO service_role;
ALTER TABLE public.stripe_catalog_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_catalog_prices_select ON public.stripe_catalog_prices
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_site_admin()));

ALTER TABLE public.accounting_settings
  ADD COLUMN stripe_tax_rate_21_id text,
  ADD COLUMN stripe_tax_rate_exempt_id text,
  ADD COLUMN stripe_catalog_last_full_sync_at timestamptz;

-- Mark catalog rows pending when the app source changes.
CREATE OR REPLACE FUNCTION public.mark_stripe_catalog_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'lesson_types' THEN
    UPDATE public.stripe_catalog_products p SET sync_status = 'pending'
      FROM public.lesson_type_options o
     WHERE o.id = p.lesson_type_option_id AND o.lesson_type_id = NEW.id AND p.sync_status <> 'pending';
  ELSIF TG_TABLE_NAME = 'lesson_type_options' THEN
    UPDATE public.stripe_catalog_products SET sync_status = 'pending'
     WHERE lesson_type_option_id = NEW.id AND sync_status <> 'pending';
  ELSIF TG_TABLE_NAME = 'lesson_type_option_tariffs' THEN
    UPDATE public.stripe_catalog_products SET sync_status = 'pending'
     WHERE lesson_type_option_id = COALESCE(NEW.lesson_type_option_id, OLD.lesson_type_option_id)
       AND sync_status <> 'pending';
  ELSIF TG_TABLE_NAME = 'stripe_catalog_products' THEN
    -- Option deleted (FK set null): orphan must be archived by the next sync.
    IF OLD.lesson_type_option_id IS NOT NULL AND NEW.lesson_type_option_id IS NULL THEN
      NEW.sync_status := 'pending';
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_stripe_catalog_pending() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_stripe_catalog_pending_lesson_types
  AFTER UPDATE OF name, is_active ON public.lesson_types
  FOR EACH ROW EXECUTE FUNCTION public.mark_stripe_catalog_pending();
CREATE TRIGGER trg_stripe_catalog_pending_options
  AFTER UPDATE ON public.lesson_type_options
  FOR EACH ROW EXECUTE FUNCTION public.mark_stripe_catalog_pending();
CREATE TRIGGER trg_stripe_catalog_pending_tariffs
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_type_option_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.mark_stripe_catalog_pending();
CREATE TRIGGER trg_stripe_catalog_orphan
  BEFORE UPDATE OF lesson_type_option_id ON public.stripe_catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.mark_stripe_catalog_pending();