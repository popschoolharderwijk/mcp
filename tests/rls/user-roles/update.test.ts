import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
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

const { requireUserId } = fixtures;

const targetUserId = requireUserId(TestUsers.STAFF_ONE);
const siteAdminUserId = requireUserId(TestUsers.SITE_ADMIN);
const staffUserId = requireUserId(TestUsers.STAFF_ONE);
const adminUserId = requireUserId(TestUsers.ADMIN_ONE);

describe('RLS: user_roles UPDATE - other users', () => {
	it('user without role cannot update user roles', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'staff' }).eq('user_id', targetUserId).select()),
		).toHaveLength(0);
	});

	it('staff cannot update user roles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', targetUserId).select()),
		).toHaveLength(0);
	});

	it('admin can update other user roles (except site_admin)', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const data = unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', targetUserId).select());

		expect(data).toHaveLength(1);
		expect(data[0].role).toBe('admin');

		unwrap(await db.from('user_roles').update({ role: 'staff' }).eq('user_id', targetUserId).select());
	});

	it('admin cannot update site_admin roles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', siteAdminUserId).select()),
		).toHaveLength(0);
	});

	it('admin cannot promote user to site_admin', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		expectInsufficientPrivilege(
			unwrapError(
				await db.from('user_roles').update({ role: 'site_admin' }).eq('user_id', targetUserId).select(),
			),
		);
	});

	it('site_admin can update other user roles', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const data = unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', targetUserId).select());

		expect(data).toHaveLength(1);
		expect(data[0].role).toBe('admin');

		unwrap(await db.from('user_roles').update({ role: 'staff' }).eq('user_id', targetUserId).select());
	});
});

describe('RLS: user_roles UPDATE - own role', () => {
	it('user without role has no role to update', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const userId = requireUserId(TestUsers.STUDENT_001);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'staff' }).eq('user_id', userId).select()),
		).toHaveLength(0);
	});

	it('staff cannot update own role', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', staffUserId).select()),
		).toHaveLength(0);
	});

	it('admin cannot update own role', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'site_admin' }).eq('user_id', adminUserId).select()),
		).toHaveLength(0);
	});

	it('site_admin cannot demote themselves', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		expect(
			unwrap(await db.from('user_roles').update({ role: 'admin' }).eq('user_id', siteAdminUserId).select()),
		).toHaveLength(0);
	});
});
