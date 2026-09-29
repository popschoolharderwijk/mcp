# Troubleshooting

## Database tests fail in CI (RLS/Auth)

1. Check that all required GitHub secrets are present: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
2. Check that `supabase db reset --linked --yes` succeeded in the workflow (`seeds/bootstrap.sql` + `seeds/test.sql` are then applied)
3. Verify that the `RESEND_API_KEY` secret is set in GitHub (for email tests)
4. For Auth tests: check that the password policy in `config.toml` is correct

---

## Migrations not applied

1. Check that you ran `supabase db push` locally
2. Check that the migration files are in `supabase/migrations/`
3. Verify that the Supabase project is linked correctly (`supabase link`)

---

## Tests fail locally (RLS/Auth)

1. Put credentials for the project you test against in your environment (or `.env.test`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `VITE_DEV_LOGIN_PASSWORD` (seed users: password `password`). Use **mcp-test** credentials to match CI, or **mcp-dev** if you develop against that.
2. Optional: for mcp-dev you can run `bun run db:reset` for a clean database with `seeds/bootstrap.sql` + `seeds/test.sql`.

---

## Edge Functions errors

1. Check logs: https://supabase.com/dashboard/project/<project-id>/functions
2. Verify secrets in Edge Function settings
3. Test locally with `supabase functions serve`

### verify_jwt = true returns 401 on POST

**Problem**: With `verify_jwt = true` in `config.toml`, POST requests get 401 Unauthorized even with a valid JWT.

**Cause**: The JWT uses ES256 (asymmetric signing), but the Supabase Edge Runtime does not appear to verify this correctly.

**Fix**: Use `verify_jwt = false` and verify the JWT yourself in the Edge Function via `supabase.auth.getUser()`. That works correctly and also checks session status.

```typescript
// In the Edge Function:
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

> 📝 See also the FIXME in `supabase/config.toml` for more context.

---

## Email sending fails

1. Check that `RESEND_API_KEY` is set correctly
2. Verify SMTP config in `supabase/config.toml`
3. Check the Resend dashboard for delivery status
