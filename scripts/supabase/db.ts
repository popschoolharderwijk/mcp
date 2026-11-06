/**
 * bun run db:reset [env]
 * bun run db:push:migrations [env]
 *
 * Remotes: --remote=<ref> --yes (CLI v3).
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

export async function resetDatabase(target: DeployTarget): Promise<void> {
	printProdBanner(target.env);
	requireAccessTokenForRemote(target);

	if (target.projectRef === null) {
		await runSupabase(['db', 'reset']);
		return;
	}

	await runSupabase(['db', 'reset', remoteFlag(target.projectRef), '--yes']);
}

export async function pushMigrations(target: DeployTarget): Promise<void> {
	printProdBanner(target.env);
	requireAccessTokenForRemote(target);

	if (target.projectRef === null) {
		await runSupabase(['migration', 'up']);
		return;
	}

	await runSupabase(['db', 'push', remoteFlag(target.projectRef), '--yes']);
}

const DB_VERBS = {
	reset: { label: 'db:reset', run: resetDatabase },
	push: { label: 'db:push:migrations', run: pushMigrations },
} as const;

function resolveDbVerb(verb: string | undefined): (typeof DB_VERBS)[keyof typeof DB_VERBS] | null {
	if (verb === 'reset') return DB_VERBS.reset;
	if (verb === 'push') return DB_VERBS.push;
	return null;
}

async function main(): Promise<void> {
	const entry = resolveDbVerb(process.argv[2]);
	if (entry === null) {
		fail('Usage: bun run scripts/supabase/db.ts <reset|push> [local|dev|test|prod]');
	}

	const target = resolveTargetFromArgv(process.argv.slice(3), entry.label);
	console.log(`${entry.label} → ${target.env} (${target.projectRef ?? 'local Docker'})`);
	await entry.run(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
