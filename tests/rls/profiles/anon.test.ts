import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresErrorCodes } from '../../../src/integrations/supabase/errorcodes';
import { createClientAnon } from '../../db';
import type { ProfileInsert } from '../../types';
import { unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: anonymous user – profiles', () => {
	it('anon cannot read profiles', async () => {
		const db = createClientAnon();
		const error = unwrapError(await db.from('profiles').select('*'));
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});

	it('anon cannot insert profiles', async () => {
		const db = createClientAnon();
		const newProfile: ProfileInsert = {
			user_id: '00000000-0000-0000-0000-999999999999',
			email: 'anon@test.nl',
		};
		unwrapError(await db.from('profiles').insert(newProfile).select());
	});

	it('anon cannot update profiles', async () => {
		const db = createClientAnon();
		const error = unwrapError(
			await db
				.from('profiles')
				.update({ first_name: 'Hacked', last_name: null })
				.eq('email', TestUsers.STUDENT_001)
				.select(),
		);
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});

	it('anon cannot delete profiles', async () => {
		const db = createClientAnon();
		const error = unwrapError(
			await db.from('profiles').delete().eq('email', TestUsers.STUDENT_001).select(),
		);
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});
});
