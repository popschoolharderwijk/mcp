/**
 * bun run db:push:functions [env]
 */

import type { DeployTarget } from './envHelpers.ts';
import { remoteFlag, runPushScriptMain, runSupabase } from './runHelpers.ts';

export async function pushFunctions(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		console.log('Local edge runtime serves functions from the tree — nothing to deploy.');
		return;
	}

	await runSupabase(['functions', 'deploy', remoteFlag(target.projectRef), '--yes']);
}

if (import.meta.main) {
	await runPushScriptMain({
		scriptFile: 'functions.ts',
		verbLabel: 'db:push:functions',
		run: pushFunctions,
	});
}
