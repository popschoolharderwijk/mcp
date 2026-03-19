-- =============================================================================
-- AGENDA EVENTS, PARTICIPANTS, AND DEVIATIONS (UNIFIED MODEL)
-- =============================================================================
-- This migration creates:
-- 1. agenda_events: single table for all agenda items (manual + lesson_agreement-backed)
-- 2. agenda_participants: many-to-many users <-> events (FK to agenda_events only)
-- 3. agenda_event_deviations: deviations for any recurring agenda event (FK to agenda_events)
-- 4. Trigger on lesson_agreements INSERT: create one agenda_event + participants
-- 5. DELETE of lesson_agreement: CASCADE on agenda_events.source_id removes event + participants + deviations
-- 6. RLS, triggers, and RPCs for deviations (generic, owner via agenda_events.owner_user_id)
--
-- Replaces lesson_appointment_deviations: no separate table; all events live in agenda_events.
-- =============================================================================

-- =============================================================================
-- SECTION 1: AGENDA_EVENTS TABLE
-- =============================================================================
-- agenda_event_source_type enum is created in 20260210194748_projects.sql

CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source: manual, lesson_agreement, or project (polymorphic; validated by trigger)
  source_type public.agenda_event_source_type NOT NULL,
  source_id UUID, -- lesson_agreements(id) or projects(id) depending on source_type; cascade via trigger

  -- Owner: for RLS (creator for manual, teacher for lesson_agreement)
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_date DATE,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,

  -- Recurring (generic; future: RRULE/BYDAY)
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency public.lesson_frequency, -- daily, weekly, biweekly, monthly (from lesson_types migration)
  recurring_end_date DATE,

  -- Visual
  color TEXT,

  CONSTRAINT agenda_events_source_check CHECK (
    (source_type = 'manual'::public.agenda_event_source_type AND source_id IS NULL)
    OR (source_type = 'lesson_agreement'::public.agenda_event_source_type AND source_id IS NOT NULL)
    OR (source_type = 'project'::public.agenda_event_source_type AND source_id IS NOT NULL)
  ),
  CONSTRAINT agenda_events_end_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT agenda_events_time_check CHECK (
    end_date IS NULL
    OR end_time IS NULL
    OR (end_date > start_date OR (end_date = start_date AND end_time >= start_time))
  ),
  CONSTRAINT agenda_events_recurring_check CHECK (
    (recurring = false AND recurring_frequency IS NULL AND recurring_end_date IS NULL)
    OR (recurring = true AND recurring_frequency IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_owner_user_id ON public.agenda_events(owner_user_id);
-- Covering index for "my events in date range" queries
CREATE INDEX IF NOT EXISTS idx_agenda_events_owner_start ON public.agenda_events(owner_user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_agenda_events_start_date ON public.agenda_events(start_date);
-- One agenda_event per lesson_agreement; projects may have multiple events
CREATE UNIQUE INDEX IF NOT EXISTS unique_agenda_event_per_lesson_agreement
  ON public.agenda_events(source_type, source_id)
  WHERE source_type = 'lesson_agreement'::public.agenda_event_source_type AND source_id IS NOT NULL;

COMMENT ON TABLE public.agenda_events IS 'Unified table for all agenda items: manual events, lesson-appointment events, and project events.';
COMMENT ON COLUMN public.agenda_events.source_type IS 'manual = user-created; lesson_agreement = from lesson_agreements; project = from projects.';
COMMENT ON COLUMN public.agenda_events.source_id IS 'When source_type = lesson_agreement: lesson_agreements(id). When source_type = project: projects(id). Cascade delete via trigger.';
COMMENT ON COLUMN public.agenda_events.owner_user_id IS 'User who can edit/delete this event (creator for manual, teacher for lesson_agreement).';

-- Validate source_id references and cascade deletes (projects exist from 20260210194748_projects.sql)
CREATE OR REPLACE FUNCTION public.validate_agenda_event_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.source_type = 'lesson_agreement'::public.agenda_event_source_type THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lesson_agreements WHERE id = NEW.source_id
    ) THEN
      RAISE EXCEPTION 'source_id % does not exist in lesson_agreements', NEW.source_id;
    END IF;

  ELSIF NEW.source_type = 'project'::public.agenda_event_source_type THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects WHERE id = NEW.source_id
    ) THEN
      RAISE EXCEPTION 'source_id % does not exist in projects', NEW.source_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agenda_event_source
  BEFORE INSERT OR UPDATE ON public.agenda_events
  FOR EACH ROW
  WHEN (NEW.source_id IS NOT NULL)
  EXECUTE FUNCTION public.validate_agenda_event_source();

CREATE OR REPLACE FUNCTION public.cascade_delete_agenda_events_for_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  DELETE FROM public.agenda_events
  WHERE source_id = OLD.id
    AND source_type = TG_ARGV[0]::public.agenda_event_source_type;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cascade_delete_agenda_events_project
  BEFORE DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_agenda_events_for_source('project');

CREATE TRIGGER trg_cascade_delete_agenda_events_lesson_agreement
  BEFORE DELETE ON public.lesson_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_agenda_events_for_source('lesson_agreement');

-- =============================================================================
-- SECTION 2: AGENDA_PARTICIPANTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agenda_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT agenda_participants_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_participants_user_id ON public.agenda_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_participants_event_id ON public.agenda_participants(event_id);

COMMENT ON TABLE public.agenda_participants IS 'Participants for agenda events. All events reference agenda_events(id); no event_type.';

-- =============================================================================
-- SECTION 3: AGENDA_EVENT_DEVIATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agenda_event_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  original_start_time TIME NOT NULL,
  actual_date DATE NOT NULL,
  actual_start_time TIME NOT NULL,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  spans_future_occurrences BOOLEAN NOT NULL DEFAULT false,
  spans_end_date DATE,
  reason TEXT,
  title TEXT,
  description TEXT,
  color TEXT,
  participant_ids UUID[],

  CONSTRAINT agenda_event_deviations_unique UNIQUE (event_id, original_date)
  -- No CHECK (actual_date >= CURRENT_DATE): validate in app or trigger to avoid timezone/backup issues
);

CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_event_id ON public.agenda_event_deviations(event_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_original_date ON public.agenda_event_deviations(original_date);
CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_actual_date ON public.agenda_event_deviations(actual_date);
CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_is_cancelled ON public.agenda_event_deviations(is_cancelled) WHERE is_cancelled = true;
CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_spans_end_date ON public.agenda_event_deviations(spans_end_date) WHERE spans_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_event_deviations_spans_future ON public.agenda_event_deviations(event_id) WHERE spans_future_occurrences = true;

COMMENT ON COLUMN public.agenda_event_deviations.spans_future_occurrences IS 'True when this deviation applies to original_date and all future occurrences until spans_end_date (cf. agenda_events.recurring = event repeats).';
COMMENT ON TABLE public.agenda_event_deviations IS 'Deviations for any recurring agenda event (move/cancel occurrences). Replaces lesson_appointment_deviations.';

-- =============================================================================
-- SECTION 4: TRIGGER ON LESSON_AGREEMENTS INSERT
-- =============================================================================

-- Rely on UNIQUE (source_type, source_id) to prevent duplicates; no race-prone IF EXISTS.
CREATE OR REPLACE FUNCTION public.trigger_lesson_agreement_create_agenda_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_teacher_user_id UUID;
  v_title TEXT;
  v_end_time TIME;
  v_agenda_event_id UUID;
BEGIN
  v_teacher_user_id := NEW.teacher_user_id;

  IF v_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found for teacher_user_id %', NEW.teacher_user_id;
  END IF;

  SELECT COALESCE(lt.name, 'Lesson') INTO v_title
  FROM public.lesson_types lt
  WHERE lt.id = NEW.lesson_type_id;

  v_end_time := NEW.start_time + (NEW.duration_minutes || ' minutes')::interval;

  BEGIN
    INSERT INTO public.agenda_events (
      source_type,
      source_id,
      owner_user_id,
      title,
      start_date,
      start_time,
      end_date,
      end_time,
      is_all_day,
      recurring,
      recurring_frequency,
      recurring_end_date,
      created_by
    ) VALUES (
      'lesson_agreement'::public.agenda_event_source_type,
      NEW.id,
      v_teacher_user_id,
      v_title,
      NEW.start_date,
      NEW.start_time,
      NEW.end_date,
      v_end_time,
      false,
      true,
      NEW.frequency,
      NEW.end_date,
      v_teacher_user_id
    )
    RETURNING id INTO v_agenda_event_id;

    INSERT INTO public.agenda_participants (event_id, user_id)
    VALUES (v_agenda_event_id, v_teacher_user_id);

    INSERT INTO public.agenda_participants (event_id, user_id)
    VALUES (v_agenda_event_id, NEW.student_user_id);
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent insert or duplicate trigger: UNIQUE (source_type, source_id) already enforced
      RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trigger_lesson_agreement_create_agenda_event() OWNER TO postgres;

CREATE TRIGGER lesson_agreement_insert_agenda_event_trigger
AFTER INSERT ON public.lesson_agreements
FOR EACH ROW
EXECUTE FUNCTION public.trigger_lesson_agreement_create_agenda_event();

-- =============================================================================
-- SECTION 5: AUDIT TRAIL (must be before RLS policies that reference created_by)
-- =============================================================================
-- Add audit columns and triggers via helper function from baseline

SELECT public.apply_audit_trail('public.agenda_events');

SELECT public.apply_audit_trail('public.agenda_event_deviations');

-- =============================================================================
-- SECTION 5b: ENABLE RLS
-- =============================================================================

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.agenda_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_participants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.agenda_event_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_event_deviations FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 5b: HELPERS FOR RLS (avoid recursion: agenda_events <-> agenda_participants)
-- =============================================================================

-- Helper to get event owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_agenda_event_owner(ev_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT owner_user_id FROM public.agenda_events WHERE id = ev_id LIMIT 1;
$$;
ALTER FUNCTION public.get_agenda_event_owner(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_agenda_event_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agenda_event_owner(uuid) TO authenticated;

-- Helper: current session user may manage event (owner or privileged). No uid argument — not spoofable.
CREATE OR REPLACE FUNCTION public.can_manage_agenda_event(ev_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agenda_events
    WHERE id = ev_id
      AND (
        owner_user_id = public.current_user_id()
        OR public.is_privileged()
      )
  );
$$;
ALTER FUNCTION public.can_manage_agenda_event(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_manage_agenda_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_agenda_event(uuid) TO authenticated;

-- Helper to check if user is participant of event - bypasses RLS
CREATE OR REPLACE FUNCTION public.is_agenda_participant(ev_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agenda_participants
    WHERE event_id = ev_id AND user_id = uid
  );
$$;
ALTER FUNCTION public.is_agenda_participant(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_agenda_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_agenda_participant(uuid, uuid) TO authenticated;

-- =============================================================================
-- SECTION 6: RLS POLICIES
-- =============================================================================

-- agenda_events: SELECT if owner, participant, or privileged
-- Uses helper function to check participant to avoid recursion with agenda_participants RLS
CREATE POLICY agenda_events_select
ON public.agenda_events FOR SELECT TO authenticated
USING (
  owner_user_id = public.current_user_id()
  OR public.is_agenda_participant(agenda_events.id, public.current_user_id())
  OR public.is_privileged()
);

-- agenda_events: INSERT for authenticated (owner_user_id/created_by set by caller)
-- Restrict: user can only insert events where they are owner, or privileged
CREATE POLICY agenda_events_insert
ON public.agenda_events FOR INSERT TO authenticated
WITH CHECK (owner_user_id = public.current_user_id() OR public.is_privileged());

-- agenda_events: UPDATE/DELETE only owner or privileged
CREATE POLICY agenda_events_update
ON public.agenda_events FOR UPDATE TO authenticated
USING (owner_user_id = public.current_user_id() OR public.is_privileged())
WITH CHECK (owner_user_id = public.current_user_id() OR public.is_privileged());

CREATE POLICY agenda_events_delete
ON public.agenda_events FOR DELETE TO authenticated
USING (owner_user_id = public.current_user_id() OR public.is_privileged());

-- agenda_participants: SELECT own rows, or event owner, or privileged (use helper to avoid RLS recursion)
CREATE POLICY agenda_participants_select
ON public.agenda_participants FOR SELECT TO authenticated
USING (
  user_id = public.current_user_id()
  OR public.is_privileged()
  OR public.get_agenda_event_owner(event_id) = public.current_user_id()
);

-- agenda_participants: INSERT only event owner or privileged
-- Additional restriction: non-privileged users cannot add teachers as participants (except themselves)
-- Uses helper function to avoid recursion with agenda_events RLS
CREATE POLICY agenda_participants_insert
ON public.agenda_participants FOR INSERT TO authenticated
WITH CHECK (
  -- Privileged users can add anyone
  public.is_privileged()
  OR (
    -- Event owner can add participants...
    public.get_agenda_event_owner(event_id) = public.current_user_id()
    AND (
      -- ...owner can always add themselves
      user_id = public.current_user_id()
      -- ...or add non-teachers
      OR NOT public.is_teacher(user_id)
    )
  )
);

CREATE POLICY agenda_participants_update
ON public.agenda_participants FOR UPDATE TO authenticated
USING (public.can_manage_agenda_event(event_id))
WITH CHECK (public.can_manage_agenda_event(event_id));

CREATE POLICY agenda_participants_delete
ON public.agenda_participants FOR DELETE TO authenticated
USING (public.can_manage_agenda_event(event_id));

-- agenda_event_deviations: SELECT if participant of event or privileged
-- Uses helper function to avoid recursion
CREATE POLICY agenda_event_deviations_select
ON public.agenda_event_deviations FOR SELECT TO authenticated
USING (
  public.is_agenda_participant(agenda_event_deviations.event_id, public.current_user_id())
  OR public.is_privileged()
);

-- agenda_event_deviations: INSERT/UPDATE/DELETE only event owner or privileged
-- Uses helper function to avoid recursion
CREATE POLICY agenda_event_deviations_insert
ON public.agenda_event_deviations FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_agenda_event(event_id)
);

CREATE POLICY agenda_event_deviations_update
ON public.agenda_event_deviations FOR UPDATE TO authenticated
USING (public.can_manage_agenda_event(event_id))
WITH CHECK (public.can_manage_agenda_event(event_id));

CREATE POLICY agenda_event_deviations_delete
ON public.agenda_event_deviations FOR DELETE TO authenticated
USING (public.can_manage_agenda_event(event_id));

-- =============================================================================
-- SECTION 7: DEVIATION TRIGGERS (immutable fields, no-op delete, validity)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_agenda_deviation_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'Cannot change event_id after creation';
  END IF;
  IF NEW.original_date IS DISTINCT FROM OLD.original_date THEN
    RAISE EXCEPTION 'Cannot change original_date after creation';
  END IF;
  IF NEW.original_start_time IS DISTINCT FROM OLD.original_start_time THEN
    RAISE EXCEPTION 'Cannot change original_start_time after creation';
  END IF;
  -- created_by immutability is handled by set_audit_fields() trigger
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_agenda_deviation_immutable_fields() OWNER TO postgres;

CREATE TRIGGER enforce_agenda_deviation_immutable_fields_trigger
BEFORE UPDATE ON public.agenda_event_deviations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_agenda_deviation_immutable_fields();

CREATE OR REPLACE FUNCTION public.auto_delete_noop_agenda_deviation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.actual_date = NEW.original_date
     AND NEW.actual_start_time = NEW.original_start_time
     AND NEW.is_cancelled = false
     AND NEW.title IS NULL
     AND NEW.description IS NULL
     AND NEW.color IS NULL
     AND (NEW.participant_ids IS NULL OR array_length(NEW.participant_ids, 1) IS NULL) THEN
    DELETE FROM public.agenda_event_deviations WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.auto_delete_noop_agenda_deviation() OWNER TO postgres;

CREATE TRIGGER auto_delete_noop_agenda_deviation_trigger
BEFORE UPDATE ON public.agenda_event_deviations
FOR EACH ROW
EXECUTE FUNCTION public.auto_delete_noop_agenda_deviation();

CREATE OR REPLACE FUNCTION public.enforce_agenda_deviation_validity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_recurring_override BOOLEAN;
BEGIN
  IF NEW.actual_date IS DISTINCT FROM NEW.original_date
     OR NEW.actual_start_time IS DISTINCT FROM NEW.original_start_time THEN
    RETURN NEW;
  END IF;
  IF NEW.is_cancelled = true THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS NOT NULL OR NEW.description IS NOT NULL OR NEW.color IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.participant_ids IS NOT NULL AND array_length(NEW.participant_ids, 1) > 0 THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1
    FROM public.agenda_event_deviations d
    WHERE d.event_id = NEW.event_id
      AND d.id IS DISTINCT FROM NEW.id
      AND d.spans_future_occurrences = true
      AND d.original_date < NEW.original_date
      AND (d.spans_end_date IS NULL OR d.spans_end_date >= NEW.original_date)
  ) INTO v_has_recurring_override;

  IF v_has_recurring_override THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Deviation must actually deviate from the original schedule, be cancelled, or serve as an override for a recurring deviation. actual_date=%, original_date=%, actual_start_time=%, original_start_time=%',
    NEW.actual_date, NEW.original_date, NEW.actual_start_time, NEW.original_start_time;
END;
$$;

ALTER FUNCTION public.enforce_agenda_deviation_validity() OWNER TO postgres;

CREATE TRIGGER enforce_agenda_deviation_validity_trigger
BEFORE INSERT ON public.agenda_event_deviations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_agenda_deviation_validity();

-- =============================================================================
-- SECTION 8b: PREVENT OWNER REMOVAL FROM PARTICIPANTS
-- =============================================================================
-- The owner of an event must always remain a participant.
-- This trigger prevents deletion of the owner from agenda_participants.

CREATE OR REPLACE FUNCTION public.prevent_owner_participant_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.agenda_events ae
    WHERE ae.id = OLD.event_id AND ae.owner_user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove event owner from participants';
  END IF;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.prevent_owner_participant_removal() OWNER TO postgres;

CREATE TRIGGER prevent_owner_participant_removal_trigger
BEFORE DELETE ON public.agenda_participants
FOR EACH ROW
EXECUTE FUNCTION public.prevent_owner_participant_removal();

-- =============================================================================
-- SECTION 9: RPCs (generic: event_id = agenda_events.id)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.shift_recurring_deviation_to_next_week(p_deviation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dev RECORD;
  v_ev RECORD;
  v_next_week_original DATE;
  v_next_week_actual DATE;
  v_new_id UUID;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_dev
  FROM public.agenda_event_deviations
  WHERE id = p_deviation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deviation not found: %', p_deviation_id;
  END IF;

  IF NOT v_dev.spans_future_occurrences THEN
    RAISE EXCEPTION 'Deviation does not span future occurrences: %', p_deviation_id;
  END IF;

  SELECT * INTO v_ev FROM public.agenda_events WHERE id = v_dev.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agenda event not found for deviation: %', p_deviation_id;
  END IF;

  IF v_ev.owner_user_id IS DISTINCT FROM public.current_user_id() AND NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_next_week_original := v_dev.original_date + INTERVAL '7 days';
  v_next_week_actual := v_dev.actual_date + INTERVAL '7 days';

  DELETE FROM public.agenda_event_deviations WHERE id = p_deviation_id;

  INSERT INTO public.agenda_event_deviations (
    event_id,
    original_date,
    original_start_time,
    actual_date,
    actual_start_time,
    is_cancelled,
    spans_future_occurrences,
    reason,
    created_by,
    updated_by
  ) VALUES (
    v_dev.event_id,
    v_next_week_original,
    v_ev.start_time,
    v_next_week_actual,
    v_dev.actual_start_time,
    v_dev.is_cancelled,
    true,
    v_dev.reason,
    public.current_user_id(),
    public.current_user_id()
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

ALTER FUNCTION public.shift_recurring_deviation_to_next_week(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.shift_recurring_deviation_to_next_week(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_recurring_deviation_from_week(
  p_deviation_id UUID,
  p_week_date DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dev RECORD;
  v_ev RECORD;
  v_recurring_end_date DATE;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_dev
  FROM public.agenda_event_deviations
  WHERE id = p_deviation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deviation not found: %', p_deviation_id;
  END IF;

  SELECT * INTO v_ev FROM public.agenda_events WHERE id = v_dev.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agenda event not found for deviation: %', p_deviation_id;
  END IF;
  IF v_ev.owner_user_id IS DISTINCT FROM public.current_user_id() AND NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT v_dev.spans_future_occurrences THEN
    RAISE EXCEPTION 'Deviation does not span future occurrences: %', p_deviation_id;
  END IF;

  IF p_week_date = v_dev.original_date THEN
    DELETE FROM public.agenda_event_deviations WHERE id = p_deviation_id;
    RETURN 'deleted';
  END IF;

  v_recurring_end_date := p_week_date - INTERVAL '7 days';
  UPDATE public.agenda_event_deviations
  SET spans_end_date = v_recurring_end_date,
      updated_by = public.current_user_id()
  WHERE id = p_deviation_id;

  RETURN 'updated';
END;
$$;

ALTER FUNCTION public.end_recurring_deviation_from_week(UUID, DATE) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.end_recurring_deviation_from_week(UUID, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_week_shows_original_slot(
  p_event_id UUID,
  p_week_date DATE,
  p_scope TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ev RECORD;
  v_row RECORD;
  v_recurring RECORD;
  v_has_recurring_for_week BOOLEAN;
  v_recurring_end_date DATE;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_scope IS DISTINCT FROM 'only_this' AND p_scope IS DISTINCT FROM 'this_and_future' THEN
    RAISE EXCEPTION 'p_scope must be only_this or this_and_future, got: %', p_scope;
  END IF;

  SELECT * INTO v_ev FROM public.agenda_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agenda event not found: %', p_event_id;
  END IF;

  IF v_ev.owner_user_id IS DISTINCT FROM public.current_user_id() AND NOT public.is_privileged() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row
  FROM public.agenda_event_deviations
  WHERE event_id = p_event_id
    AND original_date = p_week_date
  LIMIT 1;

  IF FOUND THEN
    IF v_row.spans_future_occurrences THEN
      IF p_scope = 'this_and_future' THEN
        DELETE FROM public.agenda_event_deviations WHERE id = v_row.id;
        RETURN 'recurring_deleted';
      ELSE
        PERFORM public.shift_recurring_deviation_to_next_week(v_row.id);
        RETURN 'recurring_shifted';
      END IF;
    ELSE
      DELETE FROM public.agenda_event_deviations WHERE id = v_row.id;

      SELECT EXISTS (
        SELECT 1
        FROM public.agenda_event_deviations d
        WHERE d.event_id = p_event_id
          AND d.spans_future_occurrences = true
          AND d.original_date <= p_week_date
          AND (d.spans_end_date IS NULL OR d.spans_end_date >= p_week_date)
      ) INTO v_has_recurring_for_week;

      IF v_has_recurring_for_week THEN
        INSERT INTO public.agenda_event_deviations (
          event_id,
          original_date,
          original_start_time,
          actual_date,
          actual_start_time,
          spans_future_occurrences,
          created_by,
          updated_by
        ) VALUES (
          p_event_id,
          p_week_date,
          v_ev.start_time,
          p_week_date,
          v_ev.start_time,
          false,
          auth.uid(),
          auth.uid()
        );
        RETURN 'single_replaced_with_override';
      END IF;
      RETURN 'single_deleted';
    END IF;
  END IF;

  SELECT * INTO v_recurring
  FROM public.agenda_event_deviations
  WHERE event_id = p_event_id
    AND spans_future_occurrences = true
    AND original_date <= p_week_date
    AND (spans_end_date IS NULL OR spans_end_date >= p_week_date)
  ORDER BY original_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'no_op';
  END IF;

  IF p_scope = 'this_and_future' THEN
    v_recurring_end_date := p_week_date - INTERVAL '7 days';
    UPDATE public.agenda_event_deviations
    SET spans_end_date = v_recurring_end_date,
        updated_by = public.current_user_id()
    WHERE id = v_recurring.id;
    RETURN 'recurring_ended';
  END IF;

  INSERT INTO public.agenda_event_deviations (
    event_id,
    original_date,
    original_start_time,
    actual_date,
    actual_start_time,
    spans_future_occurrences,
    created_by,
    updated_by
  ) VALUES (
    p_event_id,
    p_week_date,
    v_ev.start_time,
    p_week_date,
    v_ev.start_time,
    false,
    auth.uid(),
    auth.uid()
  );
  RETURN 'override_inserted';
END;
$$;

ALTER FUNCTION public.ensure_week_shows_original_slot(UUID, DATE, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.ensure_week_shows_original_slot(UUID, DATE, TEXT) TO authenticated;

-- =============================================================================
-- SECTION 10: PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_event_deviations TO authenticated;

-- =============================================================================
-- END OF AGENDA EVENTS MIGRATION
-- =============================================================================
