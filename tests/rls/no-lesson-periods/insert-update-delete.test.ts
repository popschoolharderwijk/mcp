import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { formatDateToDb } from '../../../src/lib/date/date-format';
import { createClientAs } from '../../db';
import type { NoLessonPeriodInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
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
 * no_lesson_periods writes: admin OR site_admin only. Staff is privileged elsewhere but blocked here.
 */

const NEW_PERIOD: NoLessonPeriodInsert = {
	name: 'RLS testperiode',
	start_date: formatDateToDb(new Date(2030, 0, 1)),
	end_date: formatDateToDb(new Date(2030, 0, 7)),
};

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(unwrapError(await db.from('no_lesson_periods').insert(NEW_PERIOD).select()));
}

async function expectUpdateBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db
			.from('no_lesson_periods')
			.update({ name: 'Hacked' })
			.eq('id', NO_LESSON_PERIODS.CHRISTMAS_ID)
			.select('id'),
	);
	expect(data).toHaveLength(0);
}

async function expectDeleteBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db.from('no_lesson_periods').delete().eq('id', NO_LESSON_PERIODS.CHRISTMAS_ID).select('id'),
	);
	expect(data).toHaveLength(0);
}

async function expectFullLifecycle(user: TestUser) {
	const db = await createClientAs(user);

	const [inserted] = unwrap(await db.from('no_lesson_periods').insert(NEW_PERIOD).select('id, name'));
	const updated = unwrap(
		await db.from('no_lesson_periods').update({ name: 'RLS bijgewerkt' }).eq('id', inserted.id).select('name'),
	);
	const deleted = unwrap(await db.from('no_lesson_periods').delete().eq('id', inserted.id).select('id'));

	expect(inserted.name).toBe(NEW_PERIOD.name);
	expect(updated).toEqual([{ name: 'RLS bijgewerkt' }]);
	expect(deleted).toEqual([{ id: inserted.id }]);
}

describe('RLS: no_lesson_periods INSERT - blocked', () => {
	it('staff cannot insert a no-lesson period', async () => {
		await expectInsertBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot insert a no-lesson period', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot insert a no-lesson period', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot insert a no-lesson period', async () => {
		await expectInsertBlocked(TestUsers.USER_001);
	});
});

describe('RLS: no_lesson_periods UPDATE - blocked', () => {
	it('staff cannot update a no-lesson period', async () => {
		await expectUpdateBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot update a no-lesson period', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot update a no-lesson period', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot update a no-lesson period', async () => {
		await expectUpdateBlocked(TestUsers.USER_001);
	});
});

describe('RLS: no_lesson_periods DELETE - blocked', () => {
	it('staff cannot delete a no-lesson period', async () => {
		await expectDeleteBlocked(TestUsers.STAFF_ONE);
	});

	it('teacher cannot delete a no-lesson period', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot delete a no-lesson period', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot delete a no-lesson period', async () => {
		await expectDeleteBlocked(TestUsers.USER_001);
	});
});

describe('RLS: no_lesson_periods writes - admin and site_admin allowed', () => {
	it('admin can insert, update and delete a no-lesson period', async () => {
		await expectFullLifecycle(TestUsers.ADMIN_ONE);
	});

	it('site_admin can insert, update and delete a no-lesson period', async () => {
		await expectFullLifecycle(TestUsers.SITE_ADMIN);
	});
});
