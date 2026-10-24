import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { TeacherInsert } from '../../types';
import { unwrap, unwrapError, unwrapSingleRow } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { type TestUser, TestUsers } from '../test-users';

/**
 * Teachers INSERT/UPDATE/DELETE permissions:
 *
 * ADMINS and SITE_ADMINS:
 * - Can insert teachers
 * - Can update any teacher
 * - Can delete teachers
 *
 * TEACHERS:
 * - Can update their own teacher record (especially for bio)
 *
 * All other roles (staff, user without role) cannot insert, update, or delete teachers.
 * Note: Teachers are identified by the teachers table, not by a role.
 */

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();
const dbNoRLS = createClientBypassRLS();

const studentBUserId = fixtures.requireUserId(TestUsers.STUDENT_002);
const studentCUserId = fixtures.requireUserId(TestUsers.STUDENT_003);
const studentDUserId = fixtures.requireUserId(TestUsers.STUDENT_004);
const bobTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);
const aliceTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	unwrapError(
		await db
			.from('teachers')
			.insert({ user_id: studentBUserId } satisfies TeacherInsert)
			.select(),
	);
}

async function expectUpdateBlocked(user: TestUser, targetTeacherUserId: string) {
	const db = await createClientAs(user);
	expect(
		unwrap(
			await db
				.from('teachers')
				.update({ bio: 'Hacked bio' })
				.eq('user_id', targetTeacherUserId)
				.select('user_id'),
		),
	).toHaveLength(0);
}

async function expectDeleteBlocked(user: TestUser, targetTeacherUserId: string) {
	const db = await createClientAs(user);
	expect(
		unwrap(await db.from('teachers').delete().eq('user_id', targetTeacherUserId).select('user_id')),
	).toHaveLength(0);
}

async function expectAdminCanUpdateBioAndRestore(user: TestUser) {
	const db = await createClientAs(user);
	const original = unwrapSingleRow(
		await db.from('teachers').select('user_id, bio').eq('user_id', bobTeacherUserId).single(),
	);

	const updated = unwrap(
		await db.from('teachers').update({ bio: 'Admin updated bio' }).eq('user_id', bobTeacherUserId).select('bio'),
	);
	expect(updated).toEqual([{ bio: 'Admin updated bio' }]);

	unwrap(await db.from('teachers').update({ bio: original.bio }).eq('user_id', bobTeacherUserId).select('bio'));
}

async function expectAdminCanInsertAndDelete(user: TestUser, newTeacherUserId: string) {
	const db = await createClientAs(user);
	const inserted = unwrap(
		await db
			.from('teachers')
			.insert({ user_id: newTeacherUserId } satisfies TeacherInsert)
			.select('user_id'),
	);
	expect(inserted).toEqual([{ user_id: newTeacherUserId }]);

	const deleted = unwrap(await db.from('teachers').delete().eq('user_id', newTeacherUserId).select('user_id'));
	expect(deleted).toEqual([{ user_id: newTeacherUserId }]);
}

describe('RLS: teachers INSERT - blocked for non-admin roles', () => {
	it('user without role cannot insert teacher', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('teacher cannot insert teacher', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('staff cannot insert teacher', async () => {
		await expectInsertBlocked(TestUsers.STAFF_ONE);
	});
});

describe('RLS: teachers INSERT - admin permissions', () => {
	it('admin can insert teacher', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const inserted = unwrap(
			await db
				.from('teachers')
				.insert({ user_id: studentCUserId } satisfies TeacherInsert)
				.select('user_id'),
		);
		expect(inserted).toEqual([{ user_id: studentCUserId }]);
		unwrap(await dbNoRLS.from('teachers').delete().eq('user_id', studentCUserId).select('user_id'));
	});

	it('site_admin can insert teacher', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);
		const inserted = unwrap(
			await db
				.from('teachers')
				.insert({ user_id: studentCUserId } satisfies TeacherInsert)
				.select('user_id'),
		);
		expect(inserted).toEqual([{ user_id: studentCUserId }]);
		unwrap(await dbNoRLS.from('teachers').delete().eq('user_id', studentCUserId).select('user_id'));
	});
});

describe('RLS: teachers UPDATE - blocked for non-admin roles', () => {
	it('user without role cannot update teacher', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001, bobTeacherUserId);
	});

	it('teacher cannot update other teachers', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE, bobTeacherUserId);
	});

	it('staff cannot update teacher', async () => {
		await expectUpdateBlocked(TestUsers.STAFF_ONE, bobTeacherUserId);
	});
});

describe('RLS: teachers UPDATE - teacher own record', () => {
	it('teacher can update own teacher record (bio)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);
		const original = unwrapSingleRow(
			await db.from('teachers').select('bio').eq('user_id', aliceTeacherUserId).single(),
		);

		const updated = unwrap(
			await db
				.from('teachers')
				.update({ bio: 'Updated bio by teacher' })
				.eq('user_id', aliceTeacherUserId)
				.select('bio'),
		);
		expect(updated).toEqual([{ bio: 'Updated bio by teacher' }]);

		unwrap(await db.from('teachers').update({ bio: original.bio }).eq('user_id', aliceTeacherUserId).select('bio'));
	});

	it('teacher cannot update other teachers records', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE, bobTeacherUserId);
	});
});

describe('RLS: teachers UPDATE - admin permissions', () => {
	it('admin can update teacher bio and restore it', async () => {
		await expectAdminCanUpdateBioAndRestore(TestUsers.ADMIN_ONE);
	});

	it('site_admin can update teacher bio and restore it', async () => {
		await expectAdminCanUpdateBioAndRestore(TestUsers.SITE_ADMIN);
	});
});

describe('RLS: teachers DELETE - blocked for non-admin roles', () => {
	it('user without role cannot delete teacher', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001, bobTeacherUserId);
	});

	it('teacher cannot delete teacher', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE, bobTeacherUserId);
	});

	it('staff cannot delete teacher', async () => {
		await expectDeleteBlocked(TestUsers.STAFF_ONE, bobTeacherUserId);
	});
});

describe('RLS: teachers DELETE - admin permissions', () => {
	it('admin can delete teacher', async () => {
		await expectAdminCanInsertAndDelete(TestUsers.ADMIN_ONE, studentDUserId);
	});

	it('site_admin can delete teacher', async () => {
		await expectAdminCanInsertAndDelete(TestUsers.SITE_ADMIN, studentDUserId);
	});
});
