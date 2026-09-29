# Merge Workflow: Lovable → Main

## Step 1: Local preparation (CLI)

```bash
# Switch to lovable branch
git switch lovable

# Fetch latest remote changes
git fetch origin

# Rebase lovable onto the latest origin/main (linear, no merge commit)
git rebase origin/main

# --- Possible situation: rebase conflicts ---
# If you get a conflict in src/integrations/supabase/types.ts:
# 1. Resolve by regenerating types:
#    supabase gen types typescript --linked > src/integrations/supabase/types.ts
# 2. Let Biome format types
#    biome check --write src/integrations/supabase/types.ts
# 3. Stage the file and continue the rebase
#    git add src/integrations/supabase/types.ts
#    git rebase --continue
# Repeat if multiple commits conflict

# Regenerate types after other changes (never skip)
bun run db:reset

# Run Biome fix for the rest of the code (format + lint autofix)
bun run fix

# Commit and push any fixes
git add .
git commit -m "fix: regenerate and format Supabase types, lint fixes"
git push --force-with-lease origin lovable
```

---

## Step 2: Open a Pull Request on GitHub

- Go to the repository on GitHub
- Click "Compare & pull request" or create a new PR
- Base: `main` ← Compare: `lovable`
- Add a description of the changes

---

## Step 3: Wait for CI Checks

| Check | Description |
|-------|-------------|
| **Biome Linting** | Code formatting and linting |
| **Unit Tests** | Tests in `tests/code/` |
| **Supabase Tests** | RLS + Auth tests against **mcp-test** in CI (on changes in supabase/** or tests/**) |

---

## Step 4: Review and Fix

- Check CI results in the PR
- Fix any failures locally and push again

---

## Step 5: Merge the PR

- Choose "Squash and merge" or "Merge commit"
- **Do NOT delete the lovable branch!**

---

## Step 6: Post-merge Sync

```bash
# Reset lovable branch to main (loses Lovable history awareness!)
git checkout -B lovable origin/main
git push -u origin lovable --force
```

> ⚠️ **Note**: This force push fully resets the lovable branch to main. Lovable then loses awareness of earlier commits on the lovable branch.
