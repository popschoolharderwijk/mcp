import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresErrorCodes } from '../../../src/integrations/supabase/errorcodes';
import { createClientAnon } from '../../db';
import type { UserRoleInsert } from '../../types';
import { unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: anonymous user – user_roles', () => {
	it('anon cannot read user_roles', async () => {
		const db = createClientAnon();
		const error = unwrapError(await db.from('user_roles').select('*'));
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});

	it('anon cannot insert user_roles', async () => {
		const db = createClientAnon();
		const newUserRole: UserRoleInsert = {
			user_id: '00000000-0000-0000-0000-999999999999',
			role: 'site_admin',
		};
		unwrapError(await db.from('user_roles').insert(newUserRole).select());
	});

	it('anon cannot update user_roles', async () => {
		const db = createClientAnon();
		const error = unwrapError(
			await db.from('user_roles').update({ role: 'site_admin' }).neq('role', 'site_admin').select(),
		);
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
		expect(error.message).toMatch(/permission denied/i);
	});

	it('anon cannot delete user_roles', async () => {
		const db = createClientAnon();
		const error = unwrapError(await db.from('user_roles').delete().eq('role', 'staff').select());
		expect(error.code).toBe(PostgresErrorCodes.INSUFFICIENT_PRIVILEGE);
	});
});
