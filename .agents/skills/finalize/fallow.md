# Finalize — Fallow / CRAP

Read this before fixing any `bun run check:fallow` or `bun run check:fallow:audit`
finding. Also respect `.cursor/rules/fallow.mdc` and
`.cursor/rules/no-single-caller-modules.mdc`.

## What the gates cover

`bun run check:fallow` fails on:

| Category | Fix approach |
|----------|--------------|
| Dead code | Remove or wire up unused files/exports/deps (trace with `fallow dead-code` if unsure) |
| Duplication | Share real logic — see **Duplication extracts** below |
| Complexity (incl. CRAP) | Smallest change that genuinely resolves the finding — real refactor and/or quality tests below |

`bun run check:fallow:audit` (`fallow audit`) gates **changed files** (dead code +
complexity + duplication for the changeset). Same fix rules; default gate is
new-only vs the merge base. Fix introduced findings; do not widen Fallow/Biome
config to silence them.

Never: `// fallow-ignore`, `_`-prefix hacks, or config edits to pass — see
`.cursor/rules/fallow.mdc` (includes Biome). Fix code or escalate.

## Fix order within Fallow

1. **Dead code** — often shrinks dupe/complexity noise
2. **Duplication** — shared modules for clone groups (**only** when ≥2 callers)
3. **Complexity / CRAP** — see below
4. **Audit** — after full `check:fallow` is green, run `check:fallow:audit` and fix any fail verdict

## Duplication extracts (single-caller ban)

When collapsing a clone group:

* **Two or more** production call sites → extract a shared module / helper and update all callers.
* **Would be only one caller** after “extract” → do **not** create a new file. Keep a **named function in the calling file** (see `no-single-caller-modules.mdc` / [`review.md`](review.md) §4).
* Do **not** leave a re-export stub after moving code.

Same rule when splitting for CRAP: a helper used by one module stays local in that module.

## Complexity / CRAP quality bar

CRAP = complexity × low coverage. Lowering CRAP is allowed **only** via a genuine fix: real refactoring and/or **behavior-asserting tests** (see `.cursor/rules/tests.mdc` — no coverage theater).

When cyclomatic/cognitive complexity is high: split real responsibilities; extract helpers that encode non-trivial rules (validation, branched mapping, domain logic) — not wrappers around one expression. Prefer **local named functions in the same file** unless a second caller needs the helper.

**Smell check:** *If I inlined this helper back into the caller, would the test still be worth keeping?* If no → do not extract; refactor or test at the right layer.

## Test theater (extra scrutiny)

Do **not** silence Fallow with weak tests. Forbidden examples (also in [`review.md`](review.md)):

* Asserting only Tailwind/CSS class strings
* Identity / passthrough / constant-return / boolean-rename tests
* New tiny helper + trivial test instead of a real split

Prefer: delete theater, inline trivial helpers, or assert real domain branches. If the only way to green Fallow is theater → escalate.
