export type UploadImportEnv = {
	supabaseUrl: string;
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
 * Validate upload env vars and build the Session-pooler DB URL.
 * `SUPABASE_DB_URL` must contain `{PASSWORD}` for `SUPABASE_DB_PASSWORD`.
 */
export function readUploadImportEnv(
	env: NodeJS.ProcessEnv = process.env,
): { ok: true; value: UploadImportEnv } | { ok: false; error: string } {
	const supabaseUrl = env.SUPABASE_URL?.trim() ?? '';
	const dbUrlTemplate = env.SUPABASE_DB_URL?.trim() ?? '';
	const dbPassword = env.SUPABASE_DB_PASSWORD ?? '';

	const error = uploadEnvValidationError(supabaseUrl, dbUrlTemplate, dbPassword);
	if (error != null) {
		return { ok: false, error };
	}

	return {
		ok: true,
		value: { supabaseUrl, dbUrl: applyDbUrlPassword(dbUrlTemplate, dbPassword) },
	};
}

function uploadEnvValidationError(supabaseUrl: string, dbUrlTemplate: string, dbPassword: string): string | null {
	if (supabaseUrl === '') {
		return 'Missing SUPABASE_URL in environment';
	}
	if (dbUrlTemplate === '') {
		return 'Missing SUPABASE_DB_URL in environment. Copy the Session pooler URI from Supabase → Database → Connect (not Direct connection; that is IPv6-only) and keep `{PASSWORD}` as the password placeholder.';
	}
	if (dbPassword === '') {
		return 'Missing SUPABASE_DB_PASSWORD in environment';
	}
	if (!dbUrlTemplate.includes('{PASSWORD}')) {
		return 'SUPABASE_DB_URL must contain the `{PASSWORD}` placeholder for SUPABASE_DB_PASSWORD';
	}
	return null;
}
