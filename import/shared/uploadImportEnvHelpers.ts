export type UploadImportEnv = {
	dbUrl: string;
};

/** Replace `{PASSWORD}` placeholders with a percent-encoded DB password. */
export function applyDbUrlPassword(dbUrlTemplate: string, password: string): string {
	return dbUrlTemplate.replaceAll('{PASSWORD}', encodeURIComponent(password));
}

/** Order known converter SQL first; any other `*.sql` files follow alphabetically. */
export function orderImportSqlFileNames(fileNames: readonly string[], preferredOrder: readonly string[]): string[] {
	const sqlNames = fileNames.filter((name) => name.endsWith('.sql'));
	const preferred = preferredOrder.filter((name) => sqlNames.includes(name));
	const preferredSet = new Set(preferred);
	const extras = sqlNames.filter((name) => !preferredSet.has(name)).sort((a, b) => a.localeCompare(b));
	return [...preferred, ...extras];
}

/**
 * Validate upload env vars and build the DB URL.
 * `SUPABASE_DB_URL` must contain `{PASSWORD}` for `SUPABASE_DB_PASSWORD`.
 * Hosted: Session pooler URI. Local Docker: e.g. `postgresql://postgres:{PASSWORD}@localhost:54422/postgres`.
 */
export function readUploadImportEnv(
	env: NodeJS.ProcessEnv = process.env,
): { ok: true; value: UploadImportEnv } | { ok: false; error: string } {
	const dbUrlTemplate = env.SUPABASE_DB_URL?.trim() ?? '';
	const dbPassword = env.SUPABASE_DB_PASSWORD ?? '';

	const error = uploadEnvValidationError(dbUrlTemplate, dbPassword);
	if (error != null) {
		return { ok: false, error };
	}

	return {
		ok: true,
		value: { dbUrl: applyDbUrlPassword(dbUrlTemplate, dbPassword) },
	};
}

function uploadEnvValidationError(dbUrlTemplate: string, dbPassword: string): string | null {
	if (dbUrlTemplate === '') {
		return 'Missing SUPABASE_DB_URL in environment. Hosted: Session pooler URI from Supabase → Database → Connect (not Direct connection; that is IPv6-only). Local: postgresql://postgres:{PASSWORD}@localhost:54422/postgres. Keep `{PASSWORD}` as the password placeholder.';
	}
	if (dbPassword === '') {
		return 'Missing SUPABASE_DB_PASSWORD in environment';
	}
	if (!dbUrlTemplate.includes('{PASSWORD}')) {
		return 'SUPABASE_DB_URL must contain the `{PASSWORD}` placeholder for SUPABASE_DB_PASSWORD';
	}
	return null;
}
