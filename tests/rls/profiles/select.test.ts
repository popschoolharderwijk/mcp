import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_AGREEMENTS } from '../seed-data-constants';
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

		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(allProfiles.length);
	});

	it('admin sees all profiles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(allProfiles.length);
	});

	it('staff sees all profiles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(allProfiles.length);
	});

	it('teacher sees own profile and profiles of their students', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		// Teacher sees own profile + profiles of students they have a lesson_agreement with (seed: Alice has students 009–020)
		const teacherAliceStudentEmails = Array.from(
			{ length: LESSON_AGREEMENTS.TEACHER_ALICE },
			(_, i) => `student-${String(i + 9).padStart(3, '0')}@test.nl`,
		);
		const allowedEmails = new Set([TestUsers.TEACHER_ALICE, ...teacherAliceStudentEmails]);

		expect(data).toHaveLength(allowedEmails.size);

		for (const profile of data ?? []) {
			expect(allowedEmails.has(profile.email)).toBe(true);
		}
		// No duplicates
		const emails = (data ?? []).map((p) => p.email);
		expect(emails).toHaveLength(new Set(emails).size);
	});

	it('user without role sees only own profile', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		// Query profiles - RLS should filter to only their row (no role = no teacher/student profile access)
		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const [user] = data ?? [];
		expect(user).toBeDefined();
		expect(user.email).toBe(TestUsers.USER_001);
	});

	it('user sees only own profile (no other users)', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		const { data, error } = await db.from('profiles').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const [profile] = data ?? [];
		expect(profile).toBeDefined();
		expect(profile.email).toBe(TestUsers.USER_001);
	});
});
