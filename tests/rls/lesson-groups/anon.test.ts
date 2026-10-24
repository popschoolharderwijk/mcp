import { afterAll, beforeAll, describe, it } from 'bun:test';
import { formatDateToDb } from '../../../src/lib/date/date-format';
import { createClientAnon } from '../../db';
import type { LessonGroupInsert, LessonGroupMemberInsert } from '../../types';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_GROUPS } from '../seed-data-constants';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const ANON_GROUP: LessonGroupInsert = {
	name: 'Anon probe',
	lesson_type_id: fixtures.requireLessonTypeId('Bandcoaching'),
	teacher_user_id: fixtures.requireTeacherId(TestUsers.TEACHER_EVE),
	duration_minutes: 60,
	frequency: 'weekly',
	day_of_week: 4,
	start_time: '14:00',
	start_date: formatDateToDb(new Date(2030, 0, 10)),
};

const ANON_MEMBER: LessonGroupMemberInsert = {
	lesson_group_id: LESSON_GROUPS.BANDCOACHING_ID,
	student_user_id: fixtures.requireUserId(TestUsers.STUDENT_009),
};

describe('RLS: lesson_groups anon', () => {
	it('anon select on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_groups').select('id')));
	});

	it('anon insert on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_groups').insert(ANON_GROUP).select()));
	});

	it('anon update on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('lesson_groups')
					.update({ name: 'Anon' })
					.eq('id', LESSON_GROUPS.BANDCOACHING_ID)
					.select(),
			),
		);
	});

	it('anon delete on lesson_groups is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('lesson_groups').delete().eq('id', LESSON_GROUPS.BANDCOACHING_ID).select()),
		);
	});
});

describe('RLS: lesson_group_members anon', () => {
	it('anon select on lesson_group_members is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_group_members').select('id')));
	});

	it('anon insert on lesson_group_members is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_group_members').insert(ANON_MEMBER).select()));
	});

	it('anon delete on lesson_group_members is privilege-denied', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('lesson_group_members')
					.delete()
					.eq('lesson_group_id', LESSON_GROUPS.BANDCOACHING_ID)
					.select(),
			),
		);
	});
});
