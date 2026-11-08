/**
 * Shared IO for `bun run db:*` scripts.
 * Remotes always use `--remote=<projectRef>` (CLI v3).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import {
	confirmTargetToken,
	type DeployTarget,
	deployEnvUsageHint,
	matchesConfirmTargetToken,
	mergeRuntimeEnv,
	parseDeployEnv,
	parseEnvFileEntries,
	parseYesNoAnswer,
	pickDbPassword,
	ROOT_ENV_POINTER_KEY,
	resolveDeployTarget,
	resolveSecretsRoot,
	secretsFilePath,
} from './envHelpers.ts';

export const projectRoot = `${import.meta.dir}/../..`;

/** Absolute SECRETS_PATH, or null when CI has only process env. */
function lookupSecretsRoot(): string | null {
	const pointerPath = join(projectRoot, '.env');
	const contents = existsSync(pointerPath) ? readFileSync(pointerPath, 'utf8') : null;
	return resolveSecretsRoot(projectRoot, process.env, contents);
}

/** Absolute SECRETS_PATH. Hard-fails when unset — copy `.env.example`. */
export function readSecretsRoot(): string {
	const root = lookupSecretsRoot();
	if (root === null) {
		fail(
			`Missing ${ROOT_ENV_POINTER_KEY}: copy .env.example to .env (or set ${ROOT_ENV_POINTER_KEY} in the environment).`,
		);
	}
	return root;
}

const DEPLOY_ENV_USAGE = 'local|development|test|production';

export function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

export function resolveTargetFromArgv(argv: string[], verbLabel: string): DeployTarget {
	const envArg = argv[0];
	const env = parseDeployEnv(envArg);
	if (env === null) {
		fail(
			`Unknown environment "${envArg}". ${deployEnvUsageHint()}\nUsage: bun run ${verbLabel} [${DEPLOY_ENV_USAGE}]`,
		);
	}
	return resolveDeployTarget(env);
}

/**
 * Process env + optional runtime env file under SECRETS_PATH (file wins when present).
 * CI sets `SUPABASE_DB_PASSWORD` in the job env without a file; locally prefer `.env.<target>.local`.
 */
function loadRuntimeEnvMap(target: DeployTarget): Record<string, string | undefined> {
	const root = lookupSecretsRoot();
	if (root === null) return { ...process.env };
	const path = secretsFilePath(root, target.runtimeEnvFile);
	if (!existsSync(path)) return { ...process.env };
	return mergeRuntimeEnv(process.env, parseEnvFileEntries(readFileSync(path, 'utf8')));
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

export function remoteFlag(projectRef: string): string {
	return `--remote=${projectRef}`;
}

export type RemoteDbAuth = {
	args: string[];
	/** Merged into spawn env. `password-env` sets SUPABASE_DB_PASSWORD for CLI pooler path. */
	env: Record<string, string>;
};

/**
 * Hosted DB auth for `--remote=<ref>`.
 * `password-flag` → `--password=` (e.g. `db push`); `password-env` → `SUPABASE_DB_PASSWORD` (e.g. `db reset`, `gen types`).
 * Call `ensureSupabaseUnlinked` first when using `password-env`.
 */
export function remoteDbAuth(target: DeployTarget, mode: 'password-flag' | 'password-env'): RemoteDbAuth {
	if (target.projectRef === null) {
		fail('remoteDbAuth called for local');
	}
	const projectRef = target.projectRef;
	const password = pickDbPassword(loadRuntimeEnvMap(target));
	if (!password) {
		fail(
			`Missing SUPABASE_DB_PASSWORD for ${target.env} (${projectRef}). Set it in $${ROOT_ENV_POINTER_KEY}/${target.runtimeEnvFile} or the environment.`,
		);
	}

	const env = { SUPABASE_DB_PASSWORD: password };
	if (mode === 'password-env') {
		return { args: [remoteFlag(projectRef)], env };
	}
	return { args: [remoteFlag(projectRef), `--password=${password}`], env };
}

/** `supabase unlink` when `supabase/.temp/project-ref` exists — required for cross-project `SUPABASE_DB_PASSWORD`. */
export async function ensureSupabaseUnlinked(): Promise<void> {
	const refPath = join(projectRoot, 'supabase/.temp/project-ref');
	if (!existsSync(refPath)) return;
	await runSupabase(['unlink']);
}

function formatSupabaseArgsForLog(args: string[]): string {
	return args
		.map((arg) => {
			if (arg.startsWith('--password=')) return '--password=***';
			if (arg.startsWith('--remote=postgresql://') || arg.startsWith('--remote=postgres://')) {
				return '--remote=postgresql://***';
			}
			return arg;
		})
		.join(' ');
}

function spawnEnv(extra?: Record<string, string>): Record<string, string | undefined> {
	if (!extra) return process.env;
	return { ...process.env, ...extra };
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

export async function runSupabase(args: string[], options: { env?: Record<string, string> } = {}): Promise<void> {
	const logged = formatSupabaseArgsForLog(args);
	console.log(`→ supabase ${logged}`);
	const proc = Bun.spawn(['supabase', ...args], {
		cwd: projectRoot,
		stdout: 'inherit',
		stderr: 'inherit',
		env: spawnEnv(options.env),
	});
	const code = await proc.exited;
	if (code !== 0) {
		fail(`supabase ${logged} exited with code ${code}`);
	}
}

/** Run supabase and return stdout (stderr inherited). */
export async function runSupabaseCapture(
	args: string[],
	options: { env?: Record<string, string> } = {},
): Promise<string> {
	const logged = formatSupabaseArgsForLog(args);
	console.log(`→ supabase ${logged}`);
	const proc = Bun.spawn(['supabase', ...args], {
		cwd: projectRoot,
		stdout: 'pipe',
		stderr: 'inherit',
		env: spawnEnv(options.env),
	});
	const code = await proc.exited;
	const stdout = await new Response(proc.stdout).text();
	if (code !== 0) {
		fail(`supabase ${logged} exited with code ${code}`);
	}
	return stdout;
}
