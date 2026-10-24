import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import type { ProfileInsert } from '../../types';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const { requireUserId } = fixtures;

/**
 * Profiles INSERT/DELETE are intentionally blocked.
 * - Profiles are only created via handle_new_user() trigger
 * - Profiles are only deleted via CASCADE when auth.users is deleted
 */

describe('RLS: profiles INSERT - blocked for all roles', () => {
	const newProfileData: ProfileInsert = {
		user_id: '00000000-0000-0000-0000-999999999999',
		email: 'fake@test.nl',
		first_name: 'Fake',
		last_name: 'User',
	};

	it('user without role cannot insert profile', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('profiles').insert(newProfileData).select());
	});

	it('teacher cannot insert profile', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		unwrapError(await db.from('profiles').insert(newProfileData).select());
	});

	it('staff cannot insert profile', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		unwrapError(await db.from('profiles').insert(newProfileData).select());
	});

	it('admin cannot insert profile', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		unwrapError(await db.from('profiles').insert(newProfileData).select());
	});

	it('site_admin cannot insert profile', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		unwrapError(await db.from('profiles').insert(newProfileData).select());
	});
});

describe('RLS: profiles DELETE - blocked for all roles', () => {
	it('user without role cannot delete own profile', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('user without role cannot delete other profiles', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const userId = requireUserId(TestUsers.STUDENT_002);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('teacher cannot delete profiles', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('staff cannot delete profiles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('admin cannot delete profiles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('site_admin cannot delete profiles', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('profiles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});
});
