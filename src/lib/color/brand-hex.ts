// Canonical brand orange hex — must match --primary in src/styles/theme-tokens.css.
// Changes here must also be mirrored in:
// - supabase/functions/generate-invoice/invoicePure.ts (mail HTML header)
// - supabase/functions/generate-invoice/buildPdfPure.ts (PDF orange rgb)
// Tests enforce drift; update mirrors when editing this file.

export const PRIMARY_HEX = '#f97316';
