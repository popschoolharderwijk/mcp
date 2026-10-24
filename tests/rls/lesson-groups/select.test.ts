import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
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
 * lesson_groups SELECT: privileged, the group's teacher, or a group member.
 * lesson_group_members SELECT: privileged, the group's teacher, or the member's own row.
 * Seed: one Bandcoaching group taught by Eve with students 001-008.
 */

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
});
