/**
 * bun run db:push:all [env]
 * Fail-fast: migrations → secrets → config → functions (no reset).
 */

import { pushConfig } from './config.ts';
import { pushMigrations } from './db.ts';
import {
	DEPLOY_ENV_CLI_USAGE,
	type DeployTarget,
	formatTargetLabel,
	PUSH_ALL_STEPS,
	type PushAllStep,
} from './envHelpers.ts';
import { pushFunctions } from './functions.ts';
import { confirmTargetIfRequired, fail, resolveTargetFromArgv } from './runHelpers.ts';
import { pushSecrets } from './secrets.ts';

const STEP_RUNNERS: Record<PushAllStep, (target: DeployTarget) => Promise<void>> = {
	migrations: pushMigrations,
	secrets: pushSecrets,
	config: pushConfig,
	functions: pushFunctions,
};

function formatPushAllStepError(step: PushAllStep, error: unknown): string {
	const detail = error instanceof Error ? error.message : String(error);
	return `db:push:all failed at step "${step}": ${detail}`;
}

async function runPushAllStep(step: PushAllStep, target: DeployTarget): Promise<void> {
	console.log('');
	console.log(`=== ${step} ===`);
	await STEP_RUNNERS[step](target);
}

async function runPushAll(target: DeployTarget): Promise<void> {
	console.log(`db:push:all → ${formatTargetLabel(target)}`);
	console.log(`Steps: ${PUSH_ALL_STEPS.join(' → ')}`);
	await confirmTargetIfRequired(target, 'db:push:all');

	for (const step of PUSH_ALL_STEPS) {
		try {
			await runPushAllStep(step, target);
		} catch (error) {
			fail(formatPushAllStepError(step, error));
		}
	}

	console.log('');
	console.log('db:push:all complete.');
}

async function main(): Promise<void> {
	if (process.argv[2] !== 'push') {
		fail(`Usage: bun run scripts/supabase/all.ts push [${DEPLOY_ENV_CLI_USAGE}]`);
	}
	await runPushAll(resolveTargetFromArgv(process.argv.slice(3), 'db:push:all'));
}

if (import.meta.main) {
	await main();
}
