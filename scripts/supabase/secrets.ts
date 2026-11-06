/**
 * bun run db:push:secrets [env]
 *
 * Local: materialize functions/.env + supabase/.env from functions/.env.local.
 * Remote: replace custom secrets from env file (--remote=<ref> only).
 */

import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import {
	buildLocalSupabaseDotEnv,
	type DeployTarget,
	formatStaleSecretsSummary,
	missingRequiredSecretNames,
	parseEnvFileEntries,
	parseEnvFileKeys,
	parseSecretsListJson,
	staleSecretNames,
} from './envHelpers.ts';
import {
	confirmSecretDrops,
	confirmYes,
	fail,
	printProdBanner,
	projectRoot,
	remoteFlag,
	requireAccessTokenForRemote,
	resolveTargetFromArgv,
	runSupabase,
	runSupabaseCapture,
} from './runHelpers.ts';

async function readSecretsFile(target: DeployTarget): Promise<{
	path: string;
	contents: string;
	entries: Record<string, string>;
	keys: string[];
}> {
	const path = join(projectRoot, target.secretsFileRelative);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		fail(`Secrets file not found: ${target.secretsFileRelative}`);
	}
	const contents = await file.text();
	const entries = parseEnvFileEntries(contents);
	const missing = missingRequiredSecretNames(entries);
	if (missing.length > 0) {
		fail(
			`Missing or empty required secrets in ${target.secretsFileRelative}:\n${missing
				.map((name) => `  - ${name}`)
				.join('\n')}`,
		);
	}
	return { path, contents, entries, keys: parseEnvFileKeys(contents) };
}

async function isLocalStackRunning(): Promise<boolean> {
	const proc = Bun.spawn(['supabase', 'status', '-o', 'json'], {
		cwd: projectRoot,
		stdout: 'pipe',
		stderr: 'pipe',
		env: process.env,
	});
	const code = await proc.exited;
	return code === 0;
}

function localRestartSkipMessage(): string {
	if (!input.isTTY || !output.isTTY) {
		return 'Non-interactive terminal: restart skipped. Run `supabase stop` then `supabase start`.';
	}
	return 'Skipped restart. Run `supabase stop` then `supabase start` when ready.';
}

async function maybeRestartLocalStack(): Promise<void> {
	if (!(await isLocalStackRunning())) {
		console.log('Local stack is not running — start later with `supabase start`.');
		return;
	}

	console.warn('');
	console.warn('Local stack is running. Restart required for Auth SMTP / edge to load new secrets.');

	if (!(await confirmYes('Restart local Supabase stack now?', { defaultYes: true }))) {
		console.warn(localRestartSkipMessage());
		return;
	}

	await runSupabase(['stop']);
	await runSupabase(['start']);
}

async function pushSecretsLocal(target: DeployTarget): Promise<void> {
	const { contents, entries } = await readSecretsFile(target);

	const edgeEnvPath = join(projectRoot, 'supabase/functions/.env');
	await Bun.write(edgeEnvPath, contents);
	console.log('Wrote supabase/functions/.env (edge runtime) from .env.local');

	const supabaseDotEnvPath = join(projectRoot, 'supabase/.env');
	await Bun.write(supabaseDotEnvPath, buildLocalSupabaseDotEnv(entries));
	console.log('Wrote supabase/.env (Auth SMTP env()) from .env.local');

	await maybeRestartLocalStack();
}

async function listRemoteSecretNames(projectRef: string): Promise<string[]> {
	const stdout = await runSupabaseCapture(['secrets', 'list', remoteFlag(projectRef), '--output', 'json']);
	try {
		return parseSecretsListJson(stdout);
	} catch (error) {
		fail(`Could not parse secrets list JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

async function confirmStaleDropsOrAbort(stale: string[]): Promise<void> {
	if (stale.length === 0) return;
	if (await confirmSecretDrops(stale)) return;
	fail('Aborted: secrets were not changed.');
}

async function unsetStaleSecrets(projectRef: string, stale: string[]): Promise<void> {
	for (const name of stale) {
		await runSupabase(['secrets', 'unset', name, remoteFlag(projectRef), '--yes']);
	}
}

async function replaceRemoteSecrets(projectRef: string, path: string, keys: string[]): Promise<void> {
	const stale = staleSecretNames(await listRemoteSecretNames(projectRef), keys);
	await confirmStaleDropsOrAbort(stale);
	await runSupabase(['secrets', 'set', '--env-file', path, remoteFlag(projectRef), '--yes']);
	await unsetStaleSecrets(projectRef, stale);
	console.log(formatStaleSecretsSummary(stale));
}

async function pushSecretsRemote(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		fail('Internal error: pushSecretsRemote called for local');
	}
	const { path, keys } = await readSecretsFile(target);
	await replaceRemoteSecrets(target.projectRef, path, keys);
}

export async function pushSecrets(target: DeployTarget): Promise<void> {
	printProdBanner(target.env);
	requireAccessTokenForRemote(target);

	if (target.projectRef === null) {
		await pushSecretsLocal(target);
		return;
	}

	await pushSecretsRemote(target);
}

async function main(): Promise<void> {
	const verb = process.argv[2];
	if (verb !== 'push') {
		fail('Usage: bun run scripts/supabase/secrets.ts push [local|dev|test|prod]');
	}
	const target = resolveTargetFromArgv(process.argv.slice(3), 'db:push:secrets');
	console.log(`db:push:secrets → ${target.env} (${target.secretsFileRelative})`);
	await pushSecrets(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
