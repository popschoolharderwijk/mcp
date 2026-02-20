import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * Lesson types SELECT per permissions:
 *
 * All authenticated users (including users without role) can view all lesson types.
 * This is public reference data that everyone needs to see.
 */

async function selectLessonTypes(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('lesson_types').select('*'));
	expect(data.length).toBe(fixtures.allLessonTypes.length);
	return data;
}

describe('RLS: lesson_types SELECT', () => {
	it('site_admin sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.SITE_ADMIN);
	});

	it('admin sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.ADMIN_ONE);
	});

	it('staff sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.STAFF_ONE);
	});

	it('teacher without role sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.TEACHER_ALICE);
	});

	it('student without role sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.STUDENT_001);
	});

	it('user without role sees all lesson types', async () => {
		await selectLessonTypes(TestUsers.USER_001);
	});
});
