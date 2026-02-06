-- =============================================================================
-- LESSON AGREEMENTS TABLE
-- =============================================================================
-- This migration creates:
-- 1. lesson_agreements table for managing lesson agreements (lesovereenkomsten)
-- 2. RLS policies for the table
-- 3. Triggers for data integrity
--
-- Lesson agreements define scheduled lessons between students and teachers.
-- =============================================================================

-- =============================================================================
-- SECTION 1: TYPES
-- =============================================================================
-- No custom types needed for this migration

-- =============================================================================
-- SECTION 2: TABLES
-- =============================================================================

-- Lesson agreements table - defines scheduled lessons between students and teachers
CREATE TABLE IF NOT EXISTS public.lesson_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id),

  -- Scheduling
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status and notes
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Data integrity constraints
  CONSTRAINT lesson_agreements_end_date_check CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_student_id ON public.lesson_agreements(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_teacher_id ON public.lesson_agreements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_lesson_type_id ON public.lesson_agreements(lesson_type_id);
CREATE INDEX IF NOT EXISTS idx_lesson_agreements_is_active ON public.lesson_agreements(is_active);

-- =============================================================================
-- SECTION 3: ENABLE RLS
-- =============================================================================

ALTER TABLE public.lesson_agreements ENABLE ROW LEVEL SECURITY;
-- FORCE RLS: Even table owner / service_role is subject to RLS policies.
-- This is a security best practice but means admin scripts must use service_role
-- or bypass RLS explicitly. Many teams omit FORCE for operational flexibility.
ALTER TABLE public.lesson_agreements FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 4: RLS POLICIES
-- =============================================================================

-- Students can only view their own lesson agreements
-- Uses helper function to bypass RLS on students table
CREATE POLICY lesson_agreements_select_student
ON public.lesson_agreements FOR SELECT TO authenticated
USING (
  student_id = public.get_student_id((select auth.uid()))
);

-- Teachers can only view lesson agreements where they are the teacher
-- Uses helper function to bypass RLS on teachers table
CREATE POLICY lesson_agreements_select_teacher
ON public.lesson_agreements FOR SELECT TO authenticated
USING (
  teacher_id = public.get_teacher_id((select auth.uid()))
);

-- Staff, admins and site_admins can view all lesson agreements
CREATE POLICY lesson_agreements_select_staff
ON public.lesson_agreements FOR SELECT TO authenticated
USING (
  public.is_staff((select auth.uid()))
  OR public.is_admin((select auth.uid()))
  OR public.is_site_admin((select auth.uid()))
);

-- Staff, admins and site_admins can insert lesson agreements
CREATE POLICY lesson_agreements_insert_staff
ON public.lesson_agreements FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff((select auth.uid()))
  OR public.is_admin((select auth.uid()))
  OR public.is_site_admin((select auth.uid()))
);

-- Staff, admins and site_admins can update lesson agreements
-- Note: Students and teachers are automatically blocked because they don't match this policy
CREATE POLICY lesson_agreements_update_staff
ON public.lesson_agreements FOR UPDATE TO authenticated
USING (
  public.is_staff((select auth.uid()))
  OR public.is_admin((select auth.uid()))
  OR public.is_site_admin((select auth.uid()))
)
WITH CHECK (
  public.is_staff((select auth.uid()))
  OR public.is_admin((select auth.uid()))
  OR public.is_site_admin((select auth.uid()))
);

-- Staff, admins and site_admins can delete lesson agreements
-- Note: Students and teachers are automatically blocked because they don't match this policy
CREATE POLICY lesson_agreements_delete_staff
ON public.lesson_agreements FOR DELETE TO authenticated
USING (
  public.is_staff((select auth.uid()))
  OR public.is_admin((select auth.uid()))
  OR public.is_site_admin((select auth.uid()))
);

-- =============================================================================
-- SECTION 5: TRIGGERS
-- =============================================================================

-- Reuse existing update_updated_at_column function from baseline
CREATE TRIGGER update_lesson_agreements_updated_at
BEFORE UPDATE ON public.lesson_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 6: PERMISSIONS
-- =============================================================================

-- GRANT gives table-level permissions, but RLS policies (above) are what
-- actually control access. GRANT is required for RLS to work, but RLS is the
-- security boundary. Without matching RLS policies, GRANT alone does NOT grant access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_agreements TO authenticated;

-- =============================================================================
-- END OF LESSON AGREEMENTS MIGRATION
-- =============================================================================
