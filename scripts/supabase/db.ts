/**
 * bun run db:reset [env]
 * bun run db:push:migrations [env]
 *
 * Remotes: --remote=<ref> (CLI v3). Interactive CLI confirm via inherited TTY.
 * Hosted DB password: SUPABASE_DB_PASSWORD from SECRETS_PATH runtimeEnvFile (.env.<target>.local).
 */

import { DEPLOY_ENV_CLI_USAGE, type DeployTarget } from './envHelpers.ts';
import { ensureSupabaseUnlinked, fail, remoteDbAuth, runSupabase, runTargetScriptMain } from './runHelpers.ts';

export async function resetDatabase(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		await runSupabase(['db', 'reset']);
		return;
	}

	await ensureSupabaseUnlinked();
	const auth = remoteDbAuth(target, 'password-env');
	await runSupabase(['db', 'reset', ...auth.args], { env: auth.env });
}

export async function pushMigrations(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		await runSupabase(['migration', 'up']);
		return;
	}

	await ensureSupabaseUnlinked();
	const auth = remoteDbAuth(target, 'password-flag');
	await runSupabase(['db', 'push', ...auth.args], { env: auth.env });
}

const DB_VERBS = {
	reset: { label: 'db:reset', run: resetDatabase, destructive: true },
	push: { label: 'db:push:migrations', run: pushMigrations, destructive: false },
} as const;

function resolveDbVerb(verb: string | undefined): (typeof DB_VERBS)[keyof typeof DB_VERBS] | null {
	if (verb === 'reset') return DB_VERBS.reset;
	if (verb === 'push') return DB_VERBS.push;
	return null;
}

async function main(): Promise<void> {
	const entry = resolveDbVerb(process.argv[2]);
	if (entry === null) {
		fail(`Usage: bun run scripts/supabase/db.ts <reset|push> [${DEPLOY_ENV_CLI_USAGE}]`);
	}

	await runTargetScriptMain({
		verbLabel: entry.label,
		envArgv: process.argv.slice(3),
		destructive: entry.destructive,
		run: entry.run,
	});
}

if (import.meta.main) {
	await main();
}
