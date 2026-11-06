# Edge Function & Auth secrets (CLI only)

Do **not** manage Edge Function / Auth SMTP secrets via the Dashboard.
Prefer gitignored env files under `supabase/functions/` plus `bun run db:push:secrets` (or the raw CLI with an explicit `--remote=<ref>`).

Dashboard and CLI share the same secret store. Prefer one source of truth: the hand-edited env file for that environment.

## Day-to-day: `bun run db:*`

| Command                                            | What it does                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `bun run db:push:secrets [local\|dev\|test\|prod]` | Validate env file; local materializes derived files; remotes **replace** custom secrets |
| `bun run db:push:config [env]`                     | Push `config.toml` to that remote (local: no-op)                                        |
| `bun run db:push:functions [env]`                  | Deploy all edge functions (local: no-op)                                                |
| `bun run db:push:migrations [env]`                 | Apply migrations                                                                        |
| `bun run db:push:all [env]`                        | Fail-fast: migrations → **secrets → config** → functions (no reset)                     |
| `bun run db:reset [env]`                           | Full DB reset (prod allowed; loud banner; no confirm)                                   |

Missing env arg → **`local`**. Invalid env → usage + exit `1`.

Remotes always pass `--remote=<projectRef>` from a fixed map (CLI v3). Hosted mutating steps use `--yes`. Export `SUPABASE_ACCESS_TOKEN` for remote commands.

Prod targets print a loud banner; there is no interactive prod confirm.

See also [commands.md](./commands.md).

## Environments

CLI args are short (`local` / `dev` / `test` / `prod`). Secret file names use the same suffixes as Vite root env files, but paths are **only** under `supabase/functions/` — never the root Vite `.env*`.

| CLI env | Target                             | Hand-edited secrets file (only SoT)   | Project ref            |
| ------- | ---------------------------------- | ------------------------------------- | ---------------------- |
| `local` | Local Docker (`supabase start`)    | `supabase/functions/.env.local`       | —                      |
| `dev`   | mcp-dev (Lovable / `bun dev`)      | `supabase/functions/.env.development` | `zdvscmogkfyddnnxzkdu` |
| `test`  | mcp-test (CI / `bun run dev:test`) | `supabase/functions/.env.test`        | `jserlqacarlgtdzrblic` |
| `prod`  | Production                         | `supabase/functions/.env.production`  | `bnagepkxryauifzyoxgo` |

Never put `SUPABASE_*` or `VITE_*` in these files (reserved / frontend-only). `SITE_URL` is optional.

Committed template (names only): `supabase/functions/.env.example`.

## Local: one hand-edited SoT

Supabase splits loaders:

- Edge auto-loads **`supabase/functions/.env`** only.
- `config.toml` `env()` reads **`supabase/.env`** (and process env), not `functions/.env*`.

Hand-edit **only** `supabase/functions/.env.local`. Then:

```bash
bun run db:push:secrets          # or: bun run db:push:secrets local
```

That materializes derived gitignored files (do not hand-edit):

1. Copy `.env.local` → `supabase/functions/.env` (edge runtime).
2. Write `supabase/.env` with at least `RESEND_API_KEY` from `.env.local` (Auth SMTP `env()`).

If the local stack is already running, `db:push:secrets` detects that and interactively offers `supabase stop` → `supabase start`. Non-interactive runs skip the restart and print the manual commands.

Root Vite `.env.local` is **not** the Edge/Auth secret source of truth.

## Remote secrets = full replace

`supabase secrets set` **upserts** listed keys only; orphans stay until `unset`.
`bun run db:push:secrets` for `dev` / `test` / `prod` therefore:

1. Validates the env file (required keys present and non-empty).
2. Lists remote secret names (`--remote=<ref>`).
3. Computes stale custom names (in remote, not in file). Never treats `SUPABASE_*` as stale.
4. If there are stale names: prints them and asks confirm (`y`/`N`, default **No**). Decline or non-TTY → exit `1`, **no** changes.
5. `secrets set --env-file … --remote=<ref> --yes`.
6. Named `secrets unset <NAME> --remote=<ref> --yes` for each stale key.
7. **Never** runs bare `supabase secrets unset` (no names) — that deletes every custom secret.

No stale keys → no prompt; set-only is fine.

| Command                      | Effect                                 |
| ---------------------------- | -------------------------------------- |
| `secrets set` / `--env-file` | Create or update listed keys only      |
| `secrets unset KEY`          | Delete that key                        |
| `secrets unset` (no names)   | **Deletes all custom secrets** — avoid |

Secrets apply to Edge Functions immediately (no redeploy required).
`config.toml` `env(NAME)` (e.g. Auth SMTP `pass`) resolves from the **same project secret store** on remotes once the secret exists.

`bun run db:push:config` overwrites remote **config** (CLI may show a diff). Auth SMTP still needs `RESEND_API_KEY` as a project secret — hence **secrets before config** in `db:push:all`.

## Two Resend paths (do not conflate)

| Name                           | Used by                                                          | Purpose                                      |
| ------------------------------ | ---------------------------------------------------------------- | -------------------------------------------- |
| `RESEND_API_KEY`               | `config.toml` → `[auth.email.smtp] pass = "env(RESEND_API_KEY)"` | Auth magic-link SMTP                         |
| `RESEND_API_KEY_TRANSACTIONAL` | Edge (`send-template-email`, …)                                  | App / transactional mail via Resend HTTP API |
| `RESEND_FROM_EMAIL`            | Edge                                                             | From-address for transactional mail          |

Same Resend key value may be copied into both `RESEND_API_KEY` and `RESEND_API_KEY_TRANSACTIONAL`, but both names must exist where needed.

## Required keys per secrets file

Validation list (edit without touching TypeScript): [`scripts/supabase/required-secrets.json`](../scripts/supabase/required-secrets.json).

```env
# Auth SMTP (config.toml env())
RESEND_API_KEY=re_...

# Edge transactional mail
RESEND_API_KEY_TRANSACTIONAL=re_...
RESEND_FROM_EMAIL=noreply@popschoolharderwijk.nl

# Stripe (edge)
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_... on prod
STRIPE_WEBHOOK_SECRET=whsec_...
```

Use test Stripe + webhook secrets on local / mcp-dev / mcp-test; live on prod. Keep `.env.example` aligned when you change the JSON.

## Gitignore

Root `.env` and `*.local` already cover `supabase/functions/.env`, `supabase/.env`, and `.env.local`. Extra rules only for the Vite-suffix secret files under `functions/` (root Vite `.env.development` / `.test` / `.production` stay tracked):

```gitignore
supabase/functions/.env.*
!supabase/functions/.env.example
```

## One-time setup

### 1. Local

1. Copy `supabase/functions/.env.example` → `supabase/functions/.env.local` and fill values (test Stripe).
2. `bun run db:push:secrets` (writes `functions/.env` + `supabase/.env`).
3. `supabase start` (or restart if already running).
4. Confirm with `bun run dev:local` and a function that reads Stripe/Resend.

### 2. Each remote (dev / test / prod)

1. Fill `supabase/functions/.env.development` (or `.test` / `.production`) for that project.
2. Export `SUPABASE_ACCESS_TOKEN`.
3. Push secrets (replace + optional drop confirm):

```bash
bun run db:push:secrets dev
bun run db:push:secrets test
bun run db:push:secrets prod
```

4. Verify names (values are hidden):

```bash
supabase secrets list --remote=zdvscmogkfyddnnxzkdu
```

5. When Auth/config or functions changed:

```bash
bun run db:push:config dev
bun run db:push:functions dev
# or everything except reset:
bun run db:push:all dev
```

## Changing a secret

1. Edit the env file for that environment under `supabase/functions/`.
2. `bun run db:push:secrets <env>` for **that** env only.
3. No function redeploy needed for secret-only changes.
4. If Auth SMTP / `config.toml` SMTP changed, also `bun run db:push:config <env>`.
5. Retiring a key: remove it from the env file and run `db:push:secrets` — confirm the drop prompt. Do not use bare `unset`.

## Related docs

- [commands.md](./commands.md) — `db:*` command table
- [secrets.md](./secrets.md) — GitHub Actions secrets + overview
- [deployment.md](./deployment.md) — manual prod deploy steps
- [email-templates.md](./email-templates.md) — Resend / SMTP
- [architecture.md](./architecture.md) — environment table
