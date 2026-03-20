const DEFAULT_SUPABASE_PROJECT_ID = 'zdvscmogkfyddnnxzkdu';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_p-r-UahRPmnCpRSpfnQp5w_tJFrak7b';

const KNOWN_SUPABASE_PROJECTS = new Set([
	DEFAULT_SUPABASE_PROJECT_ID,
	'jserlqacarlgtdzrblic',
	'bnagepkxryauifzyoxgo',
]);

function extractProjectId(url?: string | null) {
	if (!url) return null;

	try {
		return new URL(url).hostname.split('.')[0] ?? null;
	} catch {
		return null;
	}
}

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const envProjectId = extractProjectId(envUrl);
const hasKnownProjectConfig = Boolean(envProjectId && envKey && KNOWN_SUPABASE_PROJECTS.has(envProjectId));

export const supabaseConfig = {
	projectId: hasKnownProjectConfig ? envProjectId : DEFAULT_SUPABASE_PROJECT_ID,
	url: hasKnownProjectConfig && envUrl ? envUrl : DEFAULT_SUPABASE_URL,
	publishableKey: hasKnownProjectConfig && envKey ? envKey : DEFAULT_SUPABASE_PUBLISHABLE_KEY,
	source: hasKnownProjectConfig ? 'env' : 'fallback',
} as const;
