import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { addDaysFromNow, formatDateToDb } from '../../../src/lib/date/date-format';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { LessonGroupInsert, LessonGroupMemberInsert } from '../../types';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_GROUPS } from '../seed-data-constants';
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
 * lesson_groups SELECT: privileged, the group's teacher, or a current group member.
 * lesson_group_members SELECT: privileged, the group's teacher, or the member's own row.
 * Seed: one Bandcoaching group taught by Eve with students 001-008.
 *
 * Security contracts:
 * - get_lesson_group_teacher must not be callable by authenticated (teacher UUID leak).
 * - Members with left_date in the past must not keep SELECT on the group.
 */

const dbNoRLS = createClientBypassRLS();
const OUTSIDER_STUDENT_ID = fixtures.requireUserId(TestUsers.STUDENT_009);
const TEACHER_EVE_ID = fixtures.requireTeacherId(TestUsers.TEACHER_EVE);

/** Thursday 14:00 within Eve's availability; dates far in the future so no seed overlap. */
const TEMP_GROUP: LessonGroupInsert = {
	name: 'RLS former-member group',
	lesson_type_id: fixtures.requireLessonTypeId('Bandcoaching'),
	teacher_user_id: TEACHER_EVE_ID,
	duration_minutes: 60,
	frequency: 'weekly',
	day_of_week: 4,
	start_time: '14:00',
	start_date: formatDateToDb(new Date(2030, 0, 10)),
};

const MEMBER_JOINED_DATE = formatDateToDb(addDaysFromNow(-14));
const MEMBER_LEFT_DATE = formatDateToDb(addDaysFromNow(-1));

async function selectGroupIds(user: TestUser) {
	const db = await createClientAs(user);
	return unwrap(await db.from('lesson_groups').select('id')).map((row) => row.id);
}

async function selectMemberStudentIds(user: TestUser) {
	const db = await createClientAs(user);
	return unwrap(await db.from('lesson_group_members').select('student_user_id').order('student_user_id')).map(
		(row) => row.student_user_id,
	);
}

async function removeTempGroup(groupId: string) {
	unwrap(await dbNoRLS.from('lesson_agreements').delete().eq('lesson_group_id', groupId).select('id'));
	unwrap(await dbNoRLS.from('lesson_groups').delete().eq('id', groupId).select('id'));
}

const BANDCOACHING_MEMBER_IDS = [
	TestUsers.STUDENT_001,
	TestUsers.STUDENT_002,
	TestUsers.STUDENT_003,
	TestUsers.STUDENT_004,
	TestUsers.STUDENT_005,
	TestUsers.STUDENT_006,
	TestUsers.STUDENT_007,
	TestUsers.STUDENT_008,
]
	.map((user) => fixtures.requireUserId(user))
	.sort();

async function expectSeesGroupAndAllMembers(user: TestUser) {
	expect(await selectGroupIds(user)).toEqual([LESSON_GROUPS.BANDCOACHING_ID]);
	expect(await selectMemberStudentIds(user)).toEqual(BANDCOACHING_MEMBER_IDS);
}

async function expectSeesNothing(user: TestUser) {
	expect(await selectGroupIds(user)).toHaveLength(0);
	expect(await selectMemberStudentIds(user)).toHaveLength(0);
}

describe('RLS: lesson_groups + members SELECT - privileged', () => {
	it('site_admin sees the group and all members', async () => {
		await expectSeesGroupAndAllMembers(TestUsers.SITE_ADMIN);
	});

	it('admin sees the group and all members', async () => {
		await expectSeesGroupAndAllMembers(TestUsers.ADMIN_ONE);
	});

	it('staff sees the group and all members', async () => {
		await expectSeesGroupAndAllMembers(TestUsers.STAFF_ONE);
	});
});

describe('RLS: lesson_groups + members SELECT - teacher', () => {
	it('group teacher sees the group and all members', async () => {
		await expectSeesGroupAndAllMembers(TestUsers.TEACHER_EVE);
	});

	it('other teacher sees no groups or members', async () => {
		await expectSeesNothing(TestUsers.TEACHER_ALICE);
	});
});

describe('RLS: lesson_groups + members SELECT - student', () => {
	it('group member sees the group but only their own membership', async () => {
		expect(await selectGroupIds(TestUsers.STUDENT_001)).toEqual([LESSON_GROUPS.BANDCOACHING_ID]);
		expect(await selectMemberStudentIds(TestUsers.STUDENT_001)).toEqual([
			fixtures.requireUserId(TestUsers.STUDENT_001),
		]);
	});

	it('student outside the group sees no groups or members', async () => {
		await expectSeesNothing(TestUsers.STUDENT_009);
	});

	it('user without role sees no groups or members', async () => {
		await expectSeesNothing(TestUsers.USER_001);
	});

	it('former group member cannot see the group after left_date', async () => {
		const [group] = unwrap(await dbNoRLS.from('lesson_groups').insert(TEMP_GROUP).select('id'));
		try {
			const member: LessonGroupMemberInsert = {
				lesson_group_id: group.id,
				student_user_id: OUTSIDER_STUDENT_ID,
				joined_date: MEMBER_JOINED_DATE,
			};
			unwrap(await dbNoRLS.from('lesson_group_members').insert(member).select('id'));
			unwrap(
				await dbNoRLS
					.from('lesson_group_members')
					.update({ left_date: MEMBER_LEFT_DATE })
					.eq('lesson_group_id', group.id)
					.eq('student_user_id', OUTSIDER_STUDENT_ID)
					.select('id'),
			);

			const formerMemberDb = await createClientAs(TestUsers.STUDENT_009);
			const visibleGroups = unwrap(await formerMemberDb.from('lesson_groups').select('id').eq('id', group.id));
			expect(visibleGroups).toHaveLength(0);
		} finally {
			await removeTempGroup(group.id);
		}
	});
});

describe('RLS: get_lesson_group_teacher must not leak teacher ownership', () => {
	it('authenticated has no EXECUTE on get_lesson_group_teacher', async () => {
		expect(
			unwrap(
				await dbNoRLS.rpc('authenticated_has_execute_on', {
					p_regprocedure: 'public.get_lesson_group_teacher(uuid)',
				}),
			),
		).toBe(false);
	});

	it('signed-in outsider cannot resolve a group teacher via RPC', async () => {
		const db = await createClientAs(TestUsers.USER_001);
		const result = await db.rpc(
			'get_lesson_group_teacher' as 'is_lesson_group_member',
			{
				_group_id: LESSON_GROUPS.BANDCOACHING_ID,
			} as never,
		);
		expect(result.data).toBeNull();
		expect(result.error).not.toBeNull();
	});
});
