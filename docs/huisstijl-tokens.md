# Huisstijl en kleurtokens

## Canonieke bron

Alle semantische kleuren staan in [`src/styles/theme-tokens.css`](../src/styles/theme-tokens.css) (`:root` en `.dark`). Het bestand wordt geladen vóór [`src/index.css`](../src/index.css) via [`src/main.tsx`](../src/main.tsx).

Wijzig geen HSL-waarden in Tailwind-config of inline in componenten voor themakleuren — pas `theme-tokens.css` aan.

## Merkoranje buiten de browser

Sommige kanalen kunnen geen `hsl(var(--primary))` gebruiken (mail-HTML, PDF). Daarvoor geldt:

| Bestand | Rol |
|---------|-----|
| [`src/lib/color/brand-hex.ts`](../src/lib/color/brand-hex.ts) | `PRIMARY_HEX` (web + HexColorPicker-fallback) |
| [`supabase/functions/generate-invoice/invoicePure.ts`](../supabase/functions/generate-invoice/invoicePure.ts) | Spiegel voor mailheader |
| [`supabase/functions/generate-invoice/buildPdfPure.ts`](../supabase/functions/generate-invoice/buildPdfPure.ts) | Spiegel voor PDF-oranje (`PDF_ORANGE_RGB`) |

Bij wijziging van `--primary` / merkoranje: **alle drie** spiegels + mirror-comments bijwerken. Drift-tests: `tests/code/theme/theme-tokens.test.ts`, `tests/code/billing/invoicePure.test.ts`, `tests/code/billing/buildPdfPure.test.ts`.

## Agenda

- **Custom kleur** (lesstype / handmatig): hex + `color-utils` (`darkenColor`, `getContrastTextColor`).
- **Default** (geen custom hex): CSS-tokens `--agenda-*`, borders via `--agenda-*-border` (`color-mix` in CSS). TypeScript gebruikt alleen `hsl(var(...))` en `var(--agenda-*-border)`.
- Classificatie: [`resolveAgendaDefaultKind`](../src/lib/agenda/agenda-default-style-vars.ts) — zelfde volgorde als `getEventStyle`.

## Modal overlay

Dialogs gebruiken `bg-black/80 dark:bg-black/60` (geen `--overlay`-token tenzij bewust gekozen na visuele check).

## Rebrand-checklist

1. `theme-tokens.css` — primary, status, agenda-mapping, group literal dark.
2. `brand-hex.ts` + edge-spiegels (invoicePure, buildPdfPure).
3. `tailwind.config.ts` — alleen mappen wat als Tailwind-class nodig is (bijv. `text-agenda-*-foreground`).
4. Visueel: agenda defaults (lesson/manual zijn bewust andere tint dan oude hex), modals light/dark.
5. `bun test tests/code/theme/theme-tokens.test.ts tests/code/billing/invoicePure.test.ts tests/code/billing/buildPdfPure.test.ts tests/code/agenda/utils.test.ts`

## Nog niet in deze ship

- Tailwind-palette (`red-500`, `emerald-*`, …) — aparte migratie.
- Les-type kleuren in de database.
- Fonts centraliseren.
