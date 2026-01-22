import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

export function createClientBypassRLS() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
	}

	return createClient<Database>(url, key);
}

export function createClientAnon() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_DEFAULT_KEY must be set');
	}

	return createClient<Database>(url, key);
}

export async function createClientAs(emailAddress: string) {
	const TEST_PASSWORD = 'password';

	const client = createClientAnon();

	const { error } = await client.auth.signInWithPassword({
		email: emailAddress,
		password: TEST_PASSWORD,
	});

	if (error) {
		throw new Error(`Failed to sign in as ${emailAddress}: ${error.message}`);
	}

	return client;
}
