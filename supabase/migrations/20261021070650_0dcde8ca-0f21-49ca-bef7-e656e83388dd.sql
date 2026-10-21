ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS schedule_build_started_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_open_per_agreement
	ON public.subscriptions (lesson_agreement_id)
	WHERE status IN ('scheduled','trialing','active','past_due','unpaid','incomplete','paused');

CREATE OR REPLACE FUNCTION public.claim_schedule_build(p_agreement_id uuid, p_customer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	UPDATE subscriptions
	SET schedule_build_started_at = now()
	WHERE id = (
		SELECT id FROM subscriptions
		WHERE lesson_agreement_id = p_agreement_id
			AND status IN ('scheduled','trialing','active','past_due','unpaid','incomplete','paused')
			AND (schedule_build_started_at IS NULL OR schedule_build_started_at < now() - interval '5 minutes')
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE
	);
	IF FOUND THEN RETURN true; END IF;

	IF EXISTS (
		SELECT 1 FROM subscriptions
		WHERE lesson_agreement_id = p_agreement_id
			AND status IN ('scheduled','trialing','active','past_due','unpaid','incomplete','paused')
	) THEN
		RETURN false;
	END IF;

	INSERT INTO subscriptions (lesson_agreement_id, stripe_customer_id, stripe_price_id, status, schedule_build_started_at)
	VALUES (p_agreement_id, p_customer_id, '', 'incomplete', now())
	ON CONFLICT DO NOTHING;
	RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_schedule_build(p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	UPDATE subscriptions
	SET schedule_build_started_at = NULL
	WHERE lesson_agreement_id = p_agreement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_schedule_build(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_schedule_build(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_schedule_build(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_schedule_build(uuid) TO service_role;