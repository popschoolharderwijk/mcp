import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ConnectionInfo = {
	supabase: SupabaseClient;
	url: string;
};

export function createDbBypassRLS(): ConnectionInfo {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
	}

	return { supabase: createClient(url, key), url };
}

export function createDb(): ConnectionInfo {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_DEFAULT_KEY must be set');
	}

	return { supabase: createClient(url, key), url };
}
