-- Rate-limit log for public signup submits (service_role only).
CREATE TABLE public.signup_submit_attempts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	email_normalized text NOT NULL,
	client_ip text NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_submit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_submit_attempts FORCE ROW LEVEL SECURITY;

CREATE POLICY signup_submit_attempts_service_only ON public.signup_submit_attempts
	AS PERMISSIVE FOR ALL TO service_role
	USING (true)
	WITH CHECK (true);

CREATE INDEX signup_submit_attempts_email_created_idx
	ON public.signup_submit_attempts (email_normalized, created_at DESC);

CREATE INDEX signup_submit_attempts_ip_created_idx
	ON public.signup_submit_attempts (client_ip, created_at DESC)
	WHERE client_ip IS NOT NULL;

GRANT ALL ON public.signup_submit_attempts TO service_role;
REVOKE ALL ON public.signup_submit_attempts FROM anon, authenticated;
