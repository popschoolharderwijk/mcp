-- Fixed payment link per agreement (token hash only) + rate-limit log for "send new link".
CREATE TABLE public.agreement_payment_links (
	lesson_agreement_id uuid PRIMARY KEY REFERENCES public.lesson_agreements(id) ON DELETE CASCADE,
	token_hash text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	rotated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_payment_links FORCE ROW LEVEL SECURITY;

CREATE POLICY agreement_payment_links_service_only ON public.agreement_payment_links
	AS PERMISSIVE FOR ALL TO service_role
	USING (true)
	WITH CHECK (true);

GRANT ALL ON public.agreement_payment_links TO service_role;
REVOKE ALL ON public.agreement_payment_links FROM anon, authenticated;

CREATE TABLE public.payment_link_requests (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	lesson_agreement_id uuid NOT NULL REFERENCES public.lesson_agreements(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_link_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY payment_link_requests_service_only ON public.payment_link_requests
	AS PERMISSIVE FOR ALL TO service_role
	USING (true)
	WITH CHECK (true);

CREATE INDEX payment_link_requests_agreement_created_idx
	ON public.payment_link_requests (lesson_agreement_id, created_at DESC);

GRANT ALL ON public.payment_link_requests TO service_role;
REVOKE ALL ON public.payment_link_requests FROM anon, authenticated;

-- First period end: 6 calendar months from start, rounded to month end.
CREATE OR REPLACE FUNCTION public.compute_minimum_term_end(p_start_date date)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
	SELECT (
		date_trunc('month', p_start_date + interval '6 months' - interval '1 day')
		+ interval '1 month'
		- interval '1 day'
	)::date
$$;

ALTER TABLE public.lesson_agreements
	ADD COLUMN IF NOT EXISTS minimum_term_end date;

COMMENT ON COLUMN public.lesson_agreements.minimum_term_end IS
	'End of the first 6-month period shown on the payment page; computed on agreement create/update.';
