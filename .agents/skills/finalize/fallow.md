# Finalize — Fallow / CRAP

Read this before fixing any `bun run check:fallow` finding. Also respect
`.cursor/rules/fallow.mdc`.

## What the gate covers

`bun run check:fallow` fails on:

| Category | Fix approach |
|----------|--------------|
| Dead code | Remove or wire up unused files/exports/deps (trace with `fallow dead-code` if unsure) |
| Duplication | Extract a real shared helper/module for reported clones |
| Complexity (incl. CRAP) | Smallest change that genuinely resolves the finding — real refactor and/or quality tests below |

Never: `// fallow-ignore`, `_`-prefix hacks, or config edits to pass — see `.cursor/rules/fallow.mdc` (includes Biome). Fix code or escalate.

## Fix order within Fallow

1. **Dead code** — often shrinks dupe/complexity noise
2. **Duplication** — shared modules for clone groups
3. **Complexity / CRAP** — see below

## Complexity / CRAP quality bar

CRAP = complexity × low coverage. Lowering CRAP is allowed **only** via a genuine fix: real refactoring and/or **behavior-asserting tests** (see `.cursor/rules/tests.mdc` — no coverage theater).

When cyclomatic/cognitive complexity is high: split real responsibilities; extract helpers that encode non-trivial rules (validation, branched mapping, domain logic) — not wrappers around one expression.

**Smell check:** *If I inlined this helper back into the caller, would the test still be worth keeping?* If no → do not extract; refactor or test at the right layer.
