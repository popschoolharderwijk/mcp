-- ============================================================================
-- Trial lessons table
-- ============================================================================
CREATE TYPE public.trial_lesson_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'student_confirmed',
  'student_declined',
  'converted'
);

CREATE TABLE public.trial_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_request_id uuid REFERENCES public.lesson_signup_requests(id) ON DELETE SET NULL,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL REFERENCES public.teachers(user_id) ON DELETE RESTRICT,
  lesson_type_id uuid NOT NULL REFERENCES public.lesson_types(id) ON DELETE RESTRICT,
  lesson_type_option_id uuid REFERENCES public.lesson_type_options(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  agenda_event_id uuid REFERENCES public.agenda_events(id) ON DELETE SET NULL,
  status public.trial_lesson_status NOT NULL DEFAULT 'scheduled',
  student_decision_at timestamptz,
  admin_processed_at timestamptz,
  admin_processed_by uuid REFERENCES auth.users(id),
  created_agreement_id uuid REFERENCES public.lesson_agreements(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_trial_lessons_student ON public.trial_lessons(student_user_id);
CREATE INDEX idx_trial_lessons_teacher ON public.trial_lessons(teacher_user_id);
CREATE INDEX idx_trial_lessons_status ON public.trial_lessons(status);
CREATE INDEX idx_trial_lessons_signup ON public.trial_lessons(signup_request_id);
CREATE INDEX idx_trial_lessons_agenda_event ON public.trial_lessons(agenda_event_id);
CREATE INDEX idx_trial_lessons_created_by ON public.trial_lessons(created_by);
CREATE INDEX idx_trial_lessons_updated_by ON public.trial_lessons(updated_by);
CREATE INDEX idx_trial_lessons_admin_processed_by ON public.trial_lessons(admin_processed_by);

CREATE TRIGGER trg_audit_trial_lessons
  BEFORE INSERT OR UPDATE ON public.trial_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

ALTER TABLE public.trial_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_lessons FORCE ROW LEVEL SECURITY;

-- Consolidated PERMISSIVE policies
CREATE POLICY trial_lessons_select ON public.trial_lessons
  FOR SELECT TO authenticated
  USING (
    student_user_id = public.current_user_id()
    OR teacher_user_id = public.get_teacher_user_id(public.current_user_id())
    OR public.is_privileged()
  );

CREATE POLICY trial_lessons_insert_staff ON public.trial_lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_privileged());

CREATE POLICY trial_lessons_update_staff ON public.trial_lessons
  FOR UPDATE TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

CREATE POLICY trial_lessons_delete_staff ON public.trial_lessons
  FOR DELETE TO authenticated
  USING (public.is_privileged());

-- ============================================================================
-- Extend agenda source validator for trial_lesson (CHECK is in agenda_events migration)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_agenda_event_source()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  IF NEW.source_type = 'lesson_agreement'::public.agenda_event_source_type THEN
    IF NOT EXISTS (SELECT 1 FROM public.lesson_agreements WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'source_id % does not exist in lesson_agreements', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'project'::public.agenda_event_source_type THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'source_id % does not exist in projects', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'lesson_group'::public.agenda_event_source_type THEN
    IF NOT EXISTS (SELECT 1 FROM public.lesson_groups WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'source_id % does not exist in lesson_groups', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'trial_lesson'::public.agenda_event_source_type THEN
    IF NOT EXISTS (SELECT 1 FROM public.trial_lessons WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'source_id % does not exist in trial_lessons', NEW.source_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Cascade delete agenda_events when a trial lesson is removed
CREATE TRIGGER trg_cascade_delete_agenda_events_trial_lesson
  BEFORE DELETE ON public.trial_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_agenda_events_for_source('trial_lesson');

-- ============================================================================
-- RPC: student submits trial decision (confirm | decline)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_trial_decision(
  p_trial_id uuid,
  p_decision text
)
RETURNS public.trial_lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial public.trial_lessons%ROWTYPE;
  v_uid uuid := auth.uid();
  v_new_status public.trial_lesson_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('confirm', 'decline') THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_trial FROM public.trial_lessons WHERE id = p_trial_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial not found' USING ERRCODE = '02000';
  END IF;

  IF v_trial.student_user_id <> v_uid THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  IF v_trial.status NOT IN ('scheduled', 'completed') THEN
    RAISE EXCEPTION 'Trial cannot be decided in current status' USING ERRCODE = '22023';
  END IF;

  v_new_status := CASE
    WHEN p_decision = 'confirm' THEN 'student_confirmed'::public.trial_lesson_status
    ELSE 'student_declined'::public.trial_lesson_status
  END;

  UPDATE public.trial_lessons
  SET status = v_new_status,
      student_decision_at = now()
  WHERE id = p_trial_id
  RETURNING * INTO v_trial;

  RETURN v_trial;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_trial_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_trial_decision(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_trial_decision(uuid, text) TO authenticated;

COMMENT ON TABLE public.trial_lessons IS 'Trial lessons (proeflessen) — optional step between signup and lesson agreement.';

CREATE OR REPLACE FUNCTION public.mark_trial_lesson_completed(_trial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_user_id uuid;
  v_status trial_lesson_status;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT teacher_user_id, status
    INTO v_teacher_user_id, v_status
  FROM public.trial_lessons
  WHERE id = _trial_id;

  IF v_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'trial_lesson_not_found';
  END IF;

  IF NOT (public.is_privileged() OR v_teacher_user_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_status <> 'scheduled' THEN
    RAISE EXCEPTION 'invalid_status_transition' USING DETAIL = v_status::text;
  END IF;

  UPDATE public.trial_lessons
     SET status = 'completed',
         admin_processed_at = now(),
         admin_processed_by = v_caller,
         updated_by = v_caller,
         updated_at = now()
   WHERE id = _trial_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_trial_lesson_completed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_trial_lesson_completed(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_trial_lesson_completed(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_lessons TO authenticated;
REVOKE ALL ON TABLE public.trial_lessons FROM anon;
