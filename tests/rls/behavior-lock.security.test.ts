import { beforeAll, describe, expect, it } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDb } from './db';

const { supabase, url } = createDb();

async function createUserClient(email: string, password: string): Promise<SupabaseClient> {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	return createClient(url, data.session.access_token);
}

// --------------------------------------------------------
// Setup: fetch all seeded users via service_role
// --------------------------------------------------------
beforeAll(async () => {
	const client = await createUserClient('siteadmin@test.local', 'password');

	console.log(client);
});

// --------------------------------------------------------
// BASELINE: verify the seed data
// --------------------------------------------------------
describe('Baseline - Seed Data Verification', () => {
	it('should have 7 users seeded', async () => {
		//const users = await queryAs(supabase, TEST_USERS.SITE_ADMIN, 'SELECT user_id FROM user_roles');
		//expect(users.length).toBe(7);
	});
});
