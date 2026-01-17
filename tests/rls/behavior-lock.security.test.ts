import { describe, expect, it } from 'bun:test';
import { createTestDb } from './db';

const supabase = createTestDb();

// =========================================================================
// Simple test: check number of users in user_roles
// =========================================================================
describe('Baseline RLS - user count', () => {
	it('should have 7 users seeded', async () => {
		const { data, error } = await supabase.from('user_roles').select('user_id');
		expect(error).toBeNull();
		expect(data?.length).toBe(7); // we expect 7 seeded users
	});
});
