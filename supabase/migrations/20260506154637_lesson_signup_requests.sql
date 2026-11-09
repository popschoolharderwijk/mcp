-- 1. Extend lesson_agreements
ALTER TABLE public.lesson_agreements
  ADD COLUMN IF NOT EXISTS lesson_group_id uuid NULL REFERENCES public.lesson_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_source text NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_agreements_lesson_group_id
  ON public.lesson_agreements(lesson_group_id)
  WHERE lesson_group_id IS NOT NULL;

-- 2. Enum + table lesson_signup_requests
DO $$ BEGIN
  CREATE TYPE public.signup_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'trial_scheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.lesson_signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_type_id uuid NOT NULL REFERENCES public.lesson_types(id) ON DELETE RESTRICT,
  lesson_type_option_id uuid NULL REFERENCES public.lesson_type_options(id) ON DELETE SET NULL,
  lesson_group_id uuid NULL REFERENCES public.lesson_groups(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_number text NULL,
  date_of_birth date NULL,
  parent_name text NULL,
  parent_email text NULL,
  parent_phone_number text NULL,
  notes text NULL,
  status public.signup_request_status NOT NULL DEFAULT 'pending',
  created_agreement_id uuid NULL REFERENCES public.lesson_agreements(id) ON DELETE SET NULL,
  processed_by uuid NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_signup_requests_status
  ON public.lesson_signup_requests(status);
CREATE INDEX IF NOT EXISTS idx_lesson_signup_requests_lesson_group_id
  ON public.lesson_signup_requests(lesson_group_id);

DROP TRIGGER IF EXISTS trg_audit_lesson_signup_requests ON public.lesson_signup_requests;
CREATE TRIGGER trg_audit_lesson_signup_requests
  BEFORE INSERT OR UPDATE ON public.lesson_signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- 3. RLS lesson_signup_requests
ALTER TABLE public.lesson_signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_signup_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY lesson_signup_requests_insert_public
  ON public.lesson_signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND created_agreement_id IS NULL
    AND processed_by IS NULL
    AND processed_at IS NULL
  );

-- Privileged staff see all; authenticated users see requests matching their own email
CREATE POLICY lesson_signup_requests_select
  ON public.lesson_signup_requests
  FOR SELECT
  TO authenticated
  USING (
    is_privileged()
    OR lower(email) = lower((SELECT p.email FROM public.profiles p WHERE p.user_id = current_user_id()))
  );

CREATE POLICY lesson_signup_requests_update_staff
  ON public.lesson_signup_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

CREATE POLICY lesson_signup_requests_delete_staff
  ON public.lesson_signup_requests
  FOR DELETE
  TO authenticated
  USING (public.is_privileged());

GRANT INSERT ON public.lesson_signup_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_signup_requests TO authenticated;
GRANT ALL ON public.lesson_signup_requests TO service_role;
-- INSERT for anon is intentional (public signup); SELECT must not be granted (GraphQL lint 0026).
REVOKE SELECT ON public.lesson_signup_requests FROM anon;

-- 4. Sync trigger lesson_group_members -> lesson_agreements
CREATE OR REPLACE FUNCTION public.sync_group_member_to_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_group public.lesson_groups%ROWTYPE;
  v_agreement_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_group FROM public.lesson_groups WHERE id = NEW.lesson_group_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT id INTO v_agreement_id
      FROM public.lesson_agreements
     WHERE lesson_group_id = NEW.lesson_group_id
       AND student_user_id = NEW.student_user_id
       AND is_active = true
     LIMIT 1;

    IF v_agreement_id IS NULL THEN
      INSERT INTO public.lesson_agreements (
        student_user_id, teacher_user_id, lesson_type_id,
        day_of_week, start_time, duration_minutes, frequency,
        price_per_lesson, start_date, end_date, is_active,
        lesson_group_id, signup_source
      ) VALUES (
        NEW.student_user_id, v_group.teacher_user_id, v_group.lesson_type_id,
        v_group.day_of_week, v_group.start_time, v_group.duration_minutes, v_group.frequency,
        v_group.price_per_lesson, NEW.joined_date, NEW.left_date,
        (NEW.left_date IS NULL OR NEW.left_date >= CURRENT_DATE),
        NEW.lesson_group_id, 'group_sync'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.left_date IS DISTINCT FROM OLD.left_date THEN
      UPDATE public.lesson_agreements
         SET end_date = NEW.left_date,
             is_active = (NEW.left_date IS NULL OR NEW.left_date >= CURRENT_DATE)
       WHERE lesson_group_id = NEW.lesson_group_id
         AND student_user_id = NEW.student_user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.lesson_agreements
       SET is_active = false,
           end_date = COALESCE(end_date, CURRENT_DATE)
     WHERE lesson_group_id = OLD.lesson_group_id
       AND student_user_id = OLD.student_user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_member_to_agreement ON public.lesson_group_members;
CREATE TRIGGER trg_sync_group_member_to_agreement
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_to_agreement();

ALTER FUNCTION public.sync_group_member_to_agreement() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_group_member_to_agreement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_group_member_to_agreement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_group_member_to_agreement() FROM authenticated;

-- 5. Sync changes lesson_groups -> agreements
CREATE OR REPLACE FUNCTION public.sync_group_to_agreements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.teacher_user_id IS DISTINCT FROM OLD.teacher_user_id
     OR NEW.lesson_type_id IS DISTINCT FROM OLD.lesson_type_id
     OR NEW.day_of_week IS DISTINCT FROM OLD.day_of_week
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.frequency IS DISTINCT FROM OLD.frequency
     OR NEW.price_per_lesson IS DISTINCT FROM OLD.price_per_lesson THEN
    UPDATE public.lesson_agreements
       SET teacher_user_id = NEW.teacher_user_id,
           lesson_type_id = NEW.lesson_type_id,
           day_of_week = NEW.day_of_week,
           start_time = NEW.start_time,
           duration_minutes = NEW.duration_minutes,
           frequency = NEW.frequency,
           price_per_lesson = NEW.price_per_lesson
     WHERE lesson_group_id = NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_to_agreements ON public.lesson_groups;
CREATE TRIGGER trg_sync_group_to_agreements
  AFTER UPDATE ON public.lesson_groups
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_to_agreements();

ALTER FUNCTION public.sync_group_to_agreements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_group_to_agreements() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_group_to_agreements() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_group_to_agreements() FROM authenticated;