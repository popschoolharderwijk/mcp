import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon, createClientAs } from '../../db';
import { expectNoError, unwrap } from '../../utils';
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

const lessonTypeId = fixtures.requireLessonTypeId('Gitaar');
const trialUser006 = fixtures.requireTrialRequestId(TestUsers.USER_006, 'proposed');
const trialUser007 = fixtures.requireTrialRequestId(TestUsers.USER_007, 'confirmed');

describe('RLS: trial_lesson_requests - anon has no access', () => {
	it('anon cannot read trial_lesson_requests', async () => {
		const db = createClientAnon();
		const { data, error } = await db.from('trial_lesson_requests').select('*');
		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('anon cannot read pending_trial_requests', async () => {
		const db = createClientAnon();
		const { data, error } = await db.from('pending_trial_requests').select('*');
		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('anon cannot insert trial_lesson_requests', async () => {
		const db = createClientAnon();
		const userId = fixtures.requireUserId(TestUsers.USER_004);
		const { data, error } = await db
			.from('trial_lesson_requests')
			.insert({ user_id: userId, lesson_type_id: lessonTypeId, status: 'requested' })
			.select();
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});
});

describe('RLS: trial_lesson_requests UPDATE - learner can set student_confirmed_at', () => {
	it('learner can update own row (student_confirmed_at)', async () => {
		const db = await createClientAs(TestUsers.USER_006);
		const beforeRow = unwrap(
			await db.from('trial_lesson_requests').select('student_confirmed_at').eq('id', trialUser006).single(),
		) as { student_confirmed_at: string | null } | null;
		if (!beforeRow) throw new Error('expected row');

		const ts = new Date().toISOString();
		const { data, error } = await db
			.from('trial_lesson_requests')
			.update({ student_confirmed_at: ts })
			.eq('id', trialUser006)
			.select();

		expectNoError(data, error);
		expect(data).toHaveLength(1);
		expect(data[0].student_confirmed_at).toBe(ts);

		// Restore
		unwrap(
			await db
				.from('trial_lesson_requests')
				.update({ student_confirmed_at: beforeRow.student_confirmed_at })
				.eq('id', trialUser006),
		);
	});
});

describe('RLS: trial_lesson_requests UPDATE - teacher can set teacher_confirmed_at', () => {
	it('teacher can update own proposed row (teacher_confirmed_at)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const trialId = fixtures.requireTrialRequestId(TestUsers.USER_005, 'proposed');
		const beforeRow = unwrap(
			await db.from('trial_lesson_requests').select('teacher_confirmed_at').eq('id', trialId).single(),
		) as { teacher_confirmed_at: string | null } | null;
		if (!beforeRow) throw new Error('expected row');

		const ts = new Date().toISOString();
		const { data, error } = await db
			.from('trial_lesson_requests')
			.update({ teacher_confirmed_at: ts })
			.eq('id', trialId)
			.select();

		expectNoError(data, error);
		expect(data).toHaveLength(1);

		// Restore
		unwrap(
			await db
				.from('trial_lesson_requests')
				.update({ teacher_confirmed_at: beforeRow.teacher_confirmed_at })
				.eq('id', trialId),
		);
	});
});

describe('RLS: trial_lesson_requests UPDATE - privileged', () => {
	it('admin can update any trial request', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const beforeRow = unwrap(
			await db.from('trial_lesson_requests').select('updated_at').eq('id', trialUser007).single(),
		) as { updated_at: string } | null;
		if (!beforeRow) throw new Error('expected row');

		const { data, error } = await db
			.from('trial_lesson_requests')
			.update({ status: 'confirmed' })
			.eq('id', trialUser007)
			.select();

		expectNoError(data, error);
		expect(data).toHaveLength(1);

		// Restore (status was already confirmed; just ensure we don't change other fields)
		unwrap(
			await db.from('trial_lesson_requests').update({ updated_at: beforeRow.updated_at }).eq('id', trialUser007),
		);
	});
});

describe('RLS: trial_lesson_requests DELETE - only privileged', () => {
	it('learner cannot delete own trial request', async () => {
		const db = await createClientAs(TestUsers.USER_004);
		const id = fixtures.requireTrialRequestId(TestUsers.USER_004, 'requested');
		const data = unwrap(await db.from('trial_lesson_requests').delete().eq('id', id).select());
		expect(data).toHaveLength(0);
	});

	it('teacher cannot delete trial request', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const id = fixtures.requireTrialRequestId(TestUsers.USER_005, 'proposed');
		const data = unwrap(await db.from('trial_lesson_requests').delete().eq('id', id).select());
		expect(data).toHaveLength(0);
	});

	it('admin can delete trial request (insert then delete for cleanup)', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const userId = fixtures.requireUserId(TestUsers.USER_009);

		const { data: inserted, error: insertError } = await db
			.from('trial_lesson_requests')
			.insert({ user_id: userId, lesson_type_id: lessonTypeId, status: 'requested' })
			.select()
			.single();

		expectNoError(inserted, insertError);

		const { data: deleted, error: deleteError } = await db
			.from('trial_lesson_requests')
			.delete()
			.eq('id', inserted.id)
			.select();

		expectNoError(deleted, deleteError);
		expect(deleted).toHaveLength(1);
	});
});

describe('RLS: trial_lesson_requests INSERT - own or privileged', () => {
	it('learner can insert own trial request (claim-like)', async () => {
		const db = await createClientAs(TestUsers.USER_009);
		const userId = fixtures.requireUserId(TestUsers.USER_009);

		const { data: inserted, error: insertError } = await db
			.from('trial_lesson_requests')
			.insert({ user_id: userId, lesson_type_id: lessonTypeId, status: 'requested' })
			.select()
			.single();

		expectNoError(inserted, insertError);
		expect(inserted.user_id).toBe(userId);
		expect(inserted.status).toBe('requested');

		// Cleanup: only privileged can delete
		const adminDb = await createClientAs(TestUsers.ADMIN_ONE);
		unwrap(await adminDb.from('trial_lesson_requests').delete().eq('id', inserted.id).select());
	});

	it('learner cannot insert trial request for another user', async () => {
		const db = await createClientAs(TestUsers.USER_004);
		const otherUserId = fixtures.requireUserId(TestUsers.USER_005);

		const { data, error } = await db
			.from('trial_lesson_requests')
			.insert({ user_id: otherUserId, lesson_type_id: lessonTypeId, status: 'requested' })
			.select();

		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});
});
