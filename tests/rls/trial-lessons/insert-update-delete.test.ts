/**
 * RLS tests for trial_lessons INSERT/UPDATE/DELETE policies.
 * Only is_privileged() (staff/admin/site_admin) may write.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { TrialLessonInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

const dbNoRLS = createClientBypassRLS();
const lessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

const studentUserId = fixtures.requireUserId(TestUsers.STUDENT_009);
const teacherUserId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);

function makeInsert(): TrialLessonInsert {
	return {
		student_user_id: studentUserId,
		teacher_user_id: teacherUserId,
		lesson_type_id: lessonTypeId,
		scheduled_date: '2030-02-15',
		scheduled_start_time: '15:00:00',
		duration_minutes: 30,
		status: 'scheduled',
	};
}

const seededIds: string[] = [];

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	unwrap(await dbNoRLS.from('trial_lessons').delete().in('id', seededIds).select('id'));
	await verifyState(initialState);
});

async function seedTrial(): Promise<string> {
	const [created] = unwrap(await dbNoRLS.from('trial_lessons').insert(makeInsert()).select('id'));
	seededIds.push(created.id);
	return created.id;
}

describe('trial_lessons INSERT RLS', () => {
	it('staff can insert', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const [row] = unwrap(await db.from('trial_lessons').insert(makeInsert()).select('id'));
		seededIds.push(row.id);
		expect(row.id).toBeTruthy();
	});

	it('teacher cannot insert', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		expectInsufficientPrivilege(unwrapError(await db.from('trial_lessons').insert(makeInsert()).select('id')));
	});

	it('student cannot insert', async () => {
		const db = await createClientAs(TestUsers.STUDENT_009);
		expectInsufficientPrivilege(unwrapError(await db.from('trial_lessons').insert(makeInsert()).select('id')));
	});
});

describe('trial_lessons UPDATE RLS', () => {
	it('teacher cannot update their own assigned trial', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		expect(unwrap(await db.from('trial_lessons').update({ notes: 'x' }).eq('id', id).select('id'))).toHaveLength(0);
		expect(
			unwrapSingleRow(await dbNoRLS.from('trial_lessons').select('notes').eq('id', id).single()).notes,
		).toBeNull();
	});

	it('student cannot update their own trial', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.STUDENT_009);
		expect(unwrap(await db.from('trial_lessons').update({ notes: 'x' }).eq('id', id).select('id'))).toHaveLength(0);
		expect(
			unwrapSingleRow(await dbNoRLS.from('trial_lessons').select('notes').eq('id', id).single()).notes,
		).toBeNull();
	});

	it('admin can update', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		unwrap(await db.from('trial_lessons').update({ notes: 'updated' }).eq('id', id).select('id'));
		expect(unwrapSingleRow(await dbNoRLS.from('trial_lessons').select('notes').eq('id', id).single()).notes).toBe(
			'updated',
		);
	});
});

describe('trial_lessons DELETE RLS', () => {
	it('teacher cannot delete their own assigned trial', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		expect(unwrap(await db.from('trial_lessons').delete().eq('id', id).select('id'))).toHaveLength(0);
		expect(unwrap(await dbNoRLS.from('trial_lessons').select('id').eq('id', id))).toEqual([{ id }]);
	});

	it('student cannot delete their own trial', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.STUDENT_009);
		expect(unwrap(await db.from('trial_lessons').delete().eq('id', id).select('id'))).toHaveLength(0);
		expect(unwrap(await dbNoRLS.from('trial_lessons').select('id').eq('id', id))).toEqual([{ id }]);
	});

	it('admin can delete', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		expect(unwrap(await db.from('trial_lessons').delete().eq('id', id).select('id'))).toEqual([{ id }]);
		expect(unwrap(await dbNoRLS.from('trial_lessons').select('id').eq('id', id))).toHaveLength(0);
	});

	it('staff can delete', async () => {
		const id = await seedTrial();
		const db = await createClientAs(TestUsers.STAFF_ONE);
		expect(unwrap(await db.from('trial_lessons').delete().eq('id', id).select('id'))).toEqual([{ id }]);
		expect(unwrap(await dbNoRLS.from('trial_lessons').select('id').eq('id', id))).toHaveLength(0);
	});
});
