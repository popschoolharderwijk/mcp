/** Production Supabase project ref (see docs/architecture.md). */
export const PRODUCTION_SUPABASE_PROJECT_REF = 'bnagepkxryauifzyoxgo';

/**
 * Extract project ref from a Supabase API URL (`https://<ref>.supabase.co`).
 * Returns null when the host is not a standard `*.supabase.co` project URL.
 */
export function extractSupabaseProjectRef(supabaseUrl: string): string | null {
	const trimmed = supabaseUrl.trim();
	if (trimmed === '') return null;

	try {
		const host = new URL(trimmed).hostname.toLowerCase();
		const match = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
		return match?.[1] ?? null;
	} catch {
		return null;
	}
}

/** True when SUPABASE_URL points at the production project. */
export function isProductionDb(supabaseUrl: string): boolean {
	return extractSupabaseProjectRef(supabaseUrl) === PRODUCTION_SUPABASE_PROJECT_REF;
}
