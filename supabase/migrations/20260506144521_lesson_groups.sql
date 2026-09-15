
-- ============================================================================
-- 1. lesson_groups
-- ============================================================================
CREATE TABLE public.lesson_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id),
  teacher_user_id UUID NOT NULL REFERENCES public.teachers(user_id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  frequency public.lesson_frequency NOT NULL,
  price_per_lesson NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_lesson >= 0),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT lesson_groups_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_lesson_groups_teacher ON public.lesson_groups(teacher_user_id);
CREATE INDEX idx_lesson_groups_lesson_type ON public.lesson_groups(lesson_type_id);

CREATE OR REPLACE FUNCTION public.validate_lesson_group_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_types
    WHERE id = NEW.lesson_type_id AND is_group_lesson = true
  ) THEN
    RAISE EXCEPTION 'lesson_type % is not a group lesson', NEW.lesson_type_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_lesson_group_type() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_lesson_group_type() FROM anon;

CREATE TRIGGER trg_validate_lesson_group_type
  BEFORE INSERT OR UPDATE OF lesson_type_id ON public.lesson_groups
  FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_group_type();

SELECT public.apply_audit_trail('public.lesson_groups'::regclass);
ALTER TABLE public.lesson_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_groups FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. lesson_group_members
-- ============================================================================
CREATE TABLE public.lesson_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_group_id UUID NOT NULL REFERENCES public.lesson_groups(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  left_date DATE,
  CONSTRAINT lesson_group_members_unique UNIQUE (lesson_group_id, student_user_id),
  CONSTRAINT lesson_group_members_date_range CHECK (left_date IS NULL OR left_date >= joined_date)
);

CREATE INDEX idx_lesson_group_members_group ON public.lesson_group_members(lesson_group_id);
CREATE INDEX idx_lesson_group_members_student ON public.lesson_group_members(student_user_id);

SELECT public.apply_audit_trail('public.lesson_group_members'::regclass);
ALTER TABLE public.lesson_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_group_members FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Helpers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_lesson_group_teacher(_group_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT teacher_user_id FROM public.lesson_groups WHERE id = _group_id;
$$;
REVOKE ALL ON FUNCTION public.get_lesson_group_teacher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_group_teacher(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_group_teacher(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_lesson_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_group_members
    WHERE lesson_group_id = _group_id AND student_user_id = _user_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_lesson_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_lesson_group_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_lesson_group_member(uuid, uuid) TO authenticated;

-- ============================================================================
-- 4. RLS lesson_groups
-- ============================================================================
CREATE POLICY lesson_groups_select ON public.lesson_groups
FOR SELECT TO authenticated
USING (
  teacher_user_id = public.get_teacher_user_id(public.current_user_id())
  OR public.is_lesson_group_member(id, public.current_user_id())
  OR public.is_privileged()
);

CREATE POLICY lesson_groups_insert_staff ON public.lesson_groups
FOR INSERT TO authenticated
WITH CHECK (public.is_privileged());

CREATE POLICY lesson_groups_update_staff ON public.lesson_groups
FOR UPDATE TO authenticated
USING (public.is_privileged())
WITH CHECK (public.is_privileged());

CREATE POLICY lesson_groups_delete_staff ON public.lesson_groups
FOR DELETE TO authenticated
USING (public.is_privileged());

-- ============================================================================
-- 5. RLS lesson_group_members
-- ============================================================================
CREATE POLICY lesson_group_members_select ON public.lesson_group_members
FOR SELECT TO authenticated
USING (
  student_user_id = public.current_user_id()
  OR public.get_lesson_group_teacher(lesson_group_id) = public.get_teacher_user_id(public.current_user_id())
  OR public.is_privileged()
);

CREATE POLICY lesson_group_members_insert_staff ON public.lesson_group_members
FOR INSERT TO authenticated
WITH CHECK (public.is_privileged());

CREATE POLICY lesson_group_members_update_staff ON public.lesson_group_members
FOR UPDATE TO authenticated
USING (public.is_privileged())
WITH CHECK (public.is_privileged());

CREATE POLICY lesson_group_members_delete_staff ON public.lesson_group_members
FOR DELETE TO authenticated
USING (public.is_privileged());

-- ============================================================================
-- 6. Source validation (lesson_group) + cascade delete
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cascade_delete_agenda_events_lesson_group
  BEFORE DELETE ON public.lesson_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_agenda_events_for_source('lesson_group');

-- ============================================================================
-- 7. Auto-sync agenda_participants for lesson_group events
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_lesson_group_event_participants(_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_group_id uuid;
  v_teacher_user_id uuid;
BEGIN
  SELECT source_id INTO v_group_id
  FROM public.agenda_events
  WHERE id = _event_id AND source_type = 'lesson_group'::public.agenda_event_source_type;
  IF v_group_id IS NULL THEN RETURN; END IF;

  SELECT teacher_user_id INTO v_teacher_user_id FROM public.lesson_groups WHERE id = v_group_id;

  DELETE FROM public.agenda_participants ap
  WHERE ap.event_id = _event_id
    AND ap.user_id <> v_teacher_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.lesson_group_members m
      WHERE m.lesson_group_id = v_group_id
        AND m.student_user_id = ap.user_id
        AND m.left_date IS NULL
    );

  INSERT INTO public.agenda_participants (event_id, user_id)
  VALUES (_event_id, v_teacher_user_id)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  INSERT INTO public.agenda_participants (event_id, user_id)
  SELECT _event_id, m.student_user_id
  FROM public.lesson_group_members m
  WHERE m.lesson_group_id = v_group_id AND m.left_date IS NULL
  ON CONFLICT (event_id, user_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_lesson_group_event_participants(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_lesson_group_event_participants(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_lesson_group_event_participants(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_participants_on_event_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  IF NEW.source_type = 'lesson_group'::public.agenda_event_source_type THEN
    PERFORM public.sync_lesson_group_event_participants(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agenda_events_sync_lesson_group_participants
  AFTER INSERT ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_participants_on_event_insert();

CREATE OR REPLACE FUNCTION public.trg_sync_participants_on_member_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_group_id uuid;
  v_event RECORD;
BEGIN
  v_group_id := COALESCE(NEW.lesson_group_id, OLD.lesson_group_id);
  FOR v_event IN
    SELECT id FROM public.agenda_events
    WHERE source_type = 'lesson_group'::public.agenda_event_source_type
      AND source_id = v_group_id
  LOOP
    PERFORM public.sync_lesson_group_event_participants(v_event.id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_lesson_group_members_sync_participants
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_group_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_participants_on_member_change();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_groups TO authenticated;
GRANT ALL ON public.lesson_groups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_group_members TO authenticated;
GRANT ALL ON public.lesson_group_members TO service_role;

REVOKE ALL ON TABLE public.lesson_groups FROM anon;
REVOKE ALL ON TABLE public.lesson_group_members FROM anon;

ALTER FUNCTION public.validate_lesson_group_type() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_lesson_group_type() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_lesson_group_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_lesson_group_type() FROM authenticated;

ALTER FUNCTION public.trg_sync_participants_on_event_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_sync_participants_on_event_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_sync_participants_on_event_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_sync_participants_on_event_insert() FROM authenticated;

ALTER FUNCTION public.trg_sync_participants_on_member_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_sync_participants_on_member_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_sync_participants_on_member_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_sync_participants_on_member_change() FROM authenticated;