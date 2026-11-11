/**
 * bun run supabase:restart
 *
 * Local stack recycle: `supabase stop` then `supabase start --runtime native --eager`
 * (same flags as `.devcontainer/compose.yml`). Reloads `supabase/functions/.env`.
 * Port forwards from the container entrypoint stay up.
 */

import { fail, isLocalStackRunning, localStackStartHint, restartLocalSupabaseStack } from './runHelpers.ts';

async function main(): Promise<void> {
	if (process.argv[2] !== undefined) {
		fail('Usage: bun run supabase:restart');
	}

	if (await isLocalStackRunning()) {
		console.log(`Recycling local Supabase stack (stop → \`${localStackStartHint()}\`)…`);
	} else {
		console.log(`Local stack is not running — starting with \`${localStackStartHint()}\`…`);
	}
	await restartLocalSupabaseStack();
	console.log('Done.');
}

await main();
