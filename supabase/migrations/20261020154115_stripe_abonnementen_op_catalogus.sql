-- Fase 3a: Stripe subscriptions on the catalog; price per lesson removed.

CREATE OR REPLACE FUNCTION public.sync_group_member_to_agreement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public' SET row_security TO 'off'
AS $function$
DECLARE
  v_group public.lesson_groups%ROWTYPE;
  v_agreement_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_group FROM public.lesson_groups WHERE id = NEW.lesson_group_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    SELECT id INTO v_agreement_id FROM public.lesson_agreements
     WHERE lesson_group_id = NEW.lesson_group_id AND student_user_id = NEW.student_user_id AND is_active = true
     LIMIT 1;
    IF v_agreement_id IS NULL THEN
      INSERT INTO public.lesson_agreements (
        student_user_id, teacher_user_id, lesson_type_id,
        day_of_week, start_time, duration_minutes, frequency,
        start_date, end_date, is_active, lesson_group_id, signup_source
      ) VALUES (
        NEW.student_user_id, v_group.teacher_user_id, v_group.lesson_type_id,
        v_group.day_of_week, v_group.start_time, v_group.duration_minutes, v_group.frequency,
        NEW.joined_date, NEW.left_date,
        (NEW.left_date IS NULL OR NEW.left_date >= CURRENT_DATE),
        NEW.lesson_group_id, 'group_sync'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.left_date IS DISTINCT FROM OLD.left_date THEN
      UPDATE public.lesson_agreements
         SET end_date = NEW.left_date, is_active = (NEW.left_date IS NULL OR NEW.left_date >= CURRENT_DATE)
       WHERE lesson_group_id = NEW.lesson_group_id AND student_user_id = NEW.student_user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.lesson_agreements
       SET is_active = false, end_date = COALESCE(end_date, CURRENT_DATE)
     WHERE lesson_group_id = OLD.lesson_group_id AND student_user_id = OLD.student_user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_group_to_agreements()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public' SET row_security TO 'off'
AS $function$
BEGIN
  IF NEW.teacher_user_id IS DISTINCT FROM OLD.teacher_user_id
     OR NEW.lesson_type_id IS DISTINCT FROM OLD.lesson_type_id
     OR NEW.day_of_week IS DISTINCT FROM OLD.day_of_week
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.frequency IS DISTINCT FROM OLD.frequency THEN
    UPDATE public.lesson_agreements
       SET teacher_user_id = NEW.teacher_user_id,
           lesson_type_id = NEW.lesson_type_id,
           day_of_week = NEW.day_of_week,
           start_time = NEW.start_time,
           duration_minutes = NEW.duration_minutes,
           frequency = NEW.frequency
     WHERE lesson_group_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Paginated list functions: drop price_per_lesson from their output (rewritten in place).
DO $do$
DECLARE
  v_def text;
BEGIN
  FOR v_def IN
    SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('get_lesson_agreements_paginated', 'get_students_paginated')
  LOOP
    -- get_students_paginated: SELECT uses la.price_per_lesson; JSON uses sa.price_per_lesson.
    v_def := regexp_replace(v_def, '\m(la|pi|sa|pa)\.price_per_lesson\s*,\s*', '', 'g');
    v_def := regexp_replace(v_def, ',\s*''price_per_lesson''\s*,\s*(la|pi|sa|pa)\.price_per_lesson', '', 'g');
    IF v_def LIKE '%price_per_lesson%' THEN
      RAISE EXCEPTION 'price_per_lesson still referenced after rewrite';
    END IF;
    EXECUTE v_def;
  END LOOP;
END
$do$;

ALTER TABLE public.lesson_agreements
  DROP COLUMN IF EXISTS price_per_lesson,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS stripe_schedule_id;
ALTER TABLE public.lesson_groups DROP COLUMN IF EXISTS price_per_lesson;
ALTER TABLE public.lesson_type_options
  DROP COLUMN IF EXISTS price_per_lesson,
  DROP COLUMN IF EXISTS price_per_lesson_under_21_cents,
  DROP COLUMN IF EXISTS price_per_lesson_adult_cents;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS needs_rebuild boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_horizon_end date,
  ADD COLUMN IF NOT EXISTS last_rebuilt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_rebuild_error text,
  ADD COLUMN IF NOT EXISTS first_invoice_month date,
  ADD COLUMN IF NOT EXISTS first_invoice_due_on date,
  ADD COLUMN IF NOT EXISTS first_invoice_status text
    CHECK (first_invoice_status IN ('pending', 'sent', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS first_invoice_stripe_id text,
  ADD COLUMN IF NOT EXISTS last_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_check_month date,
  ADD COLUMN IF NOT EXISTS last_check_expected_cents bigint,
  ADD COLUMN IF NOT EXISTS last_check_stripe_cents bigint;

ALTER TABLE public.accounting_settings
  ADD COLUMN IF NOT EXISTS stripe_portal_configuration_id text;

CREATE OR REPLACE FUNCTION public.agreement_fee_months(p_agreement_id uuid, p_from_month date, p_months integer)
RETURNS TABLE (month date, amount_cents bigint, age_category text, btw_rate integer,
               is_prorated boolean, tariff_effective_from date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m::date, f.amount_cents, f.age_category, f.btw_rate, f.is_prorated, f.tariff_effective_from
  FROM generate_series(
         date_trunc('month', p_from_month),
         date_trunc('month', p_from_month) + make_interval(months => GREATEST(p_months, 1) - 1),
         interval '1 month') AS m
  CROSS JOIN LATERAL public.compute_agreement_month_fee(p_agreement_id, m::date) AS f
$$;
REVOKE EXECUTE ON FUNCTION public.agreement_fee_months(uuid, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agreement_fee_months(uuid, date, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_subscriptions_needs_rebuild()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'lesson_agreements' THEN
    UPDATE public.subscriptions SET needs_rebuild = true
     WHERE lesson_agreement_id = NEW.id AND stripe_schedule_id IS NOT NULL
       AND status NOT IN ('canceled', 'incomplete_expired');
  ELSIF TG_TABLE_NAME = 'lesson_type_option_tariffs' THEN
    UPDATE public.subscriptions s SET needs_rebuild = true
      FROM public.lesson_agreements la
     WHERE la.id = s.lesson_agreement_id
       AND la.lesson_type_option_id = COALESCE(NEW.lesson_type_option_id, OLD.lesson_type_option_id)
       AND s.stripe_schedule_id IS NOT NULL AND s.status NOT IN ('canceled', 'incomplete_expired');
  ELSIF TG_TABLE_NAME = 'students' THEN
    UPDATE public.subscriptions s SET needs_rebuild = true
      FROM public.lesson_agreements la
     WHERE la.id = s.lesson_agreement_id AND la.student_user_id = NEW.user_id
       AND s.stripe_schedule_id IS NOT NULL AND s.status NOT IN ('canceled', 'incomplete_expired');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_subscriptions_needs_rebuild() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_subscriptions_rebuild_agreement
  AFTER UPDATE OF lesson_type_option_id, start_date, end_date, cancellation_effective_date, is_active
  ON public.lesson_agreements
  FOR EACH ROW EXECUTE FUNCTION public.mark_subscriptions_needs_rebuild();
CREATE TRIGGER trg_subscriptions_rebuild_tariff
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_type_option_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.mark_subscriptions_needs_rebuild();
CREATE TRIGGER trg_subscriptions_rebuild_dob
  AFTER UPDATE OF date_of_birth ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.mark_subscriptions_needs_rebuild();

UPDATE public.email_templates
   SET body_html = replace(replace(replace(body_html,
         '<strong>Prijs per les:</strong> {{prijs_per_les}}', '<strong>Lesgeld:</strong> {{bedrag}}'),
         'voor <strong>{{prijs_per_les}}</strong> per les', 'voor <strong>{{bedrag}}</strong>'),
         '{{prijs_per_les}}', '{{bedrag}}')
 WHERE body_html LIKE '%{{prijs_per_les}}%';