# Architectuur

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Testing**: Bun test runner
- **Linting**: Biome
- **CI/CD**: GitHub Actions + Supabase GitHub Integration

---

## Supabase Omgevingen

Dit project gebruikt twee aparte Supabase omgevingen:

| Omgeving | Project ID | Branching | Gebruik |
|----------|------------|-----------|---------|
| **Lovable Preview** | `zdvscmogkfyddnnxzkdu` (mcp-dev) | ❌ Geen | Directe connectie vanuit Lovable |
| **Production** | `bnagepkxryauifzyoxgo` | ✅ Supabase Pro | PRs en productie deployment |

### Hoe dit werkt

1. **Lovable** is verbonden met `mcp-dev` - een losse development database zonder branching
2. **PRs naar main** triggeren Supabase Preview op de **production** server (met Pro branching)
3. Bij **merge naar main** worden migraties automatisch toegepast op production
