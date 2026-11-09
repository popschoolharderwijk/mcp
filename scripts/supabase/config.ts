/**
 * bun run db:push:config [env]
 */

import type { DeployTarget } from './envHelpers.ts';
import { remoteFlag, runPushScriptMain, runSupabase } from './runHelpers.ts';

export async function pushConfig(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		console.log('Local uses supabase/config.toml via `supabase start` — nothing to push.');
		return;
	}

	await runSupabase(['config', 'push', remoteFlag(target.projectRef)]);
}

if (import.meta.main) {
	await runPushScriptMain({
		scriptFile: 'config.ts',
		verbLabel: 'db:push:config',
		run: pushConfig,
	});
}
