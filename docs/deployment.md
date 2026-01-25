# Deployment naar Productie

## Automatische Flow

1. **PR merge naar main** triggert Supabase GitHub Integration
2. Migraties worden automatisch toegepast op production database
3. Edge Functions worden automatisch gedeployed door Lovable

---

## Handmatige Deployment

```bash
# Link aan production project
supabase link --project-ref bnagepkxryauifzyoxgo

# Push migraties
supabase db push

# Deploy edge functions
supabase functions deploy <function-name>
```
