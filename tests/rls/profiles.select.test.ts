import { describe, expect, it } from 'bun:test';
import { signInAs } from './impersonation';

describe('RLS: profiles SELECT', () => {
	it('student sees only own profile', async () => {
		// Sign in as student_a using real Supabase auth
		const db = await signInAs('student_a');

		// Query profiles - RLS should filter to only their row
		const { data, error } = await db.from('profiles').select('*');

		console.log(data, error);

		expect(error).toBeNull();
		expect(data?.length).toBe(1);
	});
});
