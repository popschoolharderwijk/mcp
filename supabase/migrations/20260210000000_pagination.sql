-- =============================================================================
-- PAGINATION: shared views + paginated RPC functions
-- =============================================================================

-- View for profiles with calculated display_name
-- SECURITY: Uses security_invoker = on to ensure RLS policies on profiles table
-- are enforced using the calling user's permissions, not the view owner's.
CREATE OR REPLACE VIEW view_profiles_with_display_name
WITH (security_invoker = on) AS
SELECT
  user_id,
  email,
  first_name,
  last_name,
  phone_number,
  avatar_url,
  created_at,
  COALESCE(
    NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
    email
  ) AS display_name
FROM profiles;

GRANT SELECT ON public.view_profiles_with_display_name TO authenticated;
REVOKE ALL ON TABLE public.view_profiles_with_display_name FROM anon;

COMMENT ON VIEW view_profiles_with_display_name IS 'Profile data with calculated display_name field. Uses security_invoker=on to respect RLS policies. Used by pagination functions for students, teachers, and other entities.';

-- =============================================================================
-- get_students_paginated
-- =============================================================================
-- SECURITY DEFINER: list scans must not pay per-row RLS (FORCE RLS + is_privileged /
-- get_teacher_user_id). Access is gated in the query body to match students_select:
-- privileged → all; own row; teacher → students with a lesson_agreement for that teacher.
-- current_user_id() is unaffected by the role switch. Tests:
-- tests/rls/pagination/get_students_paginated.test.ts

CREATE OR REPLACE FUNCTION get_students_paginated(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_lesson_type_id UUID DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'name',
  p_sort_direction TEXT DEFAULT 'asc',
  p_include_agreements BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_search_pattern TEXT;
  v_sort_column TEXT;
  v_sort_direction TEXT;
  v_query TEXT;
  v_needs_pre_counts BOOLEAN;
  v_is_privileged BOOLEAN;
  v_caller_id UUID;
  v_teacher_id UUID;
BEGIN
  v_sort_column := CASE p_sort_column
    WHEN 'name' THEN 'display_name'
    WHEN 'phone_number' THEN 'phone_number'
    WHEN 'status' THEN 'active_agreements_count'
    WHEN 'agreements' THEN 'agreements_count'
    WHEN 'created_at' THEN 'created_at'
    ELSE 'display_name'
  END;

  v_sort_direction := CASE LOWER(p_sort_direction)
    WHEN 'desc' THEN 'DESC'
    ELSE 'ASC'
  END;

  v_search_pattern := CASE
    WHEN p_search IS NOT NULL AND p_search != ''
    THEN '%' || LOWER(p_search) || '%'
    ELSE NULL
  END;

  v_is_privileged := public.is_privileged();
  v_caller_id := public.current_user_id();
  v_teacher_id := public.get_teacher_user_id(v_caller_id);

  v_needs_pre_counts :=
    COALESCE(p_status, 'all') IN ('active', 'inactive')
    OR COALESCE(p_sort_column, 'name') IN ('status', 'agreements');

  IF v_needs_pre_counts THEN
    v_query := format($q$
      WITH student_base AS (
        SELECT
          s.user_id, s.parent_name, s.parent_email, s.parent_phone_number,
          s.debtor_info_same_as_student, s.debtor_name, s.debtor_address,
          s.debtor_postal_code, s.debtor_city, s.created_at, s.updated_at,
          p.email, p.first_name, p.last_name, p.phone_number, p.avatar_url, p.display_name
        FROM students s
        INNER JOIN view_profiles_with_display_name p ON s.user_id = p.user_id
        WHERE (
          $7 IS TRUE
          OR s.user_id = $8
          OR (
            $9 IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM lesson_agreements la_access
              WHERE la_access.student_user_id = s.user_id
                AND la_access.teacher_user_id = $9
            )
          )
        )
        AND (
          $1 IS NULL
          OR LOWER(p.email) LIKE $1
          OR LOWER(COALESCE(p.first_name, '')) LIKE $1
          OR LOWER(COALESCE(p.last_name, '')) LIKE $1
          OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
          OR LOWER(p.display_name) LIKE $1
        )
      ),
      student_counts AS (
        SELECT
          la.student_user_id,
          COUNT(*) FILTER (WHERE la.is_active = TRUE)::INT AS active_count,
          COUNT(*)::INT AS agreements_count
        FROM lesson_agreements la
        INNER JOIN student_base sb ON la.student_user_id = sb.user_id
        WHERE (
          $7 IS TRUE
          OR la.student_user_id = $8
          OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
        )
        GROUP BY la.student_user_id
      ),
      filtered_students AS (
        SELECT
          sb.*,
          COALESCE(sc.active_count, 0)::INT AS active_agreements_count,
          COALESCE(sc.agreements_count, 0)::INT AS agreements_count
        FROM student_base sb
        LEFT JOIN student_counts sc ON sb.user_id = sc.student_user_id
        WHERE (
          $2 = 'all'
          OR ($2 = 'active' AND COALESCE(sc.active_count, 0) > 0)
          OR ($2 = 'inactive' AND COALESCE(sc.active_count, 0) = 0)
        )
        AND (
          $3 IS NULL
          OR EXISTS (
            SELECT 1 FROM lesson_agreements la
            WHERE la.student_user_id = sb.user_id
              AND la.lesson_type_id = $3
              AND (
                $7 IS TRUE
                OR la.student_user_id = $8
                OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
              )
          )
        )
      ),
      filtered_total AS (
        SELECT COUNT(*)::INT AS total_count FROM filtered_students
      ),
      paginated_students AS (
        SELECT fs.*, (SELECT total_count FROM filtered_total) AS total_count
        FROM filtered_students fs
        ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
        LIMIT $4 OFFSET $5
      ),
      page_agreements AS (
        SELECT
          la.student_user_id, la.id AS agreement_id, la.day_of_week, la.start_time,
          la.start_date, la.end_date, la.is_active, la.notes, la.duration_minutes,
          la.frequency, la.price_per_lesson,
          lt.id AS lesson_type_id, lt.name AS lesson_type_name,
          lt.icon AS lesson_type_icon, lt.color AS lesson_type_color,
          tp.first_name AS teacher_first_name, tp.last_name AS teacher_last_name,
          tp.avatar_url AS teacher_avatar_url
        FROM lesson_agreements la
        INNER JOIN paginated_students ps ON la.student_user_id = ps.user_id
        INNER JOIN teachers t ON la.teacher_user_id = t.user_id
        INNER JOIN view_profiles_with_display_name tp ON t.user_id = tp.user_id
        INNER JOIN lesson_types lt ON la.lesson_type_id = lt.id
        WHERE $6 IS TRUE
          AND (
            $7 IS TRUE
            OR la.student_user_id = $8
            OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
          )
      )
      SELECT JSON_BUILD_OBJECT(
        'data', COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ps.user_id, 'user_id', ps.user_id,
              'parent_name', ps.parent_name, 'parent_email', ps.parent_email,
              'parent_phone_number', ps.parent_phone_number,
              'debtor_info_same_as_student', ps.debtor_info_same_as_student,
              'debtor_name', ps.debtor_name, 'debtor_address', ps.debtor_address,
              'debtor_postal_code', ps.debtor_postal_code, 'debtor_city', ps.debtor_city,
              'created_at', ps.created_at, 'updated_at', ps.updated_at,
              'active_agreements_count', ps.active_agreements_count,
              'agreements_count', ps.agreements_count,
              'profile', JSON_BUILD_OBJECT(
                'email', ps.email, 'first_name', ps.first_name, 'last_name', ps.last_name,
                'phone_number', ps.phone_number, 'avatar_url', ps.avatar_url
              ),
              'agreements', CASE
                WHEN $6 IS TRUE THEN COALESCE(
                  (SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', pa.agreement_id, 'day_of_week', pa.day_of_week,
                      'start_time', pa.start_time, 'start_date', pa.start_date,
                      'end_date', pa.end_date, 'is_active', pa.is_active, 'notes', pa.notes,
                      'teacher', JSON_BUILD_OBJECT(
                        'first_name', pa.teacher_first_name, 'last_name', pa.teacher_last_name,
                        'avatar_url', pa.teacher_avatar_url
                      ),
                      'lesson_type', JSON_BUILD_OBJECT(
                        'id', pa.lesson_type_id, 'name', pa.lesson_type_name,
                        'icon', pa.lesson_type_icon, 'color', pa.lesson_type_color,
                        'duration_minutes', pa.duration_minutes, 'frequency', pa.frequency,
                        'price_per_lesson', pa.price_per_lesson
                      )
                    )
                    ORDER BY pa.day_of_week, pa.start_time
                  ) FROM page_agreements pa WHERE pa.student_user_id = ps.user_id),
                  '[]'::JSON
                )
                ELSE '[]'::JSON
              END
            )
          ) FROM paginated_students ps),
          '[]'::JSON
        ),
        'total_count', COALESCE((SELECT total_count FROM filtered_total), 0),
        'limit', $4, 'offset', $5
      )
    $q$, v_sort_column, v_sort_direction);
  ELSE
    v_query := format($q$
      WITH student_base AS (
        SELECT
          s.user_id, s.parent_name, s.parent_email, s.parent_phone_number,
          s.debtor_info_same_as_student, s.debtor_name, s.debtor_address,
          s.debtor_postal_code, s.debtor_city, s.created_at, s.updated_at,
          p.email, p.first_name, p.last_name, p.phone_number, p.avatar_url, p.display_name
        FROM students s
        INNER JOIN view_profiles_with_display_name p ON s.user_id = p.user_id
        WHERE (
          $7 IS TRUE
          OR s.user_id = $8
          OR (
            $9 IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM lesson_agreements la_access
              WHERE la_access.student_user_id = s.user_id
                AND la_access.teacher_user_id = $9
            )
          )
        )
        AND (
          $1 IS NULL
          OR LOWER(p.email) LIKE $1
          OR LOWER(COALESCE(p.first_name, '')) LIKE $1
          OR LOWER(COALESCE(p.last_name, '')) LIKE $1
          OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
          OR LOWER(p.display_name) LIKE $1
        )
        AND (
          $3 IS NULL
          OR EXISTS (
            SELECT 1 FROM lesson_agreements la
            WHERE la.student_user_id = s.user_id
              AND la.lesson_type_id = $3
              AND (
                $7 IS TRUE
                OR la.student_user_id = $8
                OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
              )
          )
        )
      ),
      filtered_total AS (
        SELECT COUNT(*)::INT AS total_count FROM student_base
      ),
      paginated_students AS (
        SELECT sb.*, (SELECT total_count FROM filtered_total) AS total_count
        FROM student_base sb
        ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
        LIMIT $4 OFFSET $5
      ),
      page_counts AS (
        SELECT
          la.student_user_id,
          COUNT(*) FILTER (WHERE la.is_active = TRUE)::INT AS active_count,
          COUNT(*)::INT AS agreements_count
        FROM lesson_agreements la
        INNER JOIN paginated_students ps ON la.student_user_id = ps.user_id
        WHERE (
          $7 IS TRUE
          OR la.student_user_id = $8
          OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
        )
        GROUP BY la.student_user_id
      ),
      page_agreements AS (
        SELECT
          la.student_user_id, la.id AS agreement_id, la.day_of_week, la.start_time,
          la.start_date, la.end_date, la.is_active, la.notes, la.duration_minutes,
          la.frequency, la.price_per_lesson,
          lt.id AS lesson_type_id, lt.name AS lesson_type_name,
          lt.icon AS lesson_type_icon, lt.color AS lesson_type_color,
          tp.first_name AS teacher_first_name, tp.last_name AS teacher_last_name,
          tp.avatar_url AS teacher_avatar_url
        FROM lesson_agreements la
        INNER JOIN paginated_students ps ON la.student_user_id = ps.user_id
        INNER JOIN teachers t ON la.teacher_user_id = t.user_id
        INNER JOIN view_profiles_with_display_name tp ON t.user_id = tp.user_id
        INNER JOIN lesson_types lt ON la.lesson_type_id = lt.id
        WHERE $6 IS TRUE
          AND (
            $7 IS TRUE
            OR la.student_user_id = $8
            OR ($9 IS NOT NULL AND la.teacher_user_id = $9)
          )
      )
      SELECT JSON_BUILD_OBJECT(
        'data', COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ps.user_id, 'user_id', ps.user_id,
              'parent_name', ps.parent_name, 'parent_email', ps.parent_email,
              'parent_phone_number', ps.parent_phone_number,
              'debtor_info_same_as_student', ps.debtor_info_same_as_student,
              'debtor_name', ps.debtor_name, 'debtor_address', ps.debtor_address,
              'debtor_postal_code', ps.debtor_postal_code, 'debtor_city', ps.debtor_city,
              'created_at', ps.created_at, 'updated_at', ps.updated_at,
              'active_agreements_count', COALESCE(pc.active_count, 0),
              'agreements_count', COALESCE(pc.agreements_count, 0),
              'profile', JSON_BUILD_OBJECT(
                'email', ps.email, 'first_name', ps.first_name, 'last_name', ps.last_name,
                'phone_number', ps.phone_number, 'avatar_url', ps.avatar_url
              ),
              'agreements', CASE
                WHEN $6 IS TRUE THEN COALESCE(
                  (SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', pa.agreement_id, 'day_of_week', pa.day_of_week,
                      'start_time', pa.start_time, 'start_date', pa.start_date,
                      'end_date', pa.end_date, 'is_active', pa.is_active, 'notes', pa.notes,
                      'teacher', JSON_BUILD_OBJECT(
                        'first_name', pa.teacher_first_name, 'last_name', pa.teacher_last_name,
                        'avatar_url', pa.teacher_avatar_url
                      ),
                      'lesson_type', JSON_BUILD_OBJECT(
                        'id', pa.lesson_type_id, 'name', pa.lesson_type_name,
                        'icon', pa.lesson_type_icon, 'color', pa.lesson_type_color,
                        'duration_minutes', pa.duration_minutes, 'frequency', pa.frequency,
                        'price_per_lesson', pa.price_per_lesson
                      )
                    )
                    ORDER BY pa.day_of_week, pa.start_time
                  ) FROM page_agreements pa WHERE pa.student_user_id = ps.user_id),
                  '[]'::JSON
                )
                ELSE '[]'::JSON
              END
            )
          ) FROM paginated_students ps
          LEFT JOIN page_counts pc ON pc.student_user_id = ps.user_id),
          '[]'::JSON
        ),
        'total_count', COALESCE((SELECT total_count FROM filtered_total), 0),
        'limit', $4, 'offset', $5
      )
    $q$, v_sort_column, v_sort_direction);
  END IF;

  EXECUTE v_query
  INTO v_result
  USING
    v_search_pattern,
    p_status,
    p_lesson_type_id,
    p_limit,
    p_offset,
    p_include_agreements,
    v_is_privileged,
    v_caller_id,
    v_teacher_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION get_students_paginated IS 'Get paginated students with profile and optional agreements. SECURITY DEFINER so list scans skip FORCE RLS; access matches students_select via is_privileged()/current_user_id()/get_teacher_user_id() in the query body. Verified by tests/rls/pagination/get_students_paginated.test.ts.';

-- =============================================================================
-- get_teachers_paginated
-- =============================================================================
-- SECURITY DEFINER: same rationale as get_students_paginated. Access matches
-- teachers_select: privileged → all; own row; student → teachers linked by
-- lesson_agreement. Tests: tests/rls/pagination/get_teachers_paginated.test.ts

CREATE OR REPLACE FUNCTION get_teachers_paginated(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_lesson_type_id UUID DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'name',
  p_sort_direction TEXT DEFAULT 'asc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_search_pattern TEXT;
  v_sort_column TEXT;
  v_sort_direction TEXT;
  v_query TEXT;
  v_is_privileged BOOLEAN;
  v_caller_id UUID;
BEGIN
  v_sort_column := CASE p_sort_column
    WHEN 'name' THEN 'display_name'
    WHEN 'phone_number' THEN 'phone_number'
    WHEN 'status' THEN 'is_active'
    WHEN 'created_at' THEN 'created_at'
    ELSE 'display_name'
  END;

  v_sort_direction := CASE LOWER(p_sort_direction)
    WHEN 'desc' THEN 'DESC'
    ELSE 'ASC'
  END;

  v_search_pattern := CASE
    WHEN p_search IS NOT NULL AND p_search != ''
    THEN '%' || LOWER(p_search) || '%'
    ELSE NULL
  END;

  v_is_privileged := public.is_privileged();
  v_caller_id := public.current_user_id();

  v_query := format($q$
    WITH teacher_base AS (
      SELECT
        t.user_id,
        t.bio,
        t.coc_issued_on,
        t.is_active,
        t.created_at,
        t.updated_at,
        p.email,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.avatar_url,
        p.display_name
      FROM teachers t
      INNER JOIN view_profiles_with_display_name p ON t.user_id = p.user_id
      WHERE (
        $6 IS TRUE
        OR t.user_id = $7
        OR EXISTS (
          SELECT 1
          FROM lesson_agreements la_access
          WHERE la_access.teacher_user_id = t.user_id
            AND la_access.student_user_id = $7
        )
      )
      AND (
        $1 IS NULL
        OR LOWER(p.email) LIKE $1
        OR LOWER(COALESCE(p.first_name, '')) LIKE $1
        OR LOWER(COALESCE(p.last_name, '')) LIKE $1
        OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
        OR LOWER(p.display_name) LIKE $1
      )
      AND (
        $2 = 'all'
        OR ($2 = 'active' AND t.is_active = TRUE)
        OR ($2 = 'inactive' AND t.is_active = FALSE)
      )
      AND (
        $3 IS NULL
        OR EXISTS (
          SELECT 1 FROM teacher_lesson_types tlt2
          WHERE tlt2.teacher_user_id = t.user_id
          AND tlt2.lesson_type_id = $3
        )
      )
    ),
    filtered_total AS (
      SELECT COUNT(*)::INT AS total_count FROM teacher_base
    ),
    paginated_teachers AS (
      SELECT
        tb.*,
        (SELECT total_count FROM filtered_total) AS total_count
      FROM teacher_base tb
      ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
      LIMIT $4
      OFFSET $5
    ),
    teacher_lesson_types_data AS (
      SELECT
        tlt.teacher_user_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', lt.id,
            'name', lt.name,
            'icon', lt.icon,
            'color', lt.color
          )
          ORDER BY lt.name
        ) AS lesson_types
      FROM teacher_lesson_types tlt
      INNER JOIN lesson_types lt ON tlt.lesson_type_id = lt.id
      INNER JOIN paginated_teachers pt ON tlt.teacher_user_id = pt.user_id
      GROUP BY tlt.teacher_user_id
    )
    SELECT JSON_BUILD_OBJECT(
      'data', COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pt.user_id,
            'user_id', pt.user_id,
            'bio', pt.bio,
            'coc_issued_on', pt.coc_issued_on,
            'is_active', pt.is_active,
            'created_at', pt.created_at,
            'updated_at', pt.updated_at,
            'profile', JSON_BUILD_OBJECT(
              'email', pt.email,
              'first_name', pt.first_name,
              'last_name', pt.last_name,
              'phone_number', pt.phone_number,
              'avatar_url', pt.avatar_url
            ),
            'lesson_types', COALESCE(tlt.lesson_types, '[]'::JSON)
          )
        ) FROM paginated_teachers pt
        LEFT JOIN teacher_lesson_types_data tlt ON tlt.teacher_user_id = pt.user_id),
        '[]'::JSON
      ),
      'total_count', COALESCE((SELECT total_count FROM filtered_total), 0),
      'limit', $4,
      'offset', $5
    )
  $q$, v_sort_column, v_sort_direction);

  EXECUTE v_query
  INTO v_result
  USING
    v_search_pattern,
    p_status,
    p_lesson_type_id,
    p_limit,
    p_offset,
    v_is_privileged,
    v_caller_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION get_teachers_paginated IS 'Get paginated teachers with profile and lesson types. SECURITY DEFINER so list scans skip FORCE RLS; access matches teachers_select via is_privileged()/current_user_id() in the query body. Verified by tests/rls/pagination/get_teachers_paginated.test.ts.';

-- =============================================================================
-- get_lesson_agreements_paginated
-- =============================================================================
-- SECURITY DEFINER: same rationale as get_students_paginated. Access matches
-- lesson_agreements_select. Replaced again in duo_lessons with thin paginate-first
-- + duo_pair_id. Tests: tests/rls/pagination/get_lesson_agreements_paginated.test.ts

CREATE OR REPLACE FUNCTION get_lesson_agreements_paginated(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_student_user_id UUID DEFAULT NULL,
  p_teacher_user_id UUID DEFAULT NULL,
  p_lesson_type_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'created_at',
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_search_pattern TEXT;
  v_sort_column TEXT;
  v_sort_direction TEXT;
  v_query TEXT;
  v_is_privileged BOOLEAN;
  v_caller_id UUID;
  v_teacher_id UUID;
BEGIN
  v_sort_column := CASE p_sort_column
    WHEN 'student' THEN 'student_display_name'
    WHEN 'teacher' THEN 'teacher_display_name'
    WHEN 'lesson' THEN 'day_of_week'
    WHEN 'duration_minutes' THEN 'duration_minutes'
    WHEN 'end_date' THEN 'end_date'
    WHEN 'created_at' THEN 'created_at'
    ELSE 'created_at'
  END;

  v_sort_direction := CASE LOWER(p_sort_direction)
    WHEN 'desc' THEN 'DESC'
    ELSE 'ASC'
  END;

  v_search_pattern := CASE
    WHEN p_search IS NOT NULL AND p_search != ''
    THEN '%' || LOWER(p_search) || '%'
    ELSE NULL
  END;

  v_is_privileged := public.is_privileged();
  v_caller_id := public.current_user_id();
  v_teacher_id := public.get_teacher_user_id(v_caller_id);

  v_query := format($q$
    WITH agreement_base AS (
      SELECT
        la.id,
        la.student_user_id,
        la.teacher_user_id,
        la.lesson_type_id,
        la.duration_minutes,
        la.frequency,
        la.price_per_lesson,
        la.day_of_week,
        la.start_time,
        la.start_date,
        la.end_date,
        la.is_active,
        la.notes,
        la.created_at,
        la.updated_at,
        sp.user_id AS student_user_id_profile,
        sp.email AS student_email,
        sp.first_name AS student_first_name,
        sp.last_name AS student_last_name,
        sp.avatar_url AS student_avatar_url,
        sp.display_name AS student_display_name,
        tp.user_id AS teacher_user_id_profile,
        tp.email AS teacher_email,
        tp.first_name AS teacher_first_name,
        tp.last_name AS teacher_last_name,
        tp.avatar_url AS teacher_avatar_url,
        tp.display_name AS teacher_display_name,
        lt.name AS lesson_type_name,
        lt.icon AS lesson_type_icon,
        lt.color AS lesson_type_color
      FROM lesson_agreements la
      INNER JOIN view_profiles_with_display_name sp ON la.student_user_id = sp.user_id
      INNER JOIN teachers t ON la.teacher_user_id = t.user_id
      INNER JOIN view_profiles_with_display_name tp ON t.user_id = tp.user_id
      INNER JOIN lesson_types lt ON la.lesson_type_id = lt.id
      WHERE (
        $8 IS TRUE
        OR la.student_user_id = $9
        OR ($10 IS NOT NULL AND la.teacher_user_id = $10)
      )
      AND (
        $1 IS NULL
        OR LOWER(sp.display_name) LIKE $1
        OR LOWER(sp.email) LIKE $1
        OR LOWER(tp.display_name) LIKE $1
        OR LOWER(tp.email) LIKE $1
        OR LOWER(lt.name) LIKE $1
      )
      AND (
        $2 IS NULL
        OR la.student_user_id = $2
      )
      AND (
        $3 IS NULL
        OR la.teacher_user_id = $3
      )
      AND (
        $4 IS NULL
        OR la.lesson_type_id = $4
      )
      AND (
        $5 IS NULL
        OR la.is_active = $5
      )
    ),
    paginated_agreements AS (
      SELECT
        ab.*,
        COUNT(*) OVER () AS total_count
      FROM agreement_base ab
      ORDER BY %I %s NULLS LAST, start_date DESC, day_of_week ASC, start_time ASC, id ASC
      LIMIT $6
      OFFSET $7
    )
    SELECT JSON_BUILD_OBJECT(
      'data', COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pa.id,
            'student_user_id', pa.student_user_id,
            'teacher_user_id', pa.teacher_user_id,
            'lesson_type_id', pa.lesson_type_id,
            'duration_minutes', pa.duration_minutes,
            'frequency', pa.frequency,
            'price_per_lesson', pa.price_per_lesson,
            'day_of_week', pa.day_of_week,
            'start_time', pa.start_time,
            'start_date', pa.start_date,
            'end_date', pa.end_date,
            'is_active', pa.is_active,
            'notes', pa.notes,
            'created_at', pa.created_at,
            'updated_at', pa.updated_at,
            'student', JSON_BUILD_OBJECT(
              'user_id', pa.student_user_id_profile,
              'email', pa.student_email,
              'first_name', pa.student_first_name,
              'last_name', pa.student_last_name,
              'avatar_url', pa.student_avatar_url,
              'display_name', pa.student_display_name
            ),
            'teacher', JSON_BUILD_OBJECT(
              'user_id', pa.teacher_user_id_profile,
              'email', pa.teacher_email,
              'first_name', pa.teacher_first_name,
              'last_name', pa.teacher_last_name,
              'avatar_url', pa.teacher_avatar_url,
              'display_name', pa.teacher_display_name
            ),
            'lesson_type', JSON_BUILD_OBJECT(
              'id', pa.lesson_type_id,
              'name', pa.lesson_type_name,
              'icon', pa.lesson_type_icon,
              'color', pa.lesson_type_color
            )
          )
        ) FROM paginated_agreements pa),
        '[]'::JSON
      ),
      'total_count', COALESCE((SELECT total_count FROM paginated_agreements LIMIT 1), 0),
      'limit', $6,
      'offset', $7
    )
  $q$, v_sort_column, v_sort_direction);

  EXECUTE v_query
  INTO v_result
  USING
    v_search_pattern,
    p_student_user_id,
    p_teacher_user_id,
    p_lesson_type_id,
    p_is_active,
    p_limit,
    p_offset,
    v_is_privileged,
    v_caller_id,
    v_teacher_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) TO authenticated;

COMMENT ON FUNCTION get_lesson_agreements_paginated IS 'Get paginated lesson agreements with student/teacher profiles and lesson type. SECURITY DEFINER so list scans skip FORCE RLS; access matches lesson_agreements_select via is_privileged()/current_user_id()/get_teacher_user_id() in the query body. Verified by tests/rls/pagination/get_lesson_agreements_paginated.test.ts.';

-- =============================================================================
-- get_users_paginated
-- =============================================================================
-- SECURITY DEFINER: `authenticated` cannot SELECT auth.users, so the join that
-- exposes last_sign_in_at is only possible with the owner's privileges. The
-- only auth.users column exposed is last_sign_in_at; the rest comes from
-- view_profiles_with_display_name and user_roles.
--
-- Consequence: view_profiles_with_display_name is security_invoker = on, so
-- inside this function it runs as the owner and RLS on profiles does NOT apply.
-- The `is_admin() OR is_site_admin()` filter in user_base is therefore the only
-- access gate — both resolve the caller via current_user_id() (auth.uid()),
-- which is unaffected by the role switch. Keep that filter in place.
--
-- Tests: tests/rls/pagination/get_users_paginated.test.ts asserts that staff,
-- teachers, students and users without a role see zero rows.

CREATE OR REPLACE FUNCTION get_users_paginated(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'name',
  p_sort_direction TEXT DEFAULT 'asc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_search_pattern TEXT;
  v_sort_column TEXT;
  v_sort_direction TEXT;
  v_query TEXT;
BEGIN
  v_sort_column := CASE p_sort_column
    WHEN 'name' THEN 'display_name'
    WHEN 'email' THEN 'email'
    WHEN 'phone_number' THEN 'phone_number'
    WHEN 'role' THEN 'role'
    WHEN 'created_at' THEN 'created_at'
    WHEN 'last_sign_in_at' THEN 'last_sign_in_at'
    ELSE 'display_name'
  END;

  v_sort_direction := CASE LOWER(p_sort_direction)
    WHEN 'desc' THEN 'DESC'
    ELSE 'ASC'
  END;

  v_search_pattern := CASE
    WHEN p_search IS NOT NULL AND p_search != ''
    THEN '%' || LOWER(p_search) || '%'
    ELSE NULL
  END;

  v_query := format($q$
    WITH user_base AS (
      SELECT
        p.user_id,
        p.email,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.avatar_url,
        p.created_at,
        au.last_sign_in_at,
        p.display_name,
        ur.role
      FROM view_profiles_with_display_name p
      LEFT JOIN user_roles ur ON p.user_id = ur.user_id
      LEFT JOIN auth.users au ON au.id = p.user_id
      WHERE (
        public.is_admin()
        OR public.is_site_admin()
      )
      AND (
        $1 IS NULL
        OR LOWER(p.email) LIKE $1
        OR LOWER(COALESCE(p.first_name, '')) LIKE $1
        OR LOWER(COALESCE(p.last_name, '')) LIKE $1
        OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
        OR LOWER(p.display_name) LIKE $1
      )
    ),
    filtered_users AS (
      SELECT
        ub.*
      FROM user_base ub
      WHERE (
        $2 IS NULL
        OR ($2 = 'none' AND ub.role IS NULL)
        OR ($2 != 'none' AND ub.role::TEXT = $2)
      )
    ),
    paginated_users AS (
      SELECT
        fu.*,
        COUNT(*) OVER () AS total_count
      FROM filtered_users fu
      ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
      LIMIT $3
      OFFSET $4
    )
    SELECT JSON_BUILD_OBJECT(
      'data', COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'user_id', pu.user_id,
            'email', pu.email,
            'first_name', pu.first_name,
            'last_name', pu.last_name,
            'phone_number', pu.phone_number,
            'avatar_url', pu.avatar_url,
            'created_at', pu.created_at,
            'last_sign_in_at', pu.last_sign_in_at,
            'role', pu.role
          )
        ) FROM paginated_users pu),
        '[]'::JSON
      ),
      'total_count', COALESCE((SELECT total_count FROM paginated_users LIMIT 1), 0),
      'limit', $3,
      'offset', $4
    )
  $q$, v_sort_column, v_sort_direction);

  EXECUTE v_query
  INTO v_result
  USING v_search_pattern, p_role, p_limit, p_offset;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_users_paginated(integer, integer, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_users_paginated(integer, integer, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_users_paginated(integer, integer, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION get_users_paginated IS 'Get paginated users with profile, role, and last_sign_in_at in a single query. Supports search, role filter, and sorting. SECURITY DEFINER because auth.users is not readable by authenticated; last_sign_in_at is the only auth.users column exposed. RLS does not apply inside this function: access is gated by is_admin() OR is_site_admin() on current_user_id() in the query body, verified by tests/rls/pagination/get_users_paginated.test.ts.';
