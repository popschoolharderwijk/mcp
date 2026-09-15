-- Consolidated duo lessons: schema (is_duo_lesson, duo_pair_id) + agenda event reuse trigger.

-- ============================================================
-- Part 1: duo schema changes
-- ============================================================

-- Idempotent re-run of duo lessons migration (first run failed on profiles.id)

-- 1. Lesson types: duo flag (column may already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='lesson_types' AND column_name='is_duo_lesson') THEN
    ALTER TABLE public.lesson_types ADD COLUMN is_duo_lesson boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lesson_types_group_duo_exclusive') THEN
    ALTER TABLE public.lesson_types
      ADD CONSTRAINT lesson_types_group_duo_exclusive
      CHECK (NOT (is_group_lesson AND is_duo_lesson));
  END IF;
END $$;

-- 2. Lesson agreements: duo pair link
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='lesson_agreements' AND column_name='duo_pair_id') THEN
    ALTER TABLE public.lesson_agreements ADD COLUMN duo_pair_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_agreements_duo_pair_id
  ON public.lesson_agreements (duo_pair_id)
  WHERE duo_pair_id IS NOT NULL;

-- 3. Validation trigger (may already exist from a partial run; replace with OR REPLACE)
CREATE OR REPLACE FUNCTION public.validate_duo_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_is_duo boolean;
  v_partner_count integer;
  v_partner record;
BEGIN
  SELECT is_duo_lesson INTO v_is_duo
  FROM public.lesson_types
  WHERE id = NEW.lesson_type_id;

  IF v_is_duo IS NULL THEN
    RAISE EXCEPTION 'Onbekend lestype: %', NEW.lesson_type_id;
  END IF;

  IF v_is_duo AND NEW.duo_pair_id IS NULL THEN
    RAISE EXCEPTION 'Duo-lestype vereist een duo_pair_id';
  END IF;

  IF NOT v_is_duo AND NEW.duo_pair_id IS NOT NULL THEN
    RAISE EXCEPTION 'Niet-duo lestype mag geen duo_pair_id hebben';
  END IF;

  IF NEW.duo_pair_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_partner_count
    FROM public.lesson_agreements
    WHERE duo_pair_id = NEW.duo_pair_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true;

    IF NEW.is_active = true AND v_partner_count > 1 THEN
      RAISE EXCEPTION 'Duo-paar mag maximaal 2 actieve overeenkomsten bevatten';
    END IF;

    SELECT * INTO v_partner
    FROM public.lesson_agreements
    WHERE duo_pair_id = NEW.duo_pair_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true
    LIMIT 1;

    IF v_partner.id IS NOT NULL THEN
      IF v_partner.teacher_user_id <> NEW.teacher_user_id
         OR v_partner.lesson_type_id <> NEW.lesson_type_id
         OR v_partner.day_of_week <> NEW.day_of_week
         OR v_partner.start_time <> NEW.start_time
         OR v_partner.duration_minutes <> NEW.duration_minutes
         OR v_partner.frequency <> NEW.frequency
         OR v_partner.start_date <> NEW.start_date THEN
        RAISE EXCEPTION 'Duo-partners moeten dezelfde docent, lestype, dag, tijd, duur, frequentie en startdatum hebben';
      END IF;

      IF v_partner.student_user_id = NEW.student_user_id THEN
        RAISE EXCEPTION 'Duo-partners moeten verschillende leerlingen zijn';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_duo_agreement ON public.lesson_agreements;
CREATE TRIGGER trg_validate_duo_agreement
BEFORE INSERT OR UPDATE ON public.lesson_agreements
FOR EACH ROW EXECUTE FUNCTION public.validate_duo_agreement();

ALTER FUNCTION public.validate_duo_agreement() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_duo_agreement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_duo_agreement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_duo_agreement() FROM authenticated;

-- 4. Helper RPC: get duo partner display name (privacy-safe).
-- Caller must be the agreement's student or privileged. profiles PK is user_id.
CREATE OR REPLACE FUNCTION public.get_duo_partner_display_name(_agreement_id uuid)
RETURNS TABLE (partner_user_id uuid, display_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_privileged()
    OR EXISTS (
      SELECT 1
      FROM public.lesson_agreements la
      WHERE la.id = _agreement_id
        AND la.student_user_id = public.current_user_id()
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH me AS (
    SELECT duo_pair_id, student_user_id
    FROM public.lesson_agreements
    WHERE id = _agreement_id
  )
  SELECT vp.user_id AS partner_user_id, vp.display_name
  FROM public.lesson_agreements la
  JOIN me ON la.duo_pair_id = me.duo_pair_id
  JOIN public.view_profiles_with_display_name vp ON vp.user_id = la.student_user_id
  WHERE la.duo_pair_id IS NOT NULL
    AND la.student_user_id <> me.student_user_id
    AND la.is_active = true
  LIMIT 1;
END;
$$;

ALTER FUNCTION public.get_duo_partner_display_name(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_duo_partner_display_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_duo_partner_display_name(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_duo_partner_display_name(uuid) TO authenticated;

-- ============================================================
-- Part 2: trigger to reuse agenda_event for duo partner
-- ============================================================
-- Duo agreements: reuse existing agenda_event for partner instead of creating a new one.
-- When a second agreement with the same duo_pair_id is inserted, we add the
-- student as an additional participant to the existing event of the first agreement.

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
  v_partner_event_id UUID;
BEGIN
  v_teacher_user_id := NEW.teacher_user_id;

  IF v_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found for teacher_user_id %', NEW.teacher_user_id;
  END IF;

  -- Duo path: if an agenda_event already exists for another agreement in this duo_pair,
  -- add the student there as a participant and do NOT create a new event.
  IF NEW.duo_pair_id IS NOT NULL THEN
    SELECT ae.id INTO v_partner_event_id
    FROM public.agenda_events ae
    JOIN public.lesson_agreements la
      ON la.id = ae.source_id
     AND ae.source_type = 'lesson_agreement'::public.agenda_event_source_type
    WHERE la.duo_pair_id = NEW.duo_pair_id
      AND la.id <> NEW.id
    LIMIT 1;

    IF v_partner_event_id IS NOT NULL THEN
      INSERT INTO public.agenda_participants (event_id, user_id)
      VALUES (v_partner_event_id, NEW.student_user_id)
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(lt.name, 'Lesson') INTO v_title
  FROM public.lesson_types lt
  WHERE lt.id = NEW.lesson_type_id;

  v_end_time := NEW.start_time + (NEW.duration_minutes || ' minutes')::interval;

  BEGIN
    INSERT INTO public.agenda_events (
      source_type, source_id, owner_user_id, title,
      start_date, start_time, end_date, end_time,
      is_all_day, recurring, recurring_frequency, recurring_end_date, created_by
    ) VALUES (
      'lesson_agreement'::public.agenda_event_source_type,
      NEW.id, v_teacher_user_id, v_title,
      NEW.start_date, NEW.start_time, NEW.end_date, v_end_time,
      false, true, NEW.frequency, NEW.end_date, v_teacher_user_id
    )
    RETURNING id INTO v_agenda_event_id;

    INSERT INTO public.agenda_participants (event_id, user_id)
    VALUES (v_agenda_event_id, v_teacher_user_id);

    INSERT INTO public.agenda_participants (event_id, user_id)
    VALUES (v_agenda_event_id, NEW.student_user_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trigger_lesson_agreement_create_agenda_event() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trigger_lesson_agreement_create_agenda_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trigger_lesson_agreement_create_agenda_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_lesson_agreement_create_agenda_event() FROM authenticated;
-- Hours report with duo lesson weighting (final definition)
CREATE OR REPLACE FUNCTION public.get_hours_report(
  p_start_date date,
  p_end_date date,
  p_teacher_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF public.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH
  agreement_occurrences AS (
    SELECT
      la.id AS agreement_id,
      la.teacher_user_id,
      la.lesson_type_id,
      la.student_user_id,
      la.duration_minutes,
      la.day_of_week,
      la.frequency,
      la.start_date,
      la.end_date,
      la.start_time,
      d.occurrence_date
    FROM lesson_agreements la
    CROSS JOIN LATERAL (
      SELECT gs::date AS occurrence_date
      FROM generate_series(
        GREATEST(la.start_date, p_start_date),
        LEAST(COALESCE(la.end_date, p_end_date), p_end_date),
        INTERVAL '1 day'
      ) AS gs
    ) d
    WHERE
      EXTRACT(DOW FROM d.occurrence_date) = la.day_of_week
      AND (p_teacher_user_id IS NULL OR la.teacher_user_id = p_teacher_user_id)
      AND (
        la.frequency = 'daily'
        OR la.frequency = 'weekly'
        OR (la.frequency = 'biweekly' AND MOD(((d.occurrence_date - la.start_date)::INT), 14) = 0)
        OR (la.frequency = 'monthly' AND MOD(((d.occurrence_date - la.start_date)::INT), 28) = 0)
      )
  ),
  non_cancelled_occurrences AS (
    SELECT ao.*
    FROM agreement_occurrences ao
    WHERE NOT EXISTS (
      SELECT 1
      FROM agenda_events ae
      JOIN agenda_event_deviations lad ON lad.event_id = ae.id
      WHERE ae.source_type = 'lesson_agreement'::public.agenda_event_source_type
        AND ae.source_id = ao.agreement_id
        AND lad.is_cancelled = true
        AND (
          (lad.spans_future_occurrences = false AND lad.original_date = ao.occurrence_date)
          OR
          (lad.spans_future_occurrences = true
           AND lad.original_date <= ao.occurrence_date
           AND (lad.spans_end_date IS NULL OR lad.spans_end_date >= ao.occurrence_date)
           AND NOT EXISTS (
             SELECT 1
             FROM agenda_events ae2
             JOIN agenda_event_deviations override ON override.event_id = ae2.id
             WHERE ae2.source_type = 'lesson_agreement'::public.agenda_event_source_type
               AND ae2.source_id = ao.agreement_id
               AND override.spans_future_occurrences = false
               AND override.original_date = ao.occurrence_date
               AND override.is_cancelled = false
           )
          )
        )
    )
  ),
  occurrences_typed AS (
    SELECT
      nco.*,
      lt.is_duo_lesson,
      CASE
        WHEN s.date_of_birth IS NOT NULL THEN
          CASE
            WHEN AGE(nco.occurrence_date, s.date_of_birth) >= INTERVAL '21 years'
            THEN '21_plus'
            ELSE 'under_21'
          END
        ELSE 'unknown'
      END AS age_category
    FROM non_cancelled_occurrences nco
    JOIN lesson_types lt ON lt.id = nco.lesson_type_id
    LEFT JOIN students s ON s.user_id = nco.student_user_id
  ),
  -- Standard (non-duo) lessons: 1 lesson + full duration per student occurrence
  enriched_standard AS (
    SELECT
      teacher_user_id,
      lesson_type_id,
      age_category,
      duration_minutes::numeric AS minutes_weight,
      1::numeric AS count_weight,
      NULL::text AS duo_perspective
    FROM occurrences_typed
    WHERE COALESCE(is_duo_lesson, false) = false
  ),
  -- Duo, teacher-block view: 0.5 lesson + half duration per student occurrence
  -- (total per duo occurrence = 1 lesson + full duration, split per VAT)
  enriched_duo_teacher AS (
    SELECT
      teacher_user_id,
      lesson_type_id,
      age_category,
      (duration_minutes::numeric / 2) AS minutes_weight,
      0.5::numeric AS count_weight,
      'teacher_block'::text AS duo_perspective
    FROM occurrences_typed
    WHERE COALESCE(is_duo_lesson, false) = true
  ),
  -- Duo, student-lessons view: 1 lesson + full duration per student occurrence
  -- (totaal per duo-occurrence = 2 lessen + 2x duur)
  enriched_duo_student AS (
    SELECT
      teacher_user_id,
      lesson_type_id,
      age_category,
      duration_minutes::numeric AS minutes_weight,
      1::numeric AS count_weight,
      'student_lesson'::text AS duo_perspective
    FROM occurrences_typed
    WHERE COALESCE(is_duo_lesson, false) = true
  ),
  enriched_lessons AS (
    SELECT * FROM enriched_standard
    UNION ALL SELECT * FROM enriched_duo_teacher
    UNION ALL SELECT * FROM enriched_duo_student
  ),
  aggregated_lessons AS (
    SELECT
      e.teacher_user_id,
      e.lesson_type_id,
      e.age_category,
      e.duo_perspective,
      SUM(e.minutes_weight) AS total_minutes,
      SUM(e.count_weight) AS lesson_count
    FROM enriched_lessons e
    GROUP BY e.teacher_user_id, e.lesson_type_id, e.age_category, e.duo_perspective
  ),
  lesson_rows AS (
    SELECT
      json_build_object(
        'source_type', 'lesson',
        'teacher_user_id', a.teacher_user_id,
        'teacher_name', COALESCE(p.first_name || ' ' || p.last_name, p.first_name, p.last_name, p.email),
        'lesson_type_id', a.lesson_type_id,
        'lesson_type_name', lt.name,
        'lesson_type_color', lt.color,
        'lesson_type_icon', lt.icon,
        'age_category', a.age_category,
        'total_minutes', a.total_minutes,
        'lesson_count', a.lesson_count,
        'duo_perspective', a.duo_perspective,
        'project_id', NULL,
        'project_name', NULL
      ) AS row_json,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) AS sort_name,
      lt.name AS sort_category_name,
      a.age_category AS sort_age
    FROM aggregated_lessons a
    INNER JOIN teachers t ON a.teacher_user_id = t.user_id
    INNER JOIN profiles p ON t.user_id = p.user_id
    INNER JOIN lesson_types lt ON a.lesson_type_id = lt.id
  ),
  project_single_events AS (
    SELECT
      ae.id AS event_id,
      ae.source_id AS project_id,
      ae.start_date AS occurrence_date,
      ae.start_time,
      ae.end_time
    FROM agenda_events ae
    WHERE ae.source_type = 'project'::public.agenda_event_source_type
      AND ae.recurring = false
      AND ae.start_date BETWEEN p_start_date AND p_end_date
      AND ae.end_time IS NOT NULL
  ),
  project_recurring_events AS (
    SELECT
      ae.id AS event_id,
      ae.source_id AS project_id,
      d.occurrence_date,
      ae.start_time,
      ae.end_time
    FROM agenda_events ae
    CROSS JOIN LATERAL (
      SELECT gs::date AS occurrence_date
      FROM generate_series(
        GREATEST(ae.start_date, p_start_date),
        LEAST(COALESCE(ae.recurring_end_date, COALESCE(ae.end_date, p_end_date)), p_end_date),
        CASE ae.recurring_frequency
          WHEN 'daily' THEN INTERVAL '1 day'
          WHEN 'weekly' THEN INTERVAL '7 days'
          WHEN 'biweekly' THEN INTERVAL '14 days'
          WHEN 'monthly' THEN INTERVAL '28 days'
          ELSE INTERVAL '7 days'
        END
      ) AS gs
    ) d
    WHERE ae.source_type = 'project'::public.agenda_event_source_type
      AND ae.recurring = true
      AND ae.end_time IS NOT NULL
  ),
  all_project_occurrences AS (
    SELECT * FROM project_single_events
    UNION ALL
    SELECT * FROM project_recurring_events
  ),
  non_cancelled_project_occurrences AS (
    SELECT apo.*
    FROM all_project_occurrences apo
    WHERE NOT EXISTS (
      SELECT 1
      FROM agenda_event_deviations d
      WHERE d.event_id = apo.event_id
        AND d.is_cancelled = true
        AND (
          (d.spans_future_occurrences = false AND d.original_date = apo.occurrence_date)
          OR
          (d.spans_future_occurrences = true
           AND d.original_date <= apo.occurrence_date
           AND (d.spans_end_date IS NULL OR d.spans_end_date >= apo.occurrence_date)
           AND NOT EXISTS (
             SELECT 1
             FROM agenda_event_deviations override_dev
             WHERE override_dev.event_id = apo.event_id
               AND override_dev.spans_future_occurrences = false
               AND override_dev.original_date = apo.occurrence_date
               AND override_dev.is_cancelled = false
           )
          )
        )
    )
  ),
  enriched_projects AS (
    SELECT
      ap.user_id AS teacher_user_id,
      ncpo.project_id,
      proj.name AS project_name,
      EXTRACT(EPOCH FROM (ncpo.end_time - ncpo.start_time)) / 60 AS duration_minutes
    FROM non_cancelled_project_occurrences ncpo
    INNER JOIN agenda_participants ap ON ap.event_id = ncpo.event_id
    INNER JOIN teachers t ON t.user_id = ap.user_id
    INNER JOIN projects proj ON proj.id = ncpo.project_id
    WHERE (p_teacher_user_id IS NULL OR ap.user_id = p_teacher_user_id)
  ),
  aggregated_projects AS (
    SELECT
      ep.teacher_user_id,
      ep.project_id,
      ep.project_name,
      SUM(ep.duration_minutes)::numeric AS total_minutes,
      COUNT(*)::numeric AS event_count
    FROM enriched_projects ep
    GROUP BY ep.teacher_user_id, ep.project_id, ep.project_name
  ),
  project_rows AS (
    SELECT
      json_build_object(
        'source_type', 'project',
        'teacher_user_id', ap.teacher_user_id,
        'teacher_name', COALESCE(p.first_name || ' ' || p.last_name, p.first_name, p.last_name, p.email),
        'lesson_type_id', NULL,
        'lesson_type_name', NULL,
        'lesson_type_color', NULL,
        'lesson_type_icon', NULL,
        'age_category', 'unknown',
        'total_minutes', ap.total_minutes,
        'lesson_count', ap.event_count,
        'duo_perspective', NULL,
        'project_id', ap.project_id,
        'project_name', ap.project_name
      ) AS row_json,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) AS sort_name,
      ap.project_name AS sort_category_name,
      'unknown' AS sort_age
    FROM aggregated_projects ap
    INNER JOIN profiles p ON ap.teacher_user_id = p.user_id
  ),
  all_rows AS (
    SELECT row_json, sort_name, sort_category_name, sort_age FROM lesson_rows
    UNION ALL
    SELECT row_json, sort_name, sort_category_name, sort_age FROM project_rows
  )
  SELECT json_build_object(
    'data', COALESCE(
      (SELECT json_agg(r.row_json ORDER BY r.sort_name, r.sort_category_name, r.sort_age)
       FROM all_rows r),
      '[]'::json
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hours_report(date, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hours_report(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hours_report(date, date, uuid) TO authenticated;