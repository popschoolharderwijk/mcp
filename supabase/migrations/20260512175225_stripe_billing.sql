-- Stripe/billing: stripe_customers, subscriptions, subscription_invoices,
-- age-based pricing on lesson_type_options, and agreement Stripe linkage.

-- Add Stripe linkage columns on lesson_agreements
ALTER TABLE public.lesson_agreements
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_schedule_id text;

-- Age-specific prices on lesson options (in cents)
ALTER TABLE public.lesson_type_options
  ADD COLUMN IF NOT EXISTS price_per_lesson_under_21_cents integer,
  ADD COLUMN IF NOT EXISTS price_per_lesson_adult_cents integer;

-- ============================================================
-- stripe_customers: 1 customer per user
-- ============================================================
CREATE TABLE public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers FORCE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers_select"
  ON public.stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = public.current_user_id() OR public.is_privileged());

SELECT public.apply_audit_trail('public.stripe_customers'::regclass);

GRANT SELECT ON public.stripe_customers TO authenticated;
GRANT ALL ON public.stripe_customers TO service_role;
REVOKE ALL ON TABLE public.stripe_customers FROM anon;

-- ============================================================
-- subscriptions: 1 row per Stripe subscription, linked to lesson_agreement
-- Teachers must not see billing; students see own; privileged see all.
-- ============================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_agreement_id uuid NOT NULL REFERENCES public.lesson_agreements(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  stripe_price_id text NOT NULL,
  stripe_schedule_id text,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  default_payment_method_brand text,
  latest_invoice_id text,
  CONSTRAINT subscriptions_status_check CHECK (status IN (
    'scheduled','trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused'
  ))
);

CREATE INDEX idx_subscriptions_lesson_agreement_id ON public.subscriptions(lesson_agreement_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

CREATE UNIQUE INDEX idx_subscriptions_stripe_subscription_id_unique
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX idx_subscriptions_stripe_schedule_id_unique
  ON public.subscriptions(stripe_schedule_id)
  WHERE stripe_schedule_id IS NOT NULL;

CREATE UNIQUE INDEX idx_subscriptions_active_per_agreement
  ON public.subscriptions(lesson_agreement_id)
  WHERE status IN ('scheduled','trialing','active','past_due','unpaid','incomplete','paused');

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON public.subscriptions
FOR SELECT TO authenticated
USING (
  is_privileged() OR EXISTS (
    SELECT 1 FROM lesson_agreements la
    WHERE la.id = subscriptions.lesson_agreement_id
      AND la.student_user_id = current_user_id()
  )
);

SELECT public.apply_audit_trail('public.subscriptions'::regclass);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
REVOKE ALL ON TABLE public.subscriptions FROM anon;

-- ============================================================
-- subscription_invoices: mirror of Stripe invoices
-- ============================================================
CREATE TABLE public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  amount_due integer NOT NULL,
  amount_paid integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz
);

CREATE INDEX idx_subscription_invoices_subscription_id ON public.subscription_invoices(subscription_id);
CREATE INDEX idx_subscription_invoices_status ON public.subscription_invoices(status);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_invoices_select ON public.subscription_invoices
FOR SELECT TO authenticated
USING (
  is_privileged() OR EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN lesson_agreements la ON la.id = s.lesson_agreement_id
    WHERE s.id = subscription_invoices.subscription_id
      AND la.student_user_id = current_user_id()
  )
);

SELECT public.apply_audit_trail('public.subscription_invoices'::regclass);

GRANT SELECT ON public.subscription_invoices TO authenticated;
GRANT ALL ON public.subscription_invoices TO service_role;
REVOKE ALL ON TABLE public.subscription_invoices FROM anon;
