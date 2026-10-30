# Finalize — diff review (comments + test theater + no-legacy + single-caller)

Mandatory before declaring **DONE**. Also re-check after any Fallow-driven edit that adds comments, tests, or new helper modules.

Canonical rules:

* Comments / diff narration → [`.cursor/rules/comments.mdc`](../../../.cursor/rules/comments.mdc)
* Test theater → [`.cursor/rules/tests.mdc`](../../../.cursor/rules/tests.mdc) (“What to test”)
* No-legacy → [`.cursor/rules/no-legacy.mdc`](../../../.cursor/rules/no-legacy.mdc)
* Single-caller modules → [`.cursor/rules/no-single-caller-modules.mdc`](../../../.cursor/rules/no-single-caller-modules.mdc)

## 1. Diff-narration comments

Scan **every comment** (and config `#` lines) in files touched this finalize / this session.

Reject and fix comments that:

* Contrast with the past (“no longer”, “we used to”, “instead of”, “after the refactor”, “fixed…”)
* Exist mainly to say what **not** to put here (“no localhost on remotes”, “don’t use X”, “belongs in Y not Z”)
* Read like a commit message or a note to the agent who just edited the file
* **Pending-work excuses** — “until types / after db reset”, “temporary”, “for now”, “TODO/FIXME/HACK”, “workaround until …” (see `comments.mdc`). Delete the comment; fix the code properly or escalate for DB reset + type regen — never leave the sticky note.

Keep only **standing invariants**: what is true now, why a first-time reader must care.

Smell: if the PR description disappeared, would the comment still help? If no → delete or rewrite positively.

## 2. Test theater

Scan **every test file** added or changed to green the gates (especially after Fallow/CRAP).

Reject and fix tests that:

* Exist only to raise coverage / lower CRAP without locking real behavior
* Assert only CSS/Tailwind class strings
* Assert identity, passthrough, constant return, or `true→true` / `false→false` renames
* Wrap a one-liner in a helper just so a tiny test can exist

Fix by: delete the theater test; inline or remove the trivial helper; or replace with a behavior test that would still matter if the helper were inlined.

**Never** “fix” Fallow by adding theater tests. Prefer a real refactor or escalate.

## 3. No-legacy

Scan files touched this finalize / this session for unsolicited compatibility layers (see `no-legacy.mdc`).

Reject and fix:

* Dual names / parallel keys for the same concept
* “Also accept the old name/shape” fallbacks, deprecated aliases, soft-migration wrappers
* Keeping a removed API alive “just in case”

Fix by: one current contract; update **all** callers; no dual surfaces unless the user **explicitly** asked for compatibility. Comments must not narrate the removal either — see section 1 / `comments.mdc`.

## 4. No single-caller modules

Scan **every new or moved helper/module** in this finalize / this session (see `no-single-caller-modules.mdc`).

Reject and fix:

* A new file whose only real importer is one calling module (tests do not count as a second caller)
* A thin re-export stub left “for compatibility” after an extract
* A one-off pure helper dumped into its own `*Helpers.ts` solely to shrink the caller or paint coverage

Fix by: keep a **named function** (or local component) **in the calling file**; delete the unused file; update imports. Create a separate module only when **two or more** production importers need it (or it is a clear ownership boundary / `useX` hook / public entry — see the rule).

**Smell check:** *How many non-test files import this?* If exactly one → it does not get its own file.
