/**
 * RLS tests for trial_lessons SELECT policy.
 *
 * Rule: student_user_id = auth.uid() OR teacher_user_id = teacher of current user OR is_privileged()
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { TrialLessonInsert } from '../../types';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

const dbNoRLS = createClientBypassRLS();
const lessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

const studentAUserId = fixtures.requireUserId(TestUsers.STUDENT_009);
const studentBUserId = fixtures.requireUserId(TestUsers.STUDENT_010);
const teacherAliceUserId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);
const teacherBobUserId = fixtures.requireUserId(TestUsers.TEACHER_BOB);

const seededIds: string[] = [];

async function seedTrial(studentUserId: string, teacherUserId: string): Promise<string> {
	const payload: TrialLessonInsert = {
		student_user_id: studentUserId,
		teacher_user_id: teacherUserId,
		lesson_type_id: lessonTypeId,
		scheduled_date: '2030-01-15',
		scheduled_start_time: '15:00:00',
		duration_minutes: 30,
		status: 'scheduled',
	};
	const [row] = unwrap(await dbNoRLS.from('trial_lessons').insert(payload).select('id'));
	seededIds.push(row.id);
	return row.id;
}

let trialA: string;
let trialB: string;

beforeAll(async () => {
	initialState = await setupState();
	trialA = await seedTrial(studentAUserId, teacherAliceUserId);
	trialB = await seedTrial(studentBUserId, teacherBobUserId);
});

afterAll(async () => {
	unwrap(await dbNoRLS.from('trial_lessons').delete().in('id', seededIds).select('id'));
	await verifyState(initialState);
});

describe('RLS: trial_lessons SELECT - privileged sees all', () => {
	async function expectSeesAll(user: TestUser) {
		const db = await createClientAs(user);
		const data = unwrap(await db.from('trial_lessons').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(trialA);
		expect(ids).toContain(trialB);
	}
	it('site_admin', () => expectSeesAll(TestUsers.SITE_ADMIN));
	it('admin', () => expectSeesAll(TestUsers.ADMIN_ONE));
	it('staff', () => expectSeesAll(TestUsers.STAFF_ONE));
});

describe('RLS: trial_lessons SELECT - student/teacher scoping', () => {
	it('student sees only their own trial', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		const data = unwrap(await db.from('trial_lessons').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(trialA);
		expect(ids).not.toContain(trialB);
	});

	it('teacher sees only trials assigned to them', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const data = unwrap(await db.from('trial_lessons').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).toContain(trialA);
		expect(ids).not.toContain(trialB);
	});

	it('unrelated student sees no trials', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const data = unwrap(await db.from('trial_lessons').select('id'));
		const ids = data.map((r) => r.id);
		expect(ids).not.toContain(trialA);
		expect(ids).not.toContain(trialB);
	});
});
