# Finalize — quality loop

Details for fix priority, scope, and escalation. The state machine and restart table live in [`SKILL.md`](SKILL.md).

## Fix priority inside a failing step

`bun run check:ci` runs Biome CI → `tsc` → `bun test code`. Fix in this order; do not chase downstream symptoms:

1. **Biome / check**
2. **TypeScript** (`tsc`) — often causes test failures below
3. **Code tests** (`tests/code/` only) — **do not edit tests while `tsc` still fails**; re-run after types are green
4. **Fallow** — only once check + ci are green; then dead code → duplication → complexity ([`fallow.md`](fallow.md))

## Fix size

Prefer the **smallest change that genuinely resolves the finding**.

- Cosmetic or one-line root causes → keep the diff tiny
- High complexity / CRAP that needs structure → a real refactor is appropriate (still the smallest *effective* change, not theater)

## Scope

- In: `bun run check`, `bun run check:ci` (incl. `tests/code/`),
  `bun run check:fallow`, types via `bun run supabase:types`
- Out: `tests/auth`, `tests/rls`, `tests/e2e`
- Never: `bun run db:reset` (user-only). If types/schema are out of sync, escalate and ask the user to run it

## Escalation

Stop and ask the user when any of these hold:

1. **No progress (primary)** — track Biome errors + `tsc` errors + failing code tests + Fallow findings each iteration. If that count does not drop for **two consecutive** iterations, stop. Count fallow-only retries separately from full outer passes.
2. **Hard caps** — 5 full outer passes without all-green, or 10 consecutive fallow-only retries without green (backstop; no-progress should usually fire first).
3. **Out of scope** — design decision, destructive change, work outside the task, or tool config (Fallow/Biome) — ask first; see `.cursor/rules/fallow.mdc`.
4. **Ambiguous** — root cause still unclear after reading the full output.
5. **Types vs schema** — `supabase:types` / `tsc` fail because migrations are not on the linked DB → ask user for `bun run db:reset`.

On escalation: failing step, exact error, what was tried, structured options. Do not stage, commit, or retry blindly.
