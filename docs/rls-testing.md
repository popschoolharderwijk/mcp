# RLS Testing

## Hoe het werkt

```
PR met migrations
       ↓
Supabase Preview start (creëert preview branch database)
       ↓
pull-request-rls.yml wacht op "Supabase Preview" check
       ↓
Haalt credentials op: supabase branches get -o env
       ↓
Maakt key alias: SUPABASE_ANON_KEY → SUPABASE_PUBLISHABLE_DEFAULT_KEY
       ↓
Linkt CLI naar preview branch (niet hoofdproject!)
       ↓
Seedt preview database: supabase db push --include-seed
       ↓
Tests draaien tegen preview branch met seed data
       ↓
Verifieert RLS policies
```

---

## Seed Data voor RLS Tests

De preview branch wordt automatisch geseeded met testgebruikers uit `supabase/seed.sql`. De seed bevat ook teacher-student relaties voor het testen van RLS policies die afhankelijk zijn van deze koppelingen.

> **Let op**: De Supabase CLI `branches get` command gebruikt nog de legacy naam `SUPABASE_ANON_KEY`. De workflow maakt automatisch een alias naar `SUPABASE_PUBLISHABLE_DEFAULT_KEY` voor forward compatibility.

---

## Wat wordt getest

Alle tests staan in `tests/rls/`:

- ✅ RLS is enabled op alle verwachte tabellen
- ✅ Alle verwachte policies bestaan
- ✅ Geen onverwachte policies aanwezig
- ✅ Security helper functions bestaan (`is_admin`, `is_teacher`, etc.)
- ✅ Seed data ground truth (correct aantal users per role)
- ✅ RLS policies werken correct per user role

---

## Lokaal RLS tests draaien

Voor lokale RLS tests heb je een `.env.local` nodig. Zie [supabase-setup.md](supabase-setup.md) Stap 6 voor het aanmaken van dit bestand.

```bash
# Run lokaal
bun test rls --env-file .env.local
```
