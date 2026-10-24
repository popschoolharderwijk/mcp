import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import type { AnnouncementInsert } from '../../types';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { ANNOUNCEMENTS } from '../seed-data-constants';
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
 * announcements writes: privileged (staff/admin/site_admin) only, via one FOR ALL policy.
 */

const NEW_ANNOUNCEMENT: AnnouncementInsert = {
	title: 'RLS testbericht',
	body: 'Inhoud',
	audience: ['students'],
};

async function expectInsertBlocked(user: TestUser) {
	const db = await createClientAs(user);
	expectInsufficientPrivilege(unwrapError(await db.from('announcements').insert(NEW_ANNOUNCEMENT).select()));
}

async function expectUpdateBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(
		await db.from('announcements').update({ title: 'Hacked' }).eq('id', ANNOUNCEMENTS.PUBLISHED_ID).select('id'),
	);
	expect(data).toHaveLength(0);
}

async function expectDeleteBlocked(user: TestUser) {
	const db = await createClientAs(user);
	const data = unwrap(await db.from('announcements').delete().eq('id', ANNOUNCEMENTS.PUBLISHED_ID).select('id'));
	expect(data).toHaveLength(0);
}

async function expectFullLifecycle(user: TestUser) {
	const actorId = fixtures.requireUserId(user);
	const db = await createClientAs(user);

	const [inserted] = unwrap(await db.from('announcements').insert(NEW_ANNOUNCEMENT).select('id, title, created_by'));
	const updated = unwrap(
		await db.from('announcements').update({ title: 'RLS bijgewerkt' }).eq('id', inserted.id).select('title'),
	);
	const deleted = unwrap(await db.from('announcements').delete().eq('id', inserted.id).select('id'));

	expect(inserted.title).toBe(NEW_ANNOUNCEMENT.title);
	expect(inserted.created_by).toBe(actorId);
	expect(updated).toEqual([{ title: 'RLS bijgewerkt' }]);
	expect(deleted).toEqual([{ id: inserted.id }]);
}

describe('RLS: announcements INSERT - blocked', () => {
	it('teacher cannot insert an announcement', async () => {
		await expectInsertBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot insert an announcement', async () => {
		await expectInsertBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot insert an announcement', async () => {
		await expectInsertBlocked(TestUsers.USER_001);
	});
});

describe('RLS: announcements UPDATE - blocked', () => {
	it('teacher cannot update an announcement', async () => {
		await expectUpdateBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot update an announcement', async () => {
		await expectUpdateBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot update an announcement', async () => {
		await expectUpdateBlocked(TestUsers.USER_001);
	});
});

describe('RLS: announcements DELETE - blocked', () => {
	it('teacher cannot delete an announcement', async () => {
		await expectDeleteBlocked(TestUsers.TEACHER_ALICE);
	});

	it('student cannot delete an announcement', async () => {
		await expectDeleteBlocked(TestUsers.STUDENT_001);
	});

	it('user without role cannot delete an announcement', async () => {
		await expectDeleteBlocked(TestUsers.USER_001);
	});
});

describe('RLS: announcements writes - privileged allowed', () => {
	it('staff can insert, update and delete an announcement', async () => {
		await expectFullLifecycle(TestUsers.STAFF_ONE);
	});

	it('admin can insert, update and delete an announcement', async () => {
		await expectFullLifecycle(TestUsers.ADMIN_ONE);
	});

	it('site_admin can insert, update and delete an announcement', async () => {
		await expectFullLifecycle(TestUsers.SITE_ADMIN);
	});
});
