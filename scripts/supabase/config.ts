/**
 * bun run db:push:config [env]
 */

import { type DeployTarget, formatTargetLabel } from './envHelpers.ts';
import {
	confirmTargetIfRequired,
	fail,
	remoteFlag,
	requireAccessTokenForRemote,
	resolveTargetFromArgv,
	runSupabase,
} from './runHelpers.ts';

export async function pushConfig(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		console.log('Local uses supabase/config.toml via `supabase start` — nothing to push.');
		return;
	}

	requireAccessTokenForRemote(target);
	await runSupabase(['config', 'push', remoteFlag(target.projectRef), '--yes']);
}

async function main(): Promise<void> {
	const verb = process.argv[2];
	if (verb !== 'push') {
		fail('Usage: bun run scripts/supabase/config.ts push [local|dev|test|prod]');
	}
	const target = resolveTargetFromArgv(process.argv.slice(3), 'db:push:config');
	console.log(`db:push:config → ${formatTargetLabel(target)}`);
	await confirmTargetIfRequired(target, 'db:push:config');
	await pushConfig(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
