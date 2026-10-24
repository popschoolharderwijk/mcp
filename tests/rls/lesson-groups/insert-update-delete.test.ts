import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { addDaysFromNow, formatDateToDb } from '../../../src/lib/date/date-format';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { LessonGroupInsert, LessonGroupMemberInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
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
 * lesson_groups / lesson_group_members writes: privileged (staff/admin/site_admin) only.
 * The group's own teacher and its members are blocked too.
 *
 * Inserting a member fires trg_sync_group_member_to_agreement, which creates a lesson agreement
 * (and its agenda events). Member write tests run on a temporary group whose agreements are
 * removed afterwards; deleting an agreement cascades its agenda events.
 */

const dbNoRLS = createClientBypassRLS();
const STUDENT_001_ID = fixtures.requireUserId(TestUsers.STUDENT_001);
const OUTSIDER_STUDENT_ID = fixtures.requireUserId(TestUsers.STUDENT_009);

/** Thursday 14:00 within Eve's availability; dates far in the future so no seed overlap. */
const TEMP_GROUP: LessonGroupInsert = {
	name: 'RLS testgroep',
	lesson_type_id: fixtures.requireLessonTypeId('Bandcoaching'),
	teacher_user_id: fixtures.requireTeacherId(TestUsers.TEACHER_EVE),
	duration_minutes: 60,
	frequency: 'weekly',
	day_of_week: 4,
	start_time: '14:00',
	start_date: formatDateToDb(new Date(2030, 0, 10)),
};

/**
 * Removing a member closes the synced agreement with end_date = CURRENT_DATE,
 * so the join date must lie in the past for the delete to satisfy lesson_agreements_end_date_check.
 */
const MEMBER_JOINED_DATE = formatDateToDb(addDaysFromNow(-14));
const MEMBER_UPDATED_JOINED_DATE = formatDateToDb(addDaysFromNow(-7));

const NON_PRIVILEGED_USERS: TestUser[] = [
	TestUsers.TEACHER_EVE,
	TestUsers.TEACHER_ALICE,
	TestUsers.STUDENT_001,
	TestUsers.USER_001,
];

const PRIVILEGED_USERS: TestUser[] = [TestUsers.STAFF_ONE, TestUsers.ADMIN_ONE, TestUsers.SITE_ADMIN];

async function removeTempGroup(groupId: string) {
	unwrap(await dbNoRLS.from('lesson_agreements').delete().eq('lesson_group_id', groupId).select('id'));
	unwrap(await dbNoRLS.from('lesson_groups').delete().eq('id', groupId).select('id'));
}

describe('RLS: lesson_groups writes - blocked for non-privileged', () => {
	for (const user of NON_PRIVILEGED_USERS) {
		it(`${user} cannot insert a lesson group`, async () => {
			const db = await createClientAs(user);
			expectInsufficientPrivilege(unwrapError(await db.from('lesson_groups').insert(TEMP_GROUP).select()));
		});

		it(`${user} cannot update the seeded lesson group`, async () => {
			const db = await createClientAs(user);
			const data = unwrap(
				await db
					.from('lesson_groups')
					.update({ name: 'Hacked' })
					.eq('id', LESSON_GROUPS.BANDCOACHING_ID)
					.select('id'),
			);
			expect(data).toHaveLength(0);
		});

		it(`${user} cannot delete the seeded lesson group`, async () => {
			const db = await createClientAs(user);
			const data = unwrap(
				await db.from('lesson_groups').delete().eq('id', LESSON_GROUPS.BANDCOACHING_ID).select('id'),
			);
			expect(data).toHaveLength(0);
		});
	}
});

describe('RLS: lesson_group_members writes - blocked for non-privileged', () => {
	const outsiderMember: LessonGroupMemberInsert = {
		lesson_group_id: LESSON_GROUPS.BANDCOACHING_ID,
		student_user_id: OUTSIDER_STUDENT_ID,
	};

	for (const user of NON_PRIVILEGED_USERS) {
		it(`${user} cannot add a member to the seeded group`, async () => {
			const db = await createClientAs(user);
			expectInsufficientPrivilege(
				unwrapError(await db.from('lesson_group_members').insert(outsiderMember).select()),
			);
		});

		it(`${user} cannot update a seeded membership`, async () => {
			const db = await createClientAs(user);
			const data = unwrap(
				await db
					.from('lesson_group_members')
					.update({ left_date: formatDateToDb(new Date(2030, 0, 1)) })
					.eq('lesson_group_id', LESSON_GROUPS.BANDCOACHING_ID)
					.eq('student_user_id', STUDENT_001_ID)
					.select('id'),
			);
			expect(data).toHaveLength(0);
		});

		it(`${user} cannot delete a seeded membership`, async () => {
			const db = await createClientAs(user);
			const data = unwrap(
				await db
					.from('lesson_group_members')
					.delete()
					.eq('lesson_group_id', LESSON_GROUPS.BANDCOACHING_ID)
					.eq('student_user_id', STUDENT_001_ID)
					.select('id'),
			);
			expect(data).toHaveLength(0);
		});
	}
});

describe('RLS: lesson_groups writes - privileged allowed', () => {
	for (const user of PRIVILEGED_USERS) {
		it(`${user} can insert, update and delete a lesson group`, async () => {
			const db = await createClientAs(user);
			const [inserted] = unwrap(await db.from('lesson_groups').insert(TEMP_GROUP).select('id, name'));
			try {
				const updated = unwrap(
					await db
						.from('lesson_groups')
						.update({ name: 'RLS bijgewerkt' })
						.eq('id', inserted.id)
						.select('name'),
				);
				const deleted = unwrap(await db.from('lesson_groups').delete().eq('id', inserted.id).select('id'));

				expect(inserted.name).toBe(TEMP_GROUP.name);
				expect(updated).toEqual([{ name: 'RLS bijgewerkt' }]);
				expect(deleted).toEqual([{ id: inserted.id }]);
			} finally {
				await removeTempGroup(inserted.id);
			}
		});
	}
});

describe('RLS: lesson_group_members writes - privileged allowed', () => {
	for (const user of PRIVILEGED_USERS) {
		it(`${user} can add, update and remove a group member`, async () => {
			const db = await createClientAs(user);
			const [group] = unwrap(await db.from('lesson_groups').insert(TEMP_GROUP).select('id'));
			try {
				const member: LessonGroupMemberInsert = {
					lesson_group_id: group.id,
					student_user_id: OUTSIDER_STUDENT_ID,
					joined_date: MEMBER_JOINED_DATE,
				};
				const inserted = unwrap(await db.from('lesson_group_members').insert(member).select('student_user_id'));
				const updated = unwrap(
					await db
						.from('lesson_group_members')
						.update({ joined_date: MEMBER_UPDATED_JOINED_DATE })
						.eq('lesson_group_id', group.id)
						.select('joined_date'),
				);
				const deleted = unwrap(
					await db
						.from('lesson_group_members')
						.delete()
						.eq('lesson_group_id', group.id)
						.select('student_user_id'),
				);

				expect(inserted).toEqual([{ student_user_id: OUTSIDER_STUDENT_ID }]);
				expect(updated).toEqual([{ joined_date: MEMBER_UPDATED_JOINED_DATE }]);
				expect(deleted).toEqual([{ student_user_id: OUTSIDER_STUDENT_ID }]);
			} finally {
				await removeTempGroup(group.id);
			}
		});
	}
});
