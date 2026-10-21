REVOKE EXECUTE ON FUNCTION public.claim_schedule_build(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_schedule_build(uuid) FROM anon, authenticated;