/**
 * Pure helpers for `bun run db:*` deploy scripts.
 * Paths are inferred from the target name (not listed in config.json).
 * Secret files live under SECRETS_PATH (local `.env` pointer; see `.env.example`).
 * Edge/Auth SoT: supabase/.env.<target>
 * App/CLI runtime: .env.local | .env.<target>.local
 */

import { isAbsolute, join } from 'node:path';
import deployConfig from './config.json';

export type DeployEnv = keyof typeof deployConfig.targets;

/** `confirmYes` = simple Y/n; `confirmTarget` = must type project ref (or `local`). Omit = no prompt. */
export type ConfirmMode = 'confirmYes' | 'confirmTarget';

export type DeployTarget = {
	env: DeployEnv;
	/** null = local Docker stack */
	projectRef: string | null;
	/** Edge/Auth secrets relative to SECRETS_PATH (inferred) */
	envFile: string;
	/** Runtime secrets relative to SECRETS_PATH, e.g. SUPABASE_DB_PASSWORD (inferred) */
	runtimeEnvFile: string;
	confirm: ConfirmMode | null;
};

/** Pointer key in local `.env` (from `.env.example`). */
export const ROOT_ENV_POINTER_KEY = 'SECRETS_PATH';

/** `supabase/.env.local` | `supabase/.env.development` | … under SECRETS_PATH */
export function edgeSecretsEnvFile(env: DeployEnv): string {
	return `supabase/.env.${env}`;
}

/** `.env.local` | `.env.development.local` | … under SECRETS_PATH */
export function runtimeEnvFile(env: DeployEnv): string {
	if (env === 'local') return '.env.local';
	return `.env.${env}.local`;
}

/**
 * Vite mode → one secrets overlay under SECRETS_PATH.
 * `localdev` uses committed `.env.localdev` only (no secrets overlay).
 * Unknown modes get no overlay.
 */
export function runtimeEnvFileForViteMode(mode: string): string | null {
	if (mode === 'development' || mode === 'test' || mode === 'production') return runtimeEnvFile(mode);
	return null;
}

/**
 * Bun `NODE_ENV` → one runtime file under SECRETS_PATH.
 * Unset is local Docker (`.env.local`). `development`, `test`, and `production` select that target.
 */
export function runtimeEnvFileForNodeEnv(nodeEnv: string | undefined): string {
	if (nodeEnv === 'test') return runtimeEnvFile('test');
	if (nodeEnv === 'production') return runtimeEnvFile('production');
	if (nodeEnv === 'development') return runtimeEnvFile('development');
	return runtimeEnvFile('local');
}

/**
 * Resolve absolute secrets root: process.env.SECRETS_PATH wins, else local `.env` contents.
 * Relative paths are resolved against projectRoot. Missing pointer → null (CI uses process env only).
 */
export function resolveSecretsRoot(
	projectRoot: string,
	processEnv: Record<string, string | undefined>,
	rootEnvFileContents: string | null,
): string | null {
	const fromProcess = processEnv[ROOT_ENV_POINTER_KEY]?.trim();
	if (fromProcess) {
		return isAbsolute(fromProcess) ? fromProcess : join(projectRoot, fromProcess);
	}
	if (rootEnvFileContents === null) return null;
	const fromFile = parseEnvFileEntries(rootEnvFileContents)[ROOT_ENV_POINTER_KEY]?.trim();
	if (!fromFile) return null;
	return isAbsolute(fromFile) ? fromFile : join(projectRoot, fromFile);
}

/** Absolute path to a secrets-relative file. */
export function secretsFilePath(secretsRoot: string, relativePath: string): string {
	return join(secretsRoot, relativePath);
}

/** Required non-empty keys in each secrets env file — edit config.json `secrets`. */
export const REQUIRED_SECRET_NAMES: readonly string[] = deployConfig.secrets;

export type PushAllStep = 'migrations' | 'secrets' | 'config' | 'functions';

export const PUSH_ALL_STEPS: readonly PushAllStep[] = ['migrations', 'secrets', 'config', 'functions'] as const;

const DEPLOY_ENVS = Object.keys(deployConfig.targets) as DeployEnv[];

/** Short CLI aliases → canonical DeployEnv (config / file names stay full). */
const DEPLOY_ENV_ALIASES: Readonly<Record<string, DeployEnv>> = {
	dev: 'development',
	prod: 'production',
};

/** Bracket usage for `bun run db:* [env]` help lines. */
export const DEPLOY_ENV_CLI_USAGE = 'local|development|dev|test|production|prod';

function isDeployEnv(value: string): value is DeployEnv {
	return (DEPLOY_ENVS as readonly string[]).includes(value);
}

/** Missing / empty → local. Invalid → null. Accepts `dev` / `prod` aliases. */
export function parseDeployEnv(arg: string | undefined): DeployEnv | null {
	if (arg === undefined || arg === '') return 'local';
	const canonical = DEPLOY_ENV_ALIASES[arg] ?? arg;
	if (isDeployEnv(canonical)) return canonical;
	return null;
}

const YES_ANSWERS = new Set(['y', 'yes']);
const NO_ANSWERS = new Set(['n', 'no']);

/** Map interactive confirm input; blank / unknown → defaultYes. */
export function parseYesNoAnswer(raw: string, defaultYes: boolean): boolean {
	const answer = raw.trim().toLowerCase();
	if (YES_ANSWERS.has(answer)) return true;
	if (NO_ANSWERS.has(answer)) return false;
	return defaultYes;
}

export function parseConfirmMode(value: unknown): ConfirmMode | null {
	if (value === 'confirmYes' || value === 'confirmTarget') return value;
	return null;
}

export function resolveDeployTarget(env: DeployEnv): DeployTarget {
	const row = deployConfig.targets[env];
	return {
		env,
		projectRef: row.projectRef,
		envFile: edgeSecretsEnvFile(env),
		runtimeEnvFile: runtimeEnvFile(env),
		confirm: 'confirm' in row ? parseConfirmMode(row.confirm) : null,
	};
}

/** Single identity for logs/prompts: `local Docker` or `production (bnage…)`. */
export function formatTargetLabel(target: DeployTarget): string {
	if (target.projectRef === null) return 'local Docker';
	return `${target.env} (${target.projectRef})`;
}

/** Token the operator must type for `confirmTarget` (`local` or project ref). */
export function confirmTargetToken(target: DeployTarget): string {
	return target.projectRef ?? 'local';
}

/** Exact match after trim (case-sensitive; refs are lowercase ids). */
export function matchesConfirmTargetToken(raw: string, expected: string): boolean {
	return raw.trim() === expected;
}

/**
 * Merge process env with parsed runtime env file entries.
 * File values win so `.env.test.local` overrides a shared root `.env`.
 */
export function mergeRuntimeEnv(
	processEnv: Record<string, string | undefined>,
	fileEntries: Record<string, string>,
): Record<string, string | undefined> {
	return { ...processEnv, ...fileEntries };
}

/** Hosted DB password from plain `SUPABASE_DB_PASSWORD` (runtime env file or process env). */
export function pickDbPassword(envMap: Record<string, string | undefined>): string | null {
	const value = envMap.SUPABASE_DB_PASSWORD?.trim();
	return value ? value : null;
}

export function deployEnvUsageHint(): string {
	return `Environment must be one of: ${DEPLOY_ENV_CLI_USAGE.replaceAll('|', ' | ')} (default: local)`;
}

function forEachEnvAssignment(contents: string, onPair: (key: string, rawValue: string) => void): void {
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === '' || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq <= 0) continue;
		const key = line.slice(0, eq).trim();
		if (key === '') continue;
		onPair(key, line.slice(eq + 1));
	}
}

/** Parse KEY=VALUE lines; skip blanks and # comments. Values are not returned. */
export function parseEnvFileKeys(contents: string): string[] {
	const keys: string[] = [];
	forEachEnvAssignment(contents, (key) => {
		keys.push(key);
	});
	return keys;
}

/** Parse KEY=VALUE map; empty values kept as ''. */
export function parseEnvFileEntries(contents: string): Record<string, string> {
	const out: Record<string, string> = {};
	forEachEnvAssignment(contents, (key, rawValue) => {
		let value = rawValue.trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	});
	return out;
}

export function missingRequiredSecretNames(entries: Record<string, string>): string[] {
	const missing: string[] = [];
	for (const name of REQUIRED_SECRET_NAMES) {
		const value = entries[name];
		if (value === undefined || value.trim() === '') missing.push(name);
	}
	return missing;
}

export function isReservedSecretName(name: string): boolean {
	return name.startsWith('SUPABASE_');
}

/**
 * Remote custom secrets to unset so the env file is the only source of truth.
 * Never marks SUPABASE_* as stale.
 */
export function staleSecretNames(remoteNames: string[], desiredNames: string[]): string[] {
	const desired = new Set(desiredNames);
	const stale: string[] = [];
	for (const name of remoteNames) {
		if (isReservedSecretName(name)) continue;
		if (desired.has(name)) continue;
		stale.push(name);
	}
	return stale;
}

/** Extract secret names from `supabase secrets list --output json`. */
export function parseSecretsListJson(raw: string): string[] {
	const trimmed = raw.trim();
	if (trimmed === '') return [];
	const parsed: unknown = JSON.parse(trimmed);
	if (!Array.isArray(parsed)) {
		throw new Error('secrets list JSON must be an array');
	}
	const names: string[] = [];
	for (const item of parsed) {
		if (typeof item === 'string') {
			names.push(item);
			continue;
		}
		if (item && typeof item === 'object' && 'name' in item) {
			const name = (item as { name: unknown }).name;
			if (typeof name === 'string' && name !== '') names.push(name);
		}
	}
	return names;
}

/** Log line after remote secrets replace. */
export function formatStaleSecretsSummary(staleNames: string[]): string {
	if (staleNames.length === 0) return 'No stale secrets to drop.';
	return `Dropped stale secrets: ${staleNames.join(', ')}`;
}

/** Body for generated supabase/.env (Auth SMTP env() only). */
export function buildLocalSupabaseDotEnv(entries: Record<string, string>): string {
	const key = entries.RESEND_API_KEY?.trim() ?? '';
	const lines = [
		'# Generated by bun run db:push:secrets local — do not edit by hand.',
		'# Source of truth: $SECRETS_PATH/supabase/.env.local',
		`RESEND_API_KEY=${key}`,
		'',
	];
	return lines.join('\n');
}

/**
 * Process-env overlay for `supabase config push`.
 * Resolves `pass = "env(RESEND_API_KEY)"` from the edge/Auth SoT file; null when missing/empty.
 */
export function configPushEnvFromSecrets(entries: Record<string, string>): Record<string, string> | null {
	const key = entries.RESEND_API_KEY?.trim() ?? '';
	if (!key) return null;
	return { RESEND_API_KEY: key };
}

/** True when both maps have the same keys and values (order ignored). */
export function envEntriesEqual(left: Record<string, string>, right: Record<string, string>): boolean {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	for (const key of leftKeys) {
		if (!(key in right) || left[key] !== right[key]) return false;
	}
	return true;
}
