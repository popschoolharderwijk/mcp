/**
 * Shared IO for `bun run db:*` scripts.
 * Remotes always use `--remote=<projectRef>` (CLI v3).
 */

import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import {
	type DeployEnv,
	type DeployTarget,
	deployEnvUsageHint,
	parseDeployEnv,
	parseYesNoAnswer,
	resolveDeployTarget,
} from './envHelpers.ts';

export const projectRoot = `${import.meta.dir}/../..`;

export function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

export function resolveTargetFromArgv(argv: string[], verbLabel: string): DeployTarget {
	const envArg = argv[0];
	const env = parseDeployEnv(envArg);
	if (env === null) {
		fail(
			`Unknown environment "${envArg}". ${deployEnvUsageHint()}\nUsage: bun run ${verbLabel} [local|dev|test|prod]`,
		);
	}
	return resolveDeployTarget(env);
}

export function printProdBanner(env: DeployEnv): void {
	if (env !== 'prod') return;
	console.warn('');
	console.warn('╔══════════════════════════════════════════════════════════╗');
	console.warn('║  TARGET: PRODUCTION (bnagepkxryauifzyoxgo)               ║');
	console.warn('╚══════════════════════════════════════════════════════════╝');
	console.warn('');
}

export function requireAccessTokenForRemote(target: DeployTarget): void {
	if (target.projectRef === null) return;
	if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
		fail(
			'SUPABASE_ACCESS_TOKEN is not set. Export an access token (Account → Access Tokens) before remote db:* commands.',
		);
	}
}

export function remoteFlag(projectRef: string): string {
	return `--remote=${projectRef}`;
}

/** Interactive confirm. Non-TTY → false (no prompt). Empty answer uses defaultYes. */
export async function confirmYes(question: string, options: { defaultYes?: boolean } = {}): Promise<boolean> {
	const defaultYes = options.defaultYes === true;
	if (!input.isTTY || !output.isTTY) {
		return false;
	}

	const hint = defaultYes ? '[Y/n]' : '[y/N]';
	const rl = readline.createInterface({ input, output });
	try {
		return parseYesNoAnswer(await rl.question(`${question} ${hint} `), defaultYes);
	} finally {
		rl.close();
	}
}

/** Confirm dropping remote secrets. Default No. Non-TTY without answer → false. */
export async function confirmSecretDrops(staleNames: string[]): Promise<boolean> {
	console.warn('');
	console.warn('The following remote secrets are NOT in the env file and will be DROPPED:');
	for (const name of staleNames) {
		console.warn(`  - ${name}`);
	}
	console.warn('');

	if (!input.isTTY || !output.isTTY) {
		console.error('Non-interactive terminal: refusing to drop secrets without confirmation.');
		return false;
	}

	return confirmYes('Drop these secrets?');
}

export async function runSupabase(args: string[]): Promise<void> {
	console.log(`→ supabase ${args.join(' ')}`);
	const proc = Bun.spawn(['supabase', ...args], {
		cwd: projectRoot,
		stdout: 'inherit',
		stderr: 'inherit',
		env: process.env,
	});
	const code = await proc.exited;
	if (code !== 0) {
		fail(`supabase ${args.join(' ')} exited with code ${code}`);
	}
}

/** Run supabase and return stdout (stderr inherited). */
export async function runSupabaseCapture(args: string[]): Promise<string> {
	console.log(`→ supabase ${args.join(' ')}`);
	const proc = Bun.spawn(['supabase', ...args], {
		cwd: projectRoot,
		stdout: 'pipe',
		stderr: 'inherit',
		env: process.env,
	});
	const code = await proc.exited;
	const stdout = await new Response(proc.stdout).text();
	if (code !== 0) {
		fail(`supabase ${args.join(' ')} exited with code ${code}`);
	}
	return stdout;
}
