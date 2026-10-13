import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { extractSupabaseProjectRef, isProductionDb, PRODUCTION_SUPABASE_PROJECT_REF } from './supabaseTargetHelpers';
import { orderImportSqlFileNames, readUploadImportEnv } from './uploadImportEnvHelpers';

async function confirmProductionUpload(
	projectRef: string,
	ask: (question: string) => Promise<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const answer = (
		await ask(
			`WARNING: SUPABASE_URL points at production (${projectRef}). Type "${PRODUCTION_SUPABASE_PROJECT_REF}" to continue: `,
		)
	).trim();

	if (answer !== PRODUCTION_SUPABASE_PROJECT_REF) {
		return { ok: false, error: 'Production upload aborted (project ref confirmation mismatch)' };
	}
	return { ok: true };
}

async function defaultAskLine(question: string): Promise<string> {
	const rl = createInterface({ input, output });
	try {
		return await rl.question(question);
	} finally {
		rl.close();
	}
}

async function defaultRunPsqlFile(
	dbUrl: string,
	sqlPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	// -q hides INSERT/DO tags; RAISE NOTICE lines (per-table counts) still print.
	const proc = Bun.spawn(['psql', dbUrl, '-q', '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'ignore',
	});
	const code = await proc.exited;
	if (code !== 0) {
		return { ok: false, error: `psql failed for ${sqlPath} (exit ${code})` };
	}
	return { ok: true };
}

type RunPsqlFile = (dbUrl: string, sqlPath: string) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Upload ordered SQL files from `outDir` via SUPABASE_DB_URL (Session pooler). */
export async function uploadImportSqlFiles(params: {
	outDir: string;
	preferredSqlOrder: readonly string[];
	env?: NodeJS.ProcessEnv;
	ask?: (question: string) => Promise<string>;
	runPsqlFile?: RunPsqlFile;
	log?: (message: string) => void;
}): Promise<{ ok: true; files: string[] } | { ok: false; error: string }> {
	const envResult = readUploadImportEnv(params.env);
	if (!envResult.ok) return envResult;

	const projectRef = extractSupabaseProjectRef(envResult.value.supabaseUrl);
	if (!projectRef) {
		return {
			ok: false,
			error: `Could not parse Supabase project ref from SUPABASE_URL: ${envResult.value.supabaseUrl}`,
		};
	}

	if (isProductionDb(envResult.value.supabaseUrl)) {
		const confirmed = await confirmProductionUpload(projectRef, params.ask ?? defaultAskLine);
		if (!confirmed.ok) return confirmed;
	}

	const entries = await readdir(params.outDir);
	const orderedNames = orderImportSqlFileNames(entries, params.preferredSqlOrder);
	if (orderedNames.length === 0) {
		return { ok: false, error: `No .sql files found in ${params.outDir}` };
	}

	const runPsqlFile = params.runPsqlFile ?? defaultRunPsqlFile;
	const log = params.log ?? console.log;
	log(`Uploading ${orderedNames.length} SQL file(s) to project ${projectRef} via SUPABASE_DB_URL…`);
	for (const name of orderedNames) {
		const sqlPath = join(params.outDir, name);
		log(`  → ${name}`);
		const result = await runPsqlFile(envResult.value.dbUrl, sqlPath);
		if (!result.ok) return result;
	}

	return { ok: true, files: orderedNames };
}
