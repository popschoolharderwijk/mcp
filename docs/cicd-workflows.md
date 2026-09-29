# CI/CD Workflows

## Active Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **PR CI** | `pull-request-ci.yml` | PRs to main | Biome CI, TypeScript, code tests, Fallow, Squawk |
| **PR Tests** | `pull-request-test-code.yml` | All PRs | Unit tests (`tests/code/`) |
| **PR Supabase** | `pull-request-supabase.yml` | `supabase/**`, `tests/**` except `tests/code/**` + manual | DB lint + RLS/auth/e2e |
| **Formatting** | `formatting.yml` | Manual/callable | Auto-fix with Biome (`bun run fix`) |
| **Linting** | `linting.yml` | Manual/callable | Lint + write errors to `.github/biome-errors.txt` |

---

## Linting

Three linters run in this project:

| Linter | What it checks | Where | Command |
|--------|----------------|------|---------|
| **Biome** | TypeScript/JS code style & errors | `pull-request-ci.yml` | `bun run check:ci` (Biome CI) |
| **Squawk** | SQL migration safety (drops, locks, backward compat) | `pull-request-ci.yml` | `bun run lint:sql` |
| **supabase db lint** | PL/pgSQL code quality, SQL injection | `pull-request-supabase.yml` | `bun run lint:db` |

### Squawk (SQL migrations)

[Squawk](https://squawkhq.com/) statically lints `.sql` files in `supabase/migrations/`. It catches e.g.:
- Dangerous operations: `DROP TABLE`, `DROP DATABASE`, `TRUNCATE CASCADE`
- Lock issues: indexes without `CONCURRENTLY`
- Backward compatibility issues

```bash
# Run locally
bun run lint:sql
```

- **Config**: `.squawk.toml` (PG version, excluded rules)
- **Ignore a rule**: `-- squawk-ignore rule-name` above the SQL statement

### supabase db lint (PL/pgSQL)

Powered by [plpgsql_check](https://github.com/okbob/plpgsql_check). Checks against a **live database**:
- Type errors in functions
- Unused variables, dead code
- SQL injection in `EXECUTE` statements

```bash
# Against the linked database; warnings and errors fail (same as CI)
bun run lint:db

# Emit errors only (does not fail: --fail-on default is none)
supabase db lint --linked --level error

# Specific schema
supabase db lint --linked --schema public
```

`--level` controls what is **shown**. `--fail-on` controls the exit code. Default `--fail-on none` keeps the job green even on errors. CI uses `--fail-on warning`.

### PR Supabase Workflow Details

Runs RLS, auth, and e2e tests against **mcp-test** in GitHub Actions:

- **Path filter**: Runs on changes in `supabase/**` or `tests/**`, excluding `tests/code/**` (`predicate-quantifier: some-with-excludes` — without that, `!` exclusions are ignored). Unit tests stay in the PR Tests / PR CI workflows.
- **Manual trigger**: Can also be started via `workflow_dispatch`
- **Project**: Link to **mcp-test** via secret `SUPABASE_PROJECT_REF` (see [secrets.md](./secrets.md)); then `supabase db reset --linked --yes` for a clean database with `seeds/bootstrap.sql` + `seeds/test.sql`
- **Credentials**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from GitHub secrets (must belong to the same mcp-test project)
- **Required secret**: `RESEND_API_KEY` for email tests (SMTP)
- **Command**: `bun test tests/rls tests/auth tests/e2e --bail --timeout 30000` (path prefixes — bare `auth` would also match `tests/code/auth/`)

---

## Disabled Workflows

Found in `.github/workflows-disabled/`:

| Workflow | Why disabled |
|----------|----------------|
| `pull-request-database.yml` | Replaced by the workflow that runs against linked Supabase (no preview branches anymore) |
| `reset-lovable-branch.yml` | Manual trigger; not needed in the normal flow |
| `prevent-protected-folder-changes.yml` | Replaced by branch protection rules |
