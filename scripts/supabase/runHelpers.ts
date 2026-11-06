/**
 * Shared IO for `bun run db:*` scripts.
 * Remotes always use `--remote=<projectRef>` (CLI v3).
 */

import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import {
	confirmTargetToken,
	type DeployTarget,
	deployEnvUsageHint,
	matchesConfirmTargetToken,
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

function confirmBannerLine(label: string, value: string): string {
	return `  ${label.padEnd(12)} ${value}`;
}

function printConfirmBanner(target: DeployTarget, action: string, destructive: boolean): void {
	console.warn('');
	console.warn('══════════════════════════════════════');
	console.warn(confirmBannerLine('ACTION:', action));
	if (target.projectRef === null) {
		console.warn(confirmBannerLine('DATABASE:', 'local Docker'));
	} else {
		console.warn(confirmBannerLine('DATABASE:', target.env));
		console.warn(confirmBannerLine('PROJECT REF:', target.projectRef));
	}
	if (destructive) {
		console.warn(confirmBannerLine('WARNING:', '⚠ DESTRUCTIVE — existing data will be wiped ⚠'));
	}
	console.warn('══════════════════════════════════════');
	console.warn('');
}

async function questionLine(prompt: string): Promise<string> {
	const rl = readline.createInterface({ input, output });
	try {
		return await rl.question(prompt);
	} catch (error) {
		if (isCtrlCAbort(error)) exitOnCtrlC();
		throw error;
	} finally {
		rl.close();
	}
}

async function confirmByTypingTarget(target: DeployTarget): Promise<void> {
	const expected = confirmTargetToken(target);
	if (!input.isTTY || !output.isTTY) {
		fail('Non-interactive terminal: refusing confirmTarget without typed confirmation.');
	}
	const typed = await questionLine(`Type "${expected}" to confirm: `);
	if (matchesConfirmTargetToken(typed, expected)) return;
	fail('Aborted: confirmation did not match.');
}

/** Abort unless the operator confirms when `target.confirm` is set. Non-TTY → abort. */
export async function confirmTargetIfRequired(
	target: DeployTarget,
	action: string,
	options: { destructive?: boolean } = {},
): Promise<void> {
	if (target.confirm === null) return;
	const destructive = options.destructive === true;
	printConfirmBanner(target, action, destructive);
	if (target.confirm === 'confirmYes') {
		if (await confirmYes('Proceed?', { defaultYes: true })) return;
		fail('Aborted.');
	}
	await confirmByTypingTarget(target);
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

function isCtrlCAbort(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

function exitOnCtrlC(): never {
	output.write('\n');
	process.exit(130);
}

async function questionYesNo(question: string, defaultYes: boolean): Promise<boolean> {
	const hint = defaultYes ? '[Y/n]' : '[y/N]';
	const rl = readline.createInterface({ input, output });
	try {
		return parseYesNoAnswer(await rl.question(`${question} ${hint} `), defaultYes);
	} catch (error) {
		if (isCtrlCAbort(error)) exitOnCtrlC();
		throw error;
	} finally {
		rl.close();
	}
}

/** Interactive confirm. Non-TTY → false (no prompt). Empty answer uses defaultYes. Ctrl+C → exit 130. */
export async function confirmYes(question: string, options: { defaultYes?: boolean } = {}): Promise<boolean> {
	if (!input.isTTY || !output.isTTY) return false;
	return questionYesNo(question, options.defaultYes === true);
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
