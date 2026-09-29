# Brand and colour tokens

## Canonical source

All semantic colours live in [`src/styles/theme-tokens.css`](../src/styles/theme-tokens.css) (`:root` and `.dark`). The file is loaded before [`src/index.css`](../src/index.css) via [`src/main.tsx`](../src/main.tsx).

Do not change HSL values in the Tailwind config or inline in components for theme colours — edit `theme-tokens.css`.

Hover/selection (`--accent`, including sidebar `hover:bg-accent`) is a `color-mix` of `--primary` with `--background` (not HSL channels). Tailwind uses `var(--accent)`, not `hsl(var(--accent))`. Change primary and hover follows.

## Brand colour outside the browser

Some channels cannot use `hsl(var(--primary))` (mail HTML, PDF). For those:

| File | Role |
|------|------|
| [`src/lib/color/brand-hex.ts`](../src/lib/color/brand-hex.ts) | `PRIMARY_HEX` (web + HexColorPicker fallback) |
| [`public/favicon.svg`](../public/favicon.svg), [`public/favicon-local.svg`](../public/favicon-local.svg) | Tab icon (hex in SVG) |
| [`supabase/functions/generate-invoice/invoicePure.ts`](../supabase/functions/generate-invoice/invoicePure.ts) | Mirror for mail header |
| [`supabase/functions/generate-invoice/buildPdfPure.ts`](../supabase/functions/generate-invoice/buildPdfPure.ts) | Mirror for PDF header (`PDF_RGB`) |

When changing `--primary` / brand colour: update **all three** mirrors plus mirror comments. Drift tests: `tests/code/theme/theme-tokens.test.ts`, `tests/code/billing/invoicePure.test.ts`, `tests/code/billing/buildPdfPure.test.ts`.

## Agenda

- **Custom colour** (lesson type / manual): hex + `color-utils` (`darkenColor`, `getContrastTextColor`).
- **Default** (no custom hex): CSS tokens `--agenda-*`, borders via `--agenda-*-border` (`color-mix` in CSS). TypeScript uses only `hsl(var(...))` and `var(--agenda-*-border)`.
- Classification: [`resolveAgendaDefaultKind`](../src/lib/agenda/agenda-default-style-vars.ts) — same order as `getEventStyle`.

## Modal overlay

Dialogs use `bg-black/80 dark:bg-black/60` (no `--overlay` token unless chosen deliberately after a visual check).

## Rebrand checklist

1. `theme-tokens.css` — primary, status, agenda mapping, group literal dark.
2. `brand-hex.ts` + edge mirrors (invoicePure, buildPdfPure).
3. `tailwind.config.ts` — only map what is needed as a Tailwind class (e.g. `text-agenda-*-foreground`).
4. Visual: agenda defaults (lesson/manual are a different tint from the old hex by design), modals light/dark.
5. `bun test tests/code/theme/theme-tokens.test.ts tests/code/billing/invoicePure.test.ts tests/code/billing/buildPdfPure.test.ts tests/code/agenda/utils.test.ts`

## Not in this ship

- Tailwind palette (`red-500`, `emerald-*`, …) — separate migration.
- Lesson-type colours in the database.
- Centralising fonts.
