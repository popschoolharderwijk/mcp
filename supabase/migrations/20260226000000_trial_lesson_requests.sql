-- =============================================================================
-- TRIAL LESSON REQUESTS (PROEFLESSEN)
-- =============================================================================
-- This migration creates:
-- 1. trial_lesson_status enum
-- 2. pending_trial_requests table (unconfirmed requests before first login)
-- 3. trial_lesson_requests table (after user exists / claim)
-- 4. RLS policies
-- 5. claim_pending_trial_requests RPC
-- 6. pg_cron job to delete pending requests older than 24 hours
-- =============================================================================

-- =============================================================================
-- SECTION 1: TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.trial_lesson_status AS ENUM ('requested', 'proposed', 'confirmed', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- SECTION 2: TABLES
-- =============================================================================

-- Pending trial requests: created by Edge Function before user has logged in.
-- No anon RLS; insert only via Edge Function (service role). Claim via RPC.
CREATE TABLE IF NOT EXISTS public.pending_trial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_trial_requests_email ON public.pending_trial_requests(email);
CREATE INDEX IF NOT EXISTS idx_pending_trial_requests_created_at ON public.pending_trial_requests(created_at);

-- Trial lesson requests: after user exists (claimed from pending or created by admin).
CREATE TABLE IF NOT EXISTS public.trial_lesson_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES public.lesson_types(id) ON DELETE CASCADE,
  status public.trial_lesson_status NOT NULL DEFAULT 'requested',

  -- Proposed slot (filled by admin when status moves to proposed)
  proposed_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  proposed_day_of_week INTEGER CHECK (proposed_day_of_week IS NULL OR (proposed_day_of_week >= 0 AND proposed_day_of_week <= 6)),
  proposed_start_time TIME,
  proposed_start_date DATE,

  -- Confirmations
  teacher_confirmed_at TIMESTAMPTZ,
  student_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_lesson_requests_user_id ON public.trial_lesson_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_lesson_requests_status ON public.trial_lesson_requests(status);
CREATE INDEX IF NOT EXISTS idx_trial_lesson_requests_proposed_teacher ON public.trial_lesson_requests(proposed_teacher_id);

-- =============================================================================
-- SECTION 3: RLS - pending_trial_requests
-- =============================================================================

ALTER TABLE public.pending_trial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_trial_requests FORCE ROW LEVEL SECURITY;

-- No policy for anon (no direct access).
-- Authenticated: no direct SELECT/INSERT/UPDATE/DELETE; claim is via RPC (SECURITY DEFINER).
-- Service role (Edge Function) bypasses RLS for INSERT.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_trial_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_trial_requests TO service_role;

-- =============================================================================
-- SECTION 4: RLS - trial_lesson_requests
-- =============================================================================

ALTER TABLE public.trial_lesson_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_lesson_requests FORCE ROW LEVEL SECURITY;

-- SELECT: student own rows; teacher rows where proposed_teacher_id = self; privileged all
CREATE POLICY trial_lesson_requests_select
ON public.trial_lesson_requests FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR proposed_teacher_id = public.get_teacher_id((SELECT auth.uid()))
  OR public.is_privileged((SELECT auth.uid()))
);

-- INSERT: own user_id only (for claim) or privileged
CREATE POLICY trial_lesson_requests_insert
ON public.trial_lesson_requests FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid()) AND status = 'requested')
  OR public.is_privileged((SELECT auth.uid()))
);

-- UPDATE: student can set student_confirmed_at on own rows; teacher can set teacher_confirmed_at on rows where proposed_teacher_id = self; privileged all
CREATE POLICY trial_lesson_requests_update
ON public.trial_lesson_requests FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR proposed_teacher_id = public.get_teacher_id((SELECT auth.uid()))
  OR public.is_privileged((SELECT auth.uid()))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR proposed_teacher_id = public.get_teacher_id((SELECT auth.uid()))
  OR public.is_privileged((SELECT auth.uid()))
);

-- DELETE: privileged only
CREATE POLICY trial_lesson_requests_delete
ON public.trial_lesson_requests FOR DELETE TO authenticated
USING (public.is_privileged((SELECT auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_lesson_requests TO authenticated;

-- =============================================================================
-- SECTION 5: TRIGGER updated_at
-- =============================================================================

CREATE TRIGGER update_trial_lesson_requests_updated_at
BEFORE UPDATE ON public.trial_lesson_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 6: RPC claim_pending_trial_requests
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_pending_trial_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  r RECORD;
  inserted_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, email, lesson_type_id, first_name, last_name, created_at
    FROM public.pending_trial_requests
    WHERE email = v_email
  LOOP
    INSERT INTO public.trial_lesson_requests (user_id, lesson_type_id, status)
    VALUES (v_user_id, r.lesson_type_id, 'requested');
    DELETE FROM public.pending_trial_requests WHERE id = r.id;
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_trial_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_pending_trial_requests() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_trial_requests() TO authenticated;
ALTER FUNCTION public.claim_pending_trial_requests() OWNER TO postgres;

-- =============================================================================
-- SECTION 7: Cleanup expired pending (for pg_cron)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_trial_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  DELETE FROM public.pending_trial_requests
  WHERE created_at < now() - interval '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_pending_trial_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_pending_trial_requests() FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_trial_requests() TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_trial_requests() TO service_role;
ALTER FUNCTION public.cleanup_expired_pending_trial_requests() OWNER TO postgres;

-- pg_cron: run every hour; job runs as postgres and calls the cleanup function.
-- Note: pg_cron may not be available on all Supabase plans; enable in dashboard if needed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup_expired_pending_trial_requests',
      '0 * * * *',
      'SELECT public.cleanup_expired_pending_trial_requests()'
    );
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- pg_cron not available, skip schedule
END;
$$;

-- =============================================================================
-- END OF TRIAL LESSON REQUESTS MIGRATION
-- =============================================================================
