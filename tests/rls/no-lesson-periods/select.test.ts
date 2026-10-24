import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { NO_LESSON_PERIODS } from '../seed-data-constants';
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
 * no_lesson_periods SELECT: every authenticated user sees every period (agenda needs them).
 */

async function expectSeesAllPeriods(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('no_lesson_periods').select('name').order('name'));
	expect(data.map((row) => row.name)).toEqual([...NO_LESSON_PERIODS.NAMES]);
}

describe('RLS: no_lesson_periods SELECT - all authenticated users', () => {
	it('site_admin sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.SITE_ADMIN);
	});

	it('admin sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.ADMIN_ONE);
	});

	it('staff sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.STAFF_ONE);
	});

	it('teacher sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.TEACHER_ALICE);
	});

	it('student sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.STUDENT_001);
	});

	it('user without role sees all no-lesson periods', async () => {
		await expectSeesAllPeriods(TestUsers.USER_001);
	});
});
