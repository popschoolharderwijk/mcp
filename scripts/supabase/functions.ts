/**
 * bun run db:push:functions [env]
 */

import type { DeployTarget } from './envHelpers.ts';
import {
	fail,
	printProdBanner,
	remoteFlag,
	requireAccessTokenForRemote,
	resolveTargetFromArgv,
	runSupabase,
} from './runHelpers.ts';

export async function pushFunctions(target: DeployTarget): Promise<void> {
	printProdBanner(target.env);

	if (target.projectRef === null) {
		console.log('Local edge runtime serves functions from the tree — nothing to deploy.');
		return;
	}

	requireAccessTokenForRemote(target);
	await runSupabase(['functions', 'deploy', remoteFlag(target.projectRef), '--yes']);
}

async function main(): Promise<void> {
	const verb = process.argv[2];
	if (verb !== 'push') {
		fail('Usage: bun run scripts/supabase/functions.ts push [local|dev|test|prod]');
	}
	const target = resolveTargetFromArgv(process.argv.slice(3), 'db:push:functions');
	console.log(`db:push:functions → ${target.env} (${target.projectRef ?? 'local Docker'})`);
	await pushFunctions(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
