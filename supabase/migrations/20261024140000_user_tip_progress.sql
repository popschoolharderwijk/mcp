-- Per-user tip progress (seen / completed). Tip copy lives in app code.

CREATE TABLE public.user_tip_progress (
	user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
	tip_id text NOT NULL,
	status text NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT now(),
	-- Last time the user performed the tip action (slash / click / shortcut); null until first action.
	last_action_at timestamptz,
	CONSTRAINT user_tip_progress_pkey PRIMARY KEY (user_id, tip_id),
	CONSTRAINT user_tip_progress_status_check CHECK (status IN ('dismissed', 'completed'))
);

ALTER TABLE public.user_tip_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tip_progress FORCE ROW LEVEL SECURITY;

CREATE POLICY user_tip_progress_select_own
ON public.user_tip_progress
FOR SELECT
TO authenticated
USING (user_id = public.current_user_id());

CREATE POLICY user_tip_progress_insert_own
ON public.user_tip_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_tip_progress_update_own
ON public.user_tip_progress
FOR UPDATE
TO authenticated
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_tip_progress_delete_own
ON public.user_tip_progress
FOR DELETE
TO authenticated
USING (user_id = public.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tip_progress TO authenticated;
GRANT ALL ON TABLE public.user_tip_progress TO service_role;
REVOKE ALL ON TABLE public.user_tip_progress FROM anon;
