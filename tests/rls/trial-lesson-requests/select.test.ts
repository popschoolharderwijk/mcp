import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TRIAL_LESSON_REQUESTS } from '../seed-data-constants';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const trialUser004 = fixtures.requireTrialRequestId(TestUsers.USER_004, 'requested');
const trialUser005 = fixtures.requireTrialRequestId(TestUsers.USER_005, 'proposed');
const trialUser007 = fixtures.requireTrialRequestId(TestUsers.USER_007, 'confirmed');

/**
 * trial_lesson_requests SELECT:
 * - Student: only own rows (user_id = auth.uid())
 * - Teacher: only rows where proposed_teacher_id = get_teacher_id(auth.uid())
 * - Admin/Staff: all rows
 */
describe('RLS: trial_lesson_requests student/teacher logic', () => {
	it('learner sees only their own trial requests', async () => {
		const db = await createClientAs(TestUsers.USER_004);

		const data = unwrap(await db.from('trial_lesson_requests').select('*'));

		expect(data.length).toBe(TRIAL_LESSON_REQUESTS.USER_004);
		expect(data.map((r) => r.id)).toContain(trialUser004);
	});

	it('learner cannot see other learners trial requests', async () => {
		const db = await createClientAs(TestUsers.USER_005);

		const data = unwrap(await db.from('trial_lesson_requests').select('*'));

		expect(data.length).toBe(TRIAL_LESSON_REQUESTS.USER_005);
		expect(data.map((r) => r.id)).toContain(fixtures.requireTrialRequestId(TestUsers.USER_005, 'proposed'));
		expect(data.map((r) => r.id)).not.toContain(trialUser004);
	});

	it('teacher sees only trials where they are proposed_teacher', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const data = unwrap(await db.from('trial_lesson_requests').select('*'));

		expect(data.length).toBe(TRIAL_LESSON_REQUESTS.TEACHER_ALICE);
		expect(data.map((r) => r.id)).toContain(trialUser005);
		expect(data.map((r) => r.id)).toContain(trialUser007);
	});

	it('teacher cannot see trials where they are not proposed_teacher', async () => {
		const db = await createClientAs(TestUsers.TEACHER_BOB);

		const data = unwrap(await db.from('trial_lesson_requests').select('*'));

		expect(data.length).toBe(0);
	});
});

describe('RLS: trial_lesson_requests SELECT privileged', () => {
	async function selectAll(user: TestUser) {
		const db = await createClientAs(user);
		const data = unwrap(await db.from('trial_lesson_requests').select('*'));
		expect(data.length).toBe(TRIAL_LESSON_REQUESTS.TOTAL);
		expect(data.map((r) => r.id)).toContain(trialUser004);
		expect(data.map((r) => r.id)).toContain(trialUser007);
	}

	it('staff sees all trial requests', async () => {
		await selectAll(TestUsers.STAFF_ONE);
	});

	it('admin sees all trial requests', async () => {
		await selectAll(TestUsers.ADMIN_ONE);
	});

	it('site_admin sees all trial requests', async () => {
		await selectAll(TestUsers.SITE_ADMIN);
	});
});
