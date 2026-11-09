/**
 * bun run db:push:config [env]
 *
 * Remotes: inject RESEND_API_KEY from $SECRETS_PATH/supabase/.env.<target>
 * so auth.email.smtp.pass = env(RESEND_API_KEY) resolves during config push.
 */

import { existsSync, readFileSync } from 'node:fs';
import {
	configPushEnvFromSecrets,
	type DeployTarget,
	parseEnvFileEntries,
	ROOT_ENV_POINTER_KEY,
	secretsFilePath,
} from './envHelpers.ts';
import { fail, readSecretsRoot, remoteFlag, runPushScriptMain, runSupabase } from './runHelpers.ts';

function loadConfigPushEnv(target: DeployTarget): Record<string, string> {
	const relative = target.envFile;
	const path = secretsFilePath(readSecretsRoot(), relative);
	if (!existsSync(path)) {
		fail(`Secrets file not found: $${ROOT_ENV_POINTER_KEY}/${relative}`);
	}
	const overlay = configPushEnvFromSecrets(parseEnvFileEntries(readFileSync(path, 'utf8')));
	if (overlay === null) {
		fail(
			`Missing or empty RESEND_API_KEY in $${ROOT_ENV_POINTER_KEY}/${relative} (required for auth.email.smtp.pass on config push)`,
		);
	}
	return overlay;
}

/** Fail before confirm when remote Auth SMTP cannot resolve env(RESEND_API_KEY). */
export function assertConfigPushSecrets(target: DeployTarget): void {
	if (target.projectRef === null) return;
	loadConfigPushEnv(target);
}

export async function pushConfig(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		console.log('Local uses supabase/config.toml via `supabase start` — nothing to push.');
		return;
	}

	await runSupabase(['config', 'push', remoteFlag(target.projectRef)], {
		env: loadConfigPushEnv(target),
	});
}

if (import.meta.main) {
	await runPushScriptMain({
		scriptFile: 'config.ts',
		verbLabel: 'db:push:config',
		preflight: assertConfigPushSecrets,
		run: pushConfig,
	});
}
