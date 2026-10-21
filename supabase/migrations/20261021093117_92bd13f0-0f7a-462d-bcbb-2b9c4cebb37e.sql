DROP POLICY IF EXISTS direct_debit_invitations_select ON public.direct_debit_invitations;
CREATE POLICY direct_debit_invitations_select ON public.direct_debit_invitations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR EXISTS (
      SELECT 1 FROM public.lesson_agreements la
      WHERE la.id = direct_debit_invitations.lesson_agreement_id
        AND la.student_user_id = public.current_user_id()
    )
  );

CREATE OR REPLACE VIEW public.agreements_awaiting_mandate
WITH (security_invoker = on) AS
SELECT
  la.id AS lesson_agreement_id,
  la.student_user_id,
  NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), '') AS student_name,
  COALESCE(NULLIF(trim(s.parent_email), ''), NULLIF(trim(p.email), '')) AS recipient_email,
  lt.name AS lesson_type_name,
  la.start_date,
  la.created_at,
  inv.first_sent_at,
  inv.last_sent_at,
  GREATEST(0, current_date - COALESCE(inv.first_sent_at, la.created_at)::date) AS days_waiting
FROM public.lesson_agreements la
JOIN public.lesson_types lt ON lt.id = la.lesson_type_id
LEFT JOIN public.lesson_type_options lto ON lto.id = la.lesson_type_option_id
LEFT JOIN public.profiles p ON p.user_id = la.student_user_id
LEFT JOIN public.students s ON s.user_id = la.student_user_id
LEFT JOIN LATERAL (
  SELECT min(d.sent_at) AS first_sent_at, max(d.sent_at) AS last_sent_at
  FROM public.direct_debit_invitations d
  WHERE d.lesson_agreement_id = la.id
) inv ON true
WHERE la.payment_method = 'stripe'
  AND la.is_active
  AND (la.end_date IS NULL OR la.end_date >= current_date)
  AND COALESCE(lto.billing_kind, 'monthly') <> 'one_off'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions sub
    WHERE sub.lesson_agreement_id = la.id
      AND sub.status IN ('scheduled','trialing','active','past_due','unpaid','incomplete','paused')
      AND (sub.stripe_schedule_id IS NOT NULL OR sub.stripe_subscription_id IS NOT NULL)
  )
  AND (public.is_privileged() OR la.student_user_id = public.current_user_id());

GRANT SELECT ON public.agreements_awaiting_mandate TO authenticated;
GRANT SELECT ON public.agreements_awaiting_mandate TO service_role;