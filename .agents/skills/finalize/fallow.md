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

Never: `// fallow-ignore`, `_`-prefix hacks, or relaxing thresholds in `.fallowrc.json` just to pass.

## Fix order within Fallow

1. **Dead code** — often shrinks dupe/complexity noise
2. **Duplication** — shared modules for clone groups
3. **Complexity / CRAP** — see below

## Complexity / CRAP quality bar

CRAP = complexity × low coverage. Lowering CRAP is allowed **only** via a genuine fix: real refactoring and/or **tests that assert behavior**. Coverage alone is not a goal.

### NEVER (coverage theater)

* ❌ Identity / passthrough helpers (`return params`, `return loading`, `return isEditing`, `return hasAccess`)
* ❌ Single-property getters / constant returners (`return row.published_at`, `return 'avatar-upload'`) solely for a matching assert
* ❌ Boolean renames like `shouldShowX(flag)` / `resolveXOpen(open)` that only return the input, then test `true→true` / `false→false`
* ❌ Tests that only prove the function exists, returns the input unchanged, or returns a hardcoded constant with no branch under test
* ❌ One shallow happy-path test on a complex helper just to paint coverage while real branches stay unasserted
* ❌ Prefer “tiny helper + trivial test” over splitting the complex function when **complexity** (not coverage) is the problem

### ALWAYS

* ✅ When cyclomatic/cognitive complexity is high: split real responsibilities; extract helpers that encode non-trivial rules (validation, branched mapping, domain logic) — not wrappers around one expression
* ✅ Tests assert behavior: inputs → expected outputs/side-effects for real branches (edges, errors, invariants). A reader must learn something the type signature does not already say
* ✅ If CRAP is high because tests do not reach the code, test existing logic (or after a meaningful extract) — assert outcomes, not `f(x) === x`
* ✅ Prefer fewer strong tests over many trivial `*Helpers.test.ts` files that restate the implementation

### Smell check

*If I inlined this helper back into the caller, would the test still be worth keeping as a behavior test?* If no → do not extract; refactor or test at the right layer.
