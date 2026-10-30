-- Keep the student row while lesson agreements, a Stripe customer, or trial lessons still exist.
CREATE OR REPLACE FUNCTION public.cleanup_student_if_no_agreements(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF public.current_user_id() IS NOT NULL
     AND public.current_user_id() IS DISTINCT FROM _user_id
     AND NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lesson_agreements WHERE student_user_id = _user_id
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.stripe_customers WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.trial_lessons WHERE student_user_id = _user_id) THEN
    RETURN;
  END IF;

  DELETE FROM public.students WHERE user_id = _user_id;
END;
$$;

ALTER FUNCTION public.cleanup_student_if_no_agreements(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_student_if_no_agreements(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_student_if_no_agreements(UUID) TO service_role;
