/**
 * Bun preload: load secret env files from SECRETS_PATH into process.env when configured.
 * CI has no local `.env` / mcp-secrets — skip and keep GitHub Actions process env.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	mergeRuntimeEnv,
	parseEnvFileEntries,
	resolveSecretsRoot,
	runtimeEnvFileForNodeEnv,
	secretsFilePath,
} from './supabase/envHelpers.ts';

const projectRoot = join(import.meta.dir, '..');

function readRootEnvContents(): string | null {
	const path = join(projectRoot, '.env');
	return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function applySecretsFile(secretsRoot: string, relativePath: string): void {
	const path = secretsFilePath(secretsRoot, relativePath);
	if (!existsSync(path)) return;
	const entries = parseEnvFileEntries(readFileSync(path, 'utf8'));
	Object.assign(process.env, mergeRuntimeEnv(process.env, entries));
}

const secretsRoot = resolveSecretsRoot(projectRoot, process.env, readRootEnvContents());
if (secretsRoot !== null) {
	applySecretsFile(secretsRoot, '.env');
	applySecretsFile(secretsRoot, runtimeEnvFileForNodeEnv(process.env.NODE_ENV));
}
