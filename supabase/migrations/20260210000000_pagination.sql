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

CREATE OR REPLACE FUNCTION get_students_paginated(
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
SECURITY INVOKER
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
    WHEN 'phone_number' THEN 'phone_number'
    WHEN 'status' THEN 'active_agreements_count'
    WHEN 'agreements' THEN 'active_agreements_count'
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

  v_query := format($q$
    WITH student_base AS (
      SELECT DISTINCT
        s.user_id, s.parent_name, s.parent_email, s.parent_phone_number,
        s.debtor_info_same_as_student, s.debtor_name, s.debtor_address,
        s.debtor_postal_code, s.debtor_city, s.created_at, s.updated_at,
        p.email, p.first_name, p.last_name, p.phone_number, p.avatar_url, p.display_name
      FROM students s
      INNER JOIN view_profiles_with_display_name p ON s.user_id = p.user_id
      WHERE (
        $1 IS NULL
        OR LOWER(p.email) LIKE $1
        OR LOWER(COALESCE(p.first_name, '')) LIKE $1
        OR LOWER(COALESCE(p.last_name, '')) LIKE $1
        OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
        OR LOWER(p.display_name) LIKE $1
      )
    ),
    student_agreements AS (
      SELECT
        la.student_user_id, la.id AS agreement_id, la.teacher_user_id,
        la.day_of_week, la.start_time, la.start_date, la.end_date,
        la.is_active, la.notes, la.duration_minutes, la.frequency, la.price_per_lesson,
        lt.id AS lesson_type_id, lt.name AS lesson_type_name,
        lt.icon AS lesson_type_icon, lt.color AS lesson_type_color,
        tp.first_name AS teacher_first_name, tp.last_name AS teacher_last_name,
        tp.avatar_url AS teacher_avatar_url
      FROM lesson_agreements la
      INNER JOIN student_base sb ON la.student_user_id = sb.user_id
      INNER JOIN teachers t ON la.teacher_user_id = t.user_id
      INNER JOIN view_profiles_with_display_name tp ON t.user_id = tp.user_id
      INNER JOIN lesson_types lt ON la.lesson_type_id = lt.id
    ),
    student_active_counts AS (
      SELECT student_user_id, COUNT(*) FILTER (WHERE is_active = TRUE) AS active_count
      FROM student_agreements GROUP BY student_user_id
    ),
    filtered_students AS (
      SELECT sb.*, COALESCE(sac.active_count, 0)::INT AS active_agreements_count
      FROM student_base sb
      LEFT JOIN student_active_counts sac ON sb.user_id = sac.student_user_id
      WHERE (
        $2 = 'all'
        OR ($2 = 'active' AND COALESCE(sac.active_count, 0) > 0)
        OR ($2 = 'inactive' AND COALESCE(sac.active_count, 0) = 0)
      )
      AND (
        $3 IS NULL
        OR EXISTS (SELECT 1 FROM student_agreements sa WHERE sa.student_user_id = sb.user_id AND sa.lesson_type_id = $3)
      )
    ),
    paginated_students AS (
      SELECT fs.*, COUNT(*) OVER () AS total_count
      FROM filtered_students fs
      ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
      LIMIT $4 OFFSET $5
    ),
    students_with_agreements AS (
      SELECT
        ps.user_id, ps.parent_name, ps.parent_email, ps.parent_phone_number,
        ps.debtor_info_same_as_student, ps.debtor_name, ps.debtor_address,
        ps.debtor_postal_code, ps.debtor_city, ps.created_at, ps.updated_at,
        ps.active_agreements_count, ps.total_count,
        JSON_BUILD_OBJECT(
          'email', ps.email, 'first_name', ps.first_name, 'last_name', ps.last_name,
          'phone_number', ps.phone_number, 'avatar_url', ps.avatar_url
        ) AS profile,
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', sa.agreement_id, 'day_of_week', sa.day_of_week,
              'start_time', sa.start_time, 'start_date', sa.start_date,
              'end_date', sa.end_date, 'is_active', sa.is_active, 'notes', sa.notes,
              'teacher', JSON_BUILD_OBJECT(
                'first_name', sa.teacher_first_name, 'last_name', sa.teacher_last_name,
                'avatar_url', sa.teacher_avatar_url
              ),
              'lesson_type', JSON_BUILD_OBJECT(
                'id', sa.lesson_type_id, 'name', sa.lesson_type_name,
                'icon', sa.lesson_type_icon, 'color', sa.lesson_type_color,
                'duration_minutes', sa.duration_minutes, 'frequency', sa.frequency,
                'price_per_lesson', sa.price_per_lesson
              )
            )
            ORDER BY sa.day_of_week, sa.start_time
          )
          FROM student_agreements sa WHERE sa.student_user_id = ps.user_id),
          '[]'::JSON
        ) AS agreements
      FROM paginated_students ps
    )
    SELECT JSON_BUILD_OBJECT(
      'data', COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', swa.user_id, 'user_id', swa.user_id,
            'parent_name', swa.parent_name, 'parent_email', swa.parent_email,
            'parent_phone_number', swa.parent_phone_number,
            'debtor_info_same_as_student', swa.debtor_info_same_as_student,
            'debtor_name', swa.debtor_name, 'debtor_address', swa.debtor_address,
            'debtor_postal_code', swa.debtor_postal_code, 'debtor_city', swa.debtor_city,
            'created_at', swa.created_at, 'updated_at', swa.updated_at,
            'active_agreements_count', swa.active_agreements_count,
            'profile', swa.profile, 'agreements', swa.agreements
          )
        ) FROM students_with_agreements swa),
        '[]'::JSON
      ),
      'total_count', COALESCE((SELECT total_count FROM students_with_agreements LIMIT 1), 0),
      'limit', $4, 'offset', $5
    )
  $q$, v_sort_column, v_sort_direction);

  EXECUTE v_query INTO v_result USING v_search_pattern, p_status, p_lesson_type_id, p_limit, p_offset;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_students_paginated(integer, integer, text, text, uuid, text, text) TO authenticated;

-- =============================================================================
-- get_teachers_paginated
-- =============================================================================

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
SECURITY INVOKER
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

  v_query := format($q$
    WITH     teacher_base AS (
      SELECT
        t.user_id,
        t.bio,
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
        $1 IS NULL
        OR LOWER(p.email) LIKE $1
        OR LOWER(COALESCE(p.first_name, '')) LIKE $1
        OR LOWER(COALESCE(p.last_name, '')) LIKE $1
        OR LOWER(COALESCE(p.phone_number, '')) LIKE $1
        OR LOWER(p.display_name) LIKE $1
      )
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
      INNER JOIN teacher_base tb ON tlt.teacher_user_id = tb.user_id
      GROUP BY tlt.teacher_user_id
    ),
    filtered_teachers AS (
      SELECT
        tb.*,
        COALESCE(tlt.lesson_types, '[]'::JSON) AS lesson_types_json
      FROM teacher_base tb
      LEFT JOIN teacher_lesson_types_data tlt ON tb.user_id = tlt.teacher_user_id
      WHERE (
        $2 = 'all'
        OR ($2 = 'active' AND tb.is_active = TRUE)
        OR ($2 = 'inactive' AND tb.is_active = FALSE)
      )
      AND (
        $3 IS NULL
        OR EXISTS (
          SELECT 1 FROM teacher_lesson_types tlt2
          WHERE tlt2.teacher_user_id = tb.user_id
          AND tlt2.lesson_type_id = $3
        )
      )
    ),
    paginated_teachers AS (
      SELECT
        ft.*,
        COUNT(*) OVER () AS total_count
      FROM filtered_teachers ft
      ORDER BY %I %s NULLS LAST, display_name ASC, user_id ASC
      LIMIT $4
      OFFSET $5
    )
    SELECT JSON_BUILD_OBJECT(
      'data', COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pt.user_id,
            'user_id', pt.user_id,
            'bio', pt.bio,
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
            'lesson_types', pt.lesson_types_json
          )
        ) FROM paginated_teachers pt),
        '[]'::JSON
      ),
      'total_count', COALESCE((SELECT total_count FROM paginated_teachers LIMIT 1), 0),
      'limit', $4,
      'offset', $5
    )
  $q$, v_sort_column, v_sort_direction);

  EXECUTE v_query
  INTO v_result
  USING v_search_pattern, p_status, p_lesson_type_id, p_limit, p_offset;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teachers_paginated(integer, integer, text, text, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION get_teachers_paginated IS 'Get paginated teachers with all related data (profile, lesson types) in a single efficient query. SECURITY INVOKER: access enforced by RLS on teachers. Supports search, status filter, lesson type filter, and sorting.';

-- =============================================================================
-- get_lesson_agreements_paginated
-- =============================================================================

CREATE OR REPLACE FUNCTION get_lesson_agreements_paginated(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_student_user_id UUID DEFAULT NULL,
  p_teacher_user_id UUID DEFAULT NULL,
  p_lesson_type_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'start_date',
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
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
    WHEN 'student_name' THEN 'student_display_name'
    WHEN 'teacher_name' THEN 'teacher_display_name'
    WHEN 'lesson_type' THEN 'lesson_type_name'
    WHEN 'day_of_week' THEN 'day_of_week'
    WHEN 'start_time' THEN 'start_time'
    WHEN 'start_date' THEN 'start_date'
    WHEN 'is_active' THEN 'is_active'
    ELSE 'start_date'
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
    WITH     agreement_base AS (
      SELECT
        la.id,
        la.student_user_id,
        la.teacher_user_id,
        la.lesson_type_id,
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
        $1 IS NULL
        OR LOWER(sp.display_name) LIKE $1
        OR LOWER(sp.email) LIKE $1
        OR LOWER(tp.display_name) LIKE $1
        OR LOWER(tp.email) LIKE $1
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
  USING v_search_pattern, p_student_user_id, p_teacher_user_id, p_lesson_type_id, p_is_active, p_limit, p_offset;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_agreements_paginated(integer, integer, text, uuid, uuid, uuid, boolean, text, text) TO authenticated;

COMMENT ON FUNCTION get_lesson_agreements_paginated IS 'Get paginated lesson agreements with all related data (student profile, teacher profile, lesson type) in a single efficient query. SECURITY INVOKER: access enforced by RLS on lesson_agreements. Supports search, filtering by student, teacher, lesson type, and active status, and sorting.';

-- =============================================================================
-- get_users_paginated
-- =============================================================================

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
SECURITY INVOKER
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
        p.display_name,
        ur.role
      FROM view_profiles_with_display_name p
      LEFT JOIN user_roles ur ON p.user_id = ur.user_id
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

COMMENT ON FUNCTION get_users_paginated IS 'Get paginated users with all related data (profile, role) in a single efficient query. Supports search, role filter, and sorting. Uses COUNT(*) OVER() for efficient total count and dynamic SQL for optimized sorting. Only admin/site_admin can access this function.';
