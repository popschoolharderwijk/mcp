-- =============================================================================
-- LESSON TYPES TABLE
-- =============================================================================
-- This migration creates:
-- 1. lesson_frequency enum for lesson scheduling frequency
-- 2. lesson_types table for managing different types of music lessons
-- 3. RLS policies for the table
-- 4. Triggers for data integrity
--
-- Lesson types define the characteristics of different music lessons
-- (e.g., Gitaar, Drums, Zang, Bas, Keyboard, Saxofoon, DJ/Beats, Bandcoaching).
-- =============================================================================

-- =============================================================================
-- SECTION 1: TYPES
-- =============================================================================

DROP TYPE IF EXISTS public.lesson_frequency CASCADE;

CREATE TYPE public.lesson_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

-- =============================================================================
-- SECTION 2: TABLES
-- =============================================================================

-- Lesson types table - defines different types of music lessons
-- Duration/frequency/price live in lesson_type_options (multiple options per lesson type).
CREATE TABLE IF NOT EXISTS public.lesson_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lesson type information
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL CHECK (length(icon) > 0),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),

  -- Configuration (no duration/frequency/price here; use lesson_type_options)
  cost_center TEXT,
  is_group_lesson BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_types_is_active ON public.lesson_types(is_active);
CREATE INDEX IF NOT EXISTS idx_lesson_types_is_group_lesson ON public.lesson_types(is_group_lesson);

-- =============================================================================
-- SECTION 2B: LESSON TYPE OPTIONS (duration/frequency/price per lesson type)
-- =============================================================================
-- Each lesson type can have multiple options (e.g. 30 min/week/25€, 60 min/month/40€).
-- Agreements reference lesson_types and store a snapshot of the chosen option at creation time.
CREATE TABLE IF NOT EXISTS public.lesson_type_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  frequency public.lesson_frequency NOT NULL,
  price_per_lesson NUMERIC(10,2) NOT NULL CHECK (price_per_lesson > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_type_options_lesson_type_id ON public.lesson_type_options(lesson_type_id);

-- One option per (lesson_type, duration, frequency, price) — same duration+frequency with different price allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_type_options_unique_duration_frequency_price
ON public.lesson_type_options(lesson_type_id, duration_minutes, frequency, price_per_lesson);

-- =============================================================================
-- SECTION 3: ENABLE RLS
-- =============================================================================

ALTER TABLE public.lesson_types ENABLE ROW LEVEL SECURITY;
-- FORCE RLS: Even table owner / service_role is subject to RLS policies.
-- This is a security best practice but means admin scripts must use service_role
-- or bypass RLS explicitly. Many teams omit FORCE for operational flexibility.
ALTER TABLE public.lesson_types FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 4: RLS POLICIES
-- =============================================================================

-- All authenticated users can view lesson types (public reference data)
CREATE POLICY lesson_types_select_all
ON public.lesson_types FOR SELECT TO authenticated
USING (true);

-- Admins and site_admins can insert lesson types
CREATE POLICY lesson_types_insert_admin
ON public.lesson_types FOR INSERT TO authenticated
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- Admins and site_admins can update lesson types
CREATE POLICY lesson_types_update_admin
ON public.lesson_types FOR UPDATE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- Admins and site_admins can delete lesson types
CREATE POLICY lesson_types_delete_admin
ON public.lesson_types FOR DELETE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- =============================================================================
-- SECTION 3B: RLS FOR lesson_type_options
-- =============================================================================

ALTER TABLE public.lesson_type_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_type_options FORCE ROW LEVEL SECURITY;

-- All authenticated users can view lesson type options
CREATE POLICY lesson_type_options_select_all
ON public.lesson_type_options FOR SELECT TO authenticated
USING (true);

-- Admins and site_admins can insert/update/delete lesson type options
CREATE POLICY lesson_type_options_insert_admin
ON public.lesson_type_options FOR INSERT TO authenticated
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

CREATE POLICY lesson_type_options_update_admin
ON public.lesson_type_options FOR UPDATE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

CREATE POLICY lesson_type_options_delete_admin
ON public.lesson_type_options FOR DELETE TO authenticated
USING (public.is_admin((select auth.uid())) OR public.is_site_admin((select auth.uid())));

-- =============================================================================
-- SECTION 5: TRIGGERS
-- =============================================================================

-- Reuse existing update_updated_at_column function from baseline
CREATE TRIGGER update_lesson_types_updated_at
BEFORE UPDATE ON public.lesson_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- RESTRICT DELETE: lesson_types can only be deleted if no agreements exist
-- =============================================================================

-- Function to check if lesson_type has agreements before deletion
CREATE OR REPLACE FUNCTION public.check_lesson_type_has_no_agreements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Check if any lesson_agreements exist for this lesson_type
  IF EXISTS (
    SELECT 1
    FROM public.lesson_agreements
    WHERE lesson_type_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete lesson type: there are existing lesson agreements using this lesson type'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

ALTER FUNCTION public.check_lesson_type_has_no_agreements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_lesson_type_has_no_agreements() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_lesson_type_has_no_agreements() FROM anon;
GRANT EXECUTE ON FUNCTION public.check_lesson_type_has_no_agreements() TO authenticated;

-- Trigger to enforce the constraint on DELETE
CREATE TRIGGER check_lesson_type_has_no_agreements_trigger
BEFORE DELETE ON public.lesson_types
FOR EACH ROW
EXECUTE FUNCTION public.check_lesson_type_has_no_agreements();

-- Trigger to maintain updated_at on lesson_type_options
CREATE TRIGGER update_lesson_type_options_updated_at
BEFORE UPDATE ON public.lesson_type_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 6: PERMISSIONS
-- =============================================================================

-- GRANT gives table-level permissions, but RLS policies (above) are what
-- actually control access. GRANT is required for RLS to work, but RLS is the
-- security boundary. Without matching RLS policies, GRANT alone does NOT grant access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_type_options TO authenticated;

-- =============================================================================
-- END OF LESSON TYPES MIGRATION
-- =============================================================================
