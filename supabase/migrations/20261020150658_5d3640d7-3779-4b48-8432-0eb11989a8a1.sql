-- Tariffs are only read by logged-in users (admin screens, wizard). No anonymous access.
REVOKE ALL ON public.lesson_type_option_tariffs FROM anon;
DROP POLICY IF EXISTS lesson_type_option_tariffs_select ON public.lesson_type_option_tariffs;
CREATE POLICY lesson_type_option_tariffs_select ON public.lesson_type_option_tariffs
  FOR SELECT TO authenticated USING (true);

-- Fill in a missing date of birth from the agreement wizard (staff may create agreements but
-- may not update students directly). Never overwrites an existing date.
CREATE OR REPLACE FUNCTION public.set_student_date_of_birth_if_missing(p_student_user_id uuid, p_date_of_birth date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT (public.is_admin() OR public.is_site_admin() OR public.is_staff()) THEN
    RAISE EXCEPTION 'Geen rechten om de geboortedatum in te vullen' USING ERRCODE = '42501';
  END IF;
  IF p_date_of_birth IS NULL OR p_date_of_birth > CURRENT_DATE OR p_date_of_birth < DATE '1900-01-01' THEN
    RAISE EXCEPTION 'Ongeldige geboortedatum' USING ERRCODE = '22007';
  END IF;
  UPDATE public.students
     SET date_of_birth = p_date_of_birth
   WHERE user_id = p_student_user_id
     AND date_of_birth IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_student_date_of_birth_if_missing(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_date_of_birth_if_missing(uuid, date) TO authenticated, service_role;