# Deployment naar Productie

Na het mergen van een PR naar `main`, moeten wijzigingen handmatig naar production worden gepusht.

---

## Wanneer deployen?

| Wijziging | Actie nodig |
|-----------|-------------|
| Database migraties (`supabase/migrations/`) | `supabase db push` |
| Auth/config wijzigingen (`supabase/config.toml`) | `supabase config push` |
| Edge Functions | `supabase functions deploy` |
| Alleen frontend code | Geen actie (Lovable deployt automatisch) |

---

## Stap 1: Link aan Production

```bash
supabase link --project-ref bnagepkxryauifzyoxgo
```

---

## Stap 2: Push Migraties

```bash
# Bekijk welke migraties worden toegepast
supabase db push --dry-run

# Push migraties naar production
supabase db push
```

---

## Stap 3: Push Config (indien gewijzigd)

```bash
# Bekijk diff van config wijzigingen
supabase config push

# Review de changes en type 'Y' om te bevestigen
```

> ⚠️ **Let op**: `config push` overschrijft remote settings. Review altijd de diff!

---

## Stap 4: Deploy Edge Functions (indien aanwezig)

```bash
# Deploy specifieke function
supabase functions deploy <function-name>

# Deploy alle functions
supabase functions deploy
```

---

## Checklist

- [ ] PR gemerged naar `main`
- [ ] `supabase link --project-ref bnagepkxryauifzyoxgo`
- [ ] `supabase db push` (bij migratie wijzigingen)
- [ ] `supabase config push` (bij config wijzigingen)
- [ ] `supabase functions deploy` (bij edge function wijzigingen)
- [ ] Productie getest
