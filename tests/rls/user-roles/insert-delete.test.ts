import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import type { UserRoleInsert } from '../../types';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

const { requireUserId } = fixtures;
const siteAdminUserId = requireUserId(TestUsers.SITE_ADMIN);

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * User roles INSERT/DELETE permissions:
 *
 * ADMINS:
 * - Can insert roles for users without a role (but NOT site_admin)
 * - Can delete roles (but NOT site_admin roles)
 *
 * SITE_ADMINS:
 * - Can insert any role
 * - Can delete any role
 *
 * All other roles (user, staff) cannot insert or delete roles.
 * Note: Teachers are identified by the teachers table, not by a role.
 */

describe('RLS: user_roles INSERT - blocked for non-admin roles', () => {
	const targetUserId = requireUserId(TestUsers.STUDENT_001);

	it('user without role cannot insert user_role', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'staff' };
		unwrapError(await db.from('user_roles').insert(newUserRole).select());
	});

	it('staff cannot insert user_role', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'staff' };
		unwrapError(await db.from('user_roles').insert(newUserRole).select());
	});
});

describe('RLS: user_roles INSERT - admin permissions', () => {
	const targetUserId = requireUserId(TestUsers.STUDENT_002);

	it('admin can insert user_role (non-site_admin)', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		// STUDENT_B should not have a role in seed data
		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'staff' };
		const data = unwrap(await db.from('user_roles').insert(newUserRole).select());

		expect(data).toHaveLength(1);
		expect(data[0].role).toBe('staff');

		unwrap(await db.from('user_roles').delete().eq('user_id', targetUserId).select());
	});

	it('admin cannot insert site_admin role', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'site_admin' };
		unwrapError(await db.from('user_roles').insert(newUserRole).select());
	});

	it('site_admin can insert any role including site_admin', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		// STUDENT_B should not have a role in seed data
		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'admin' };
		const data = unwrap(await db.from('user_roles').insert(newUserRole).select());

		expect(data).toHaveLength(1);
		expect(data[0].role).toBe('admin');

		unwrap(await db.from('user_roles').delete().eq('user_id', targetUserId).select());
	});
});

describe('RLS: user_roles DELETE - blocked for non-admin roles', () => {
	it('user without role cannot delete roles', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const userId = requireUserId(TestUsers.STAFF_ONE);

		expect(unwrap(await db.from('user_roles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});

	it('staff cannot delete roles', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const userId = requireUserId(TestUsers.ADMIN_ONE);

		expect(unwrap(await db.from('user_roles').delete().eq('user_id', userId).select())).toHaveLength(0);
	});
});

describe('RLS: user_roles DELETE - admin permissions', () => {
	const targetUserId = requireUserId(TestUsers.STUDENT_003);

	it('admin can delete non-site_admin roles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);
		const siteAdminDb = await createClientAs(TestUsers.SITE_ADMIN);

		// Setup: create a role to delete (STUDENT_C should not have a role in seed)
		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'staff' };
		unwrap(await siteAdminDb.from('user_roles').insert(newUserRole).select());

		const data = unwrap(await db.from('user_roles').delete().eq('user_id', targetUserId).select());

		expect(data).toHaveLength(1);
	});

	it('admin cannot delete site_admin roles', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		expect(unwrap(await db.from('user_roles').delete().eq('user_id', siteAdminUserId).select())).toHaveLength(0);
	});

	it('site_admin can delete any role', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		// Setup: create a role to delete (STUDENT_C should not have a role in seed)
		const newUserRole: UserRoleInsert = { user_id: targetUserId, role: 'staff' };
		unwrap(await db.from('user_roles').insert(newUserRole).select());

		const data = unwrap(await db.from('user_roles').delete().eq('user_id', targetUserId).select());

		expect(data).toHaveLength(1);
	});
});
