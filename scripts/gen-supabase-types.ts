/**
 * Generate TypeScript types from the linked Supabase project (no DB reset).
 *
 * Run from project root: bun run scripts/gen-supabase-types.ts
 */

import { $ } from 'bun';

const projectRoot = import.meta.dir + '/..';
$.cwd(projectRoot);

console.log('Generating TypeScript types from linked project...');
await $`supabase gen types typescript --linked > src/integrations/supabase/types.ts`;

console.log('Running Biome check...');
await $`biome check --write ./src/integrations/supabase/types.ts`;

console.log('Done.');
