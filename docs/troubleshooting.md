# Troubleshooting

## RLS tests falen in CI

1. Check of Supabase Preview check geslaagd is
2. Controleer of `supabase branches get` correcte output geeft
3. Kijk naar workflow logs voor credential parsing errors
4. Controleer of seeding is gelukt (`supabase db push --include-seed`)
5. Verifieer dat `SUPABASE_PUBLISHABLE_DEFAULT_KEY` correct is gealiased van `SUPABASE_ANON_KEY`

---

## Migraties niet toegepast

1. Controleer of PR changes heeft in `supabase/migrations/`
2. Check Supabase GitHub App logs in repository settings
3. Verifieer dat Supabase project correct gelinked is

---

## Edge Functions errors

1. Check logs: https://supabase.com/dashboard/project/zdvscmogkfyddnnxzkdu/functions
2. Verifieer secrets in Edge Function settings
3. Test lokaal met `supabase functions serve`
