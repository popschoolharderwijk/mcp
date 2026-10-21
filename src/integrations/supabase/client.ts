import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
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
