/**
 * bun run db:reset [env]
 * bun run db:push:migrations [env]
 *
 * Remotes: --remote=<ref> --yes (CLI v3).
 * Hosted DB password: SUPABASE_DB_PASSWORD from SECRETS_PATH runtimeEnvFile (.env.<target>.local).
 */

import { DEPLOY_ENV_CLI_USAGE, type DeployTarget, formatTargetLabel } from './envHelpers.ts';
import {
	confirmTargetIfRequired,
	ensureSupabaseUnlinked,
	fail,
	remoteDbAuth,
	resolveTargetFromArgv,
	runSupabase,
} from './runHelpers.ts';

export async function resetDatabase(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		await runSupabase(['db', 'reset']);
		return;
	}

	await ensureSupabaseUnlinked();
	const auth = remoteDbAuth(target, 'password-env');
	await runSupabase(['db', 'reset', ...auth.args, '--yes'], { env: auth.env });
}

export async function pushMigrations(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		await runSupabase(['migration', 'up']);
		return;
	}

	await ensureSupabaseUnlinked();
	const auth = remoteDbAuth(target, 'password-flag');
	await runSupabase(['db', 'push', ...auth.args, '--yes'], { env: auth.env });
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

	const target = resolveTargetFromArgv(process.argv.slice(3), entry.label);
	console.log(`${entry.label} → ${formatTargetLabel(target)}`);
	await confirmTargetIfRequired(target, entry.label, { destructive: entry.destructive });
	await entry.run(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
