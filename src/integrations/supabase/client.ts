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

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		storage: localStorage,
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});
