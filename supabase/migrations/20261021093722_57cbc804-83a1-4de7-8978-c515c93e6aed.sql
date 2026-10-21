DROP FUNCTION IF EXISTS public.claim_schedule_build(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_schedule_build(p_agreement_id uuid, p_customer_id text)
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
REVOKE ALL ON FUNCTION public.claim_schedule_build(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_schedule_build(uuid, text) TO service_role;