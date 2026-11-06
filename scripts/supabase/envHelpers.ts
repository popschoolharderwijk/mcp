/**
 * Pure helpers for `bun run db:*` deploy scripts.
 * Env file paths live under supabase/functions/ (not root Vite .env*).
 */

import requiredSecretNames from './required-secrets.json';

export type DeployEnv = 'local' | 'dev' | 'test' | 'prod';

export type DeployTarget = {
	env: DeployEnv;
	/** null = local Docker stack */
	projectRef: string | null;
	secretsFileRelative: string;
};

/** Required non-empty keys in each secrets env file — edit required-secrets.json. */
export const REQUIRED_SECRET_NAMES: readonly string[] = requiredSecretNames;

export type PushAllStep = 'migrations' | 'secrets' | 'config' | 'functions';

export const PUSH_ALL_STEPS: readonly PushAllStep[] = ['migrations', 'secrets', 'config', 'functions'] as const;

const DEPLOY_ENVS: readonly DeployEnv[] = ['local', 'dev', 'test', 'prod'];

const TARGETS: Record<DeployEnv, DeployTarget> = {
	local: {
		env: 'local',
		projectRef: null,
		secretsFileRelative: 'supabase/functions/.env.local',
	},
	dev: {
		env: 'dev',
		projectRef: 'zdvscmogkfyddnnxzkdu',
		secretsFileRelative: 'supabase/functions/.env.development',
	},
	test: {
		env: 'test',
		projectRef: 'jserlqacarlgtdzrblic',
		secretsFileRelative: 'supabase/functions/.env.test',
	},
	prod: {
		env: 'prod',
		projectRef: 'bnagepkxryauifzyoxgo',
		secretsFileRelative: 'supabase/functions/.env.production',
	},
};

function isDeployEnv(value: string): value is DeployEnv {
	return (DEPLOY_ENVS as readonly string[]).includes(value);
}

/** Missing / empty → local. Invalid → null. */
export function parseDeployEnv(arg: string | undefined): DeployEnv | null {
	if (arg === undefined || arg === '') return 'local';
	if (isDeployEnv(arg)) return arg;
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

export function resolveDeployTarget(env: DeployEnv): DeployTarget {
	return TARGETS[env];
}

export function deployEnvUsageHint(): string {
	return 'Environment must be one of: local | dev | test | prod (default: local)';
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
		'# Source of truth: supabase/functions/.env.local',
		`RESEND_API_KEY=${key}`,
		'',
	];
	return lines.join('\n');
}
