-- Vaste betaallink per overeenkomst (alleen hash van de token) en aanvragen voor een nieuwe link.
CREATE TABLE public.agreement_payment_links (
	lesson_agreement_id uuid PRIMARY KEY REFERENCES public.lesson_agreements(id) ON DELETE CASCADE,
	token_hash text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	rotated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.agreement_payment_links TO service_role;
ALTER TABLE public.agreement_payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreement_payment_links_service_only" ON public.agreement_payment_links
	AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.payment_link_requests (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	lesson_agreement_id uuid NOT NULL REFERENCES public.lesson_agreements(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_link_requests TO service_role;
ALTER TABLE public.payment_link_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_link_requests_service_only" ON public.payment_link_requests
	AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX payment_link_requests_agreement_created_idx
	ON public.payment_link_requests (lesson_agreement_id, created_at DESC);