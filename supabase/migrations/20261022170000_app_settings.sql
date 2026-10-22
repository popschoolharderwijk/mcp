-- Generic application settings (key → jsonb value).

CREATE TABLE public.app_settings (
	key text PRIMARY KEY,
	value jsonb NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT now(),
	updated_by uuid REFERENCES auth.users (id)
);

CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_uid uuid;
BEGIN
	v_uid := auth.uid();
	NEW.updated_at = now();
	IF v_uid IS NOT NULL THEN
		NEW.updated_by = v_uid;
	END IF;
	RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_app_settings_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY app_settings_select_all
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY app_settings_insert_site_admin
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (is_site_admin());

CREATE POLICY app_settings_update_site_admin
ON public.app_settings
FOR UPDATE
TO authenticated
USING (is_site_admin())
WITH CHECK (is_site_admin());

CREATE POLICY app_settings_delete_site_admin
ON public.app_settings
FOR DELETE
TO authenticated
USING (is_site_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;
REVOKE ALL ON TABLE public.app_settings FROM anon;

ALTER FUNCTION public.set_app_settings_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_app_settings_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_app_settings_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_app_settings_updated_at() FROM authenticated;
