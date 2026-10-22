/**
 * Generate TypeScript types from Supabase (no DB reset).
 *
 * Linked (default): bun run supabase:types
 * Local Docker:     bun run supabase:types:local   (requires `supabase start`)
 *
 * Why not plain `--local`?
 * CLI 2.1xx rewrites "local-looking" URLs to `supabase_db_<id>:5432` on the Docker
 * network (supabase/cli#5283). With multiple stacks (or this project's custom
 * host port 54422) that path often fails with:
 *   password authentication failed for user "postgres"
 * Using `localhost:<db.port>` keeps host networking and stays fast (~2s).
 *
 * Official docs still document `--local`; this script uses the reliable local path.
 * @see https://supabase.com/docs/guides/api/rest/generating-types
 */

import { $ } from 'bun';

const projectRoot = import.meta.dir + '/..';
$.cwd(projectRoot);

const useLocal = process.argv.includes('--local');

/** Host-mapped DB port from `supabase/config.toml` `[db] port`. */
async function localDbPort(): Promise<number> {
	const configPath = `${projectRoot}/supabase/config.toml`;
	const config = await Bun.file(configPath).text();
	const match = /^\[db\]\s*\n(?:[^\n]*\n)*?port\s*=\s*(\d+)/m.exec(config);
	if (!match) {
		throw new Error(`Could not read [db].port from ${configPath}`);
	}
	return Number(match[1]);
}

if (useLocal) {
	const port = await localDbPort();
	// `localhost` (not 127.0.0.1): avoids IsLocalDatabase rewrite to docker alias.
	const dbUrl = `postgresql://postgres:postgres@localhost:${port}/postgres`;
	console.log(`Generating TypeScript types from local stack (localhost:${port})...`);
	await $`supabase gen types typescript --db-url ${dbUrl} --schema public > src/integrations/supabase/types.ts`;
} else {
	console.log('Generating TypeScript types from linked project...');
	await $`supabase gen types typescript --linked > src/integrations/supabase/types.ts`;
}

console.log('Running Biome check...');
await $`biome check --write ./src/integrations/supabase/types.ts`;

console.log('Done.');
