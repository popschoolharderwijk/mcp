import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * localdev: same-origin so the Vite proxy can reach the loopback-only native API
 * (Docker publishes cannot hit 127.0.0.1 inside the workspace container).
 */
function resolveSupabaseUrl(): string | undefined {
	if (import.meta.env.MODE === 'localdev' && typeof window !== 'undefined') {
		return window.location.origin;
	}
	return import.meta.env.VITE_SUPABASE_URL;
}

const SUPABASE_URL = resolveSupabaseUrl();
// Local `supabase status` exports VITE_SUPABASE_PUBLISHABLE_KEY; remote env files use *_DEFAULT_KEY.
const SUPABASE_PUBLISHABLE_KEY =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
	throw new Error(
		'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) are configured.',
	);
}

/** Browser `localStorage`, or in-memory for Bun/Node tests without a DOM. */
function resolveAuthStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
	if (typeof localStorage !== 'undefined') {
		return localStorage;
	}
	const memory = new Map<string, string>();
	return {
		getItem: (key) => memory.get(key) ?? null,
		setItem: (key, value) => {
			memory.set(key, value);
		},
		removeItem: (key) => {
			memory.delete(key);
		},
	};
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		storage: resolveAuthStorage(),
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});
