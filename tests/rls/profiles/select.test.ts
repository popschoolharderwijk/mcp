import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_AGREEMENTS, SHARED_LOGIN_FAMILY } from '../seed-data-constants';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const { allProfiles } = fixtures;

describe('RLS: profiles SELECT', () => {
	it('site_admin sees all profiles', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const data = unwrap(await db.from('profiles').select('*'));

		expect(data).toHaveLength(allProfiles.length);
	});

	it('admin sees all profiles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const data = unwrap(await db.from('profiles').select('*'));

		expect(data).toHaveLength(allProfiles.length);
	});

	it('staff sees all profiles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const data = unwrap(await db.from('profiles').select('*'));

		expect(data).toHaveLength(allProfiles.length);
	});

	it('teacher sees own profile and profiles of their students', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const data = unwrap(await db.from('profiles').select('*'));

		// Alice: own profile + classic students 009–020 + shared-login family (Karin, Emma, Lars)
		expect(data).toHaveLength(
			1 + LESSON_AGREEMENTS.TEACHER_ALICE_CLASSIC_STUDENTS + SHARED_LOGIN_FAMILY.MEMBERSHIP_COUNT,
		);

		const ids = new Set(data.map((profile) => profile.user_id));
		expect(ids.has(fixtures.requireTeacherId(TestUsers.TEACHER_ALICE))).toBe(true);
		expect(ids.has(SHARED_LOGIN_FAMILY.PARENT_USER_ID)).toBe(true);
		expect(ids.has(SHARED_LOGIN_FAMILY.CHILD_EMMA_USER_ID)).toBe(true);
		expect(ids.has(SHARED_LOGIN_FAMILY.CHILD_LARS_USER_ID)).toBe(true);
		expect(ids.size).toBe(data.length);
	});

	it('user without role sees only own profile', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		// Query profiles - RLS should filter to only their row (no role = no teacher/student profile access)
		const data = unwrap(await db.from('profiles').select('*'));

		expect(data).toHaveLength(1);

		const [user] = data;
		expect(user).toBeDefined();
		expect(user.email).toBe(TestUsers.USER_001);
	});

	it('user sees only own profile (no other users)', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		const data = unwrap(await db.from('profiles').select('*'));

		expect(data).toHaveLength(1);

		const [profile] = data;
		expect(profile).toBeDefined();
		expect(profile.email).toBe(TestUsers.USER_001);
	});
});
