/**
 * bun run db:types [env]
 *
 * CLI v3: remotes use --remote=<ref>. Local uses --remote=postgresql://…@localhost
 * so multi-stack Docker does not rewrite to db:5432 (supabase/cli#5283).
 */

import { join } from 'node:path';
import { type DeployTarget, formatTargetLabel } from './envHelpers.ts';
import {
	confirmTargetIfRequired,
	ensureSupabaseUnlinked,
	fail,
	projectRoot,
	remoteDbAuth,
	resolveTargetFromArgv,
	runSupabaseCapture,
} from './runHelpers.ts';

const TYPES_OUT = 'src/integrations/supabase/types.ts';

/** Host-mapped DB port from `supabase/config.toml` `[db] port`. */
async function localDbPort(): Promise<number> {
	const config = await Bun.file(join(projectRoot, 'supabase/config.toml')).text();
	const match = /^\[db\]\s*\n(?:[^\n]*\n)*?port\s*=\s*(\d+)/m.exec(config);
	if (!match) {
		fail('Could not read [db].port from supabase/config.toml');
	}
	return Number(match[1]);
}

async function runGenTypes(remoteArg: string, env?: Record<string, string>): Promise<void> {
	const outPath = join(projectRoot, TYPES_OUT);
	const stdout = await runSupabaseCapture(['gen', 'types', 'typescript', remoteArg, '--schema', 'public'], {
		env,
	});
	await Bun.write(outPath, stdout);
	console.log(`Wrote ${TYPES_OUT}`);
}

async function formatTypesFile(): Promise<void> {
	console.log(`→ biome check --write ./${TYPES_OUT}`);
	const proc = Bun.spawn(['biome', 'check', '--write', `./${TYPES_OUT}`], {
		cwd: projectRoot,
		stdout: 'inherit',
		stderr: 'inherit',
		env: process.env,
	});
	const code = await proc.exited;
	if (code !== 0) {
		fail(`biome check --write ./${TYPES_OUT} exited with code ${code}`);
	}
}

export async function generateTypes(target: DeployTarget): Promise<void> {
	if (target.projectRef === null) {
		const port = await localDbPort();
		const dbUrl = `postgresql://postgres:postgres@localhost:${port}/postgres`;
		console.log(`db:types → ${formatTargetLabel(target)} (localhost:${port})`);
		await runGenTypes(`--remote=${dbUrl}`);
	} else {
		console.log(`db:types → ${formatTargetLabel(target)}`);
		await ensureSupabaseUnlinked();
		const auth = remoteDbAuth(target, 'password-env');
		await runGenTypes(auth.args[0], auth.env);
	}

	await formatTypesFile();
}

async function main(): Promise<void> {
	const target = resolveTargetFromArgv(process.argv.slice(2), 'db:types');
	await confirmTargetIfRequired(target, 'db:types');
	await generateTypes(target);
	console.log('Done.');
}

if (import.meta.main) {
	await main();
}
