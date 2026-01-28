# CI/CD Workflows

## Active Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **PR CI** | `pull-request-ci.yml` | PRs to main | Biome linting |
| **PR Tests** | `pull-request-test.yml` | All PRs | Unit tests (`tests/code/`) |
| **PR Database** | `pull-request-database.yml` | `supabase/migrations/**`, `tests/rls/**`, `tests/auth/**` | RLS + Auth tests on preview branch |
| **PR Supabase** | `pull-request-supabase.yml` | All PRs + manual | Full test suite on local Supabase |
| **Formatting** | `formatting.yml` | Manual/callable | Auto-format with Biome |
| **Linting** | `linting.yml` | Manual/callable | Lint + write errors to `.github/biome-errors.txt` |

### PR Supabase Workflow Details

Runs all tests against a local Supabase instance in GitHub Actions:

- **Docker caching**: Uses `ScribeMD/docker-cache` to cache Supabase Docker images (~2-3GB)
- **First run**: Downloads all images (~3-5 min)
- **Subsequent runs**: Restores from cache (~30-60 sec)
- **Environment**: Uses standard local Supabase credentials (safe to commit, see [secrets.md](./secrets.md))
- **Required secret**: `RESEND_API_KEY` for email tests

---

## Supabase Preview (External Workflow)

The Supabase GitHub App runs automatically on PRs with migration changes:

1. Detects changes in `supabase/migrations/`
2. Creates a preview branch on the **production** Supabase project
3. Applies migrations to the preview branch
4. Reports status as GitHub check "Supabase Preview"

**Setting**: "Supabase changes only" - preview only on database changes

---

## Disabled Workflows

Located in `.github/workflows-disabled/`:

| Workflow | Reason disabled |
|----------|-----------------|
| `reset-lovable-branch.yml` | Manual trigger, not needed in normal flow |
| `prevent-protected-folder-changes.yml` | Replaced by branch protection rules |
