---
name: finalize
description: >
  Continuous quality fix loop in caveman mode. Regenerates Supabase types once, then
  runs check → CI → Fallow until all three pass. Fallow failures retry fallow only,
  then one verification pass from check. Complexity/CRAP: real fixes and
  behavior-asserting tests only — never coverage theater. Use only when the user
  explicitly asks to finalize, run the quality gates, clean up before a commit/PR,
  or get the repo green.
---

# Finalize

Get the repo green. Done only when `bun run check`, `bun run check:ci`, and
`bun run check:fallow` all exit 0 in one consecutive outer pass.

## Load once

1. **Caveman** — read and follow [`.agents/skills/caveman/SKILL.md`](../caveman/SKILL.md) for the whole run (default **full**). That skill is the only source of truth for communication style.
2. **Fallow / CRAP** — read [`fallow.md`](fallow.md) before fixing any Fallow finding.
3. **Language** — read [`language.md`](language.md); enforce before declaring success.
4. **Quality loop details** — read [`quality-loop.md`](quality-loop.md) for fix priority, escalation, and scope.

## When to use

- User explicitly asks to finalize, polish, run the quality gates, clean up before
  a commit/PR, or "get it green"

Do not start this workflow merely because the user asks to commit or create a PR.

## Commands

| Step | Command | Role |
|------|---------|------|
| types | `bun run supabase:types` | Once at start (linked types regen — **not** `db:reset`) |
| check | `bun run check` | Biome verify (no write) |
| ci | `bun run check:ci` | Biome CI + `tsc` + code tests |
| fallow | `bun run check:fallow` | Dead code, duplication, complexity/CRAP |

Use these `package.json` scripts. `bun run fix` is the Biome write command; it is not a gate — only run it when `check` fails on auto-fixable issues. Never run `bun run db:reset`. Do not run `tests/auth`, `tests/rls`, or `tests/e2e` (need Supabase; out of scope).

## State machine

1. Run **types**. If it fails, fix and retry types. After it passes, never run it
   again during this finalize run.
2. Run **check**, then **ci**, then **fallow**.
3. If check fails, run `bun run fix` for auto-fixable Biome issues (or edit by hand), then restart at check.
4. If ci fails, fix and restart at check.
5. If fallow fails, fix and retry fallow only until it passes.
6. After a repaired fallow pass first becomes green, run exactly one verification
   pass: **check → ci → fallow**.
7. If all three verification commands pass consecutively, stop: **DONE**. Handle
   any verification failure using steps 3–6.

**Restart points (single table):**

| Failure | Next |
|---------|------|
| types | Fix; re-run types until green; then enter loop |
| check | `bun run fix` or edit; restart at **check** |
| ci | Fix; restart at **check** |
| fallow | Fix; **retry fallow only** until green; then one verification pass from **check** |

Do not advance while the current step is failing. **Exception:** fallow uses its own inner retry (table above) so check/ci are not re-run after every fallow tweak.

## Preserve existing work

Before the first mutating command, inspect Git status and the current diff. Treat
all existing changes as user-owned: never discard or overwrite them. After
repo-wide autofixes, inspect the diff again and keep changes limited to what the
quality gates require. If an autofix conflicts with existing work and the intended
result is unclear, stop and ask the user.

## Fix size

Prefer the **smallest change that genuinely resolves the finding**. A real refactor that removes complexity is valid; a tiny identity-helper + useless test is not — see [`fallow.md`](fallow.md).

## Agent rules (short)

1. Follow the state machine; do not skip check → ci → fallow in an outer pass.
2. Fix priority inside a failing step: Biome → TypeScript → tests → Fallow (details in [`quality-loop.md`](quality-loop.md)). Never edit tests while `tsc` still fails.
3. No Fallow suppressions / threshold hacks; no CRAP theater — [`fallow.md`](fallow.md).
4. Escalate on no-progress / caps / out-of-scope — [`quality-loop.md`](quality-loop.md).
5. Never `git add` or `git commit`. The user always stages and commits.
