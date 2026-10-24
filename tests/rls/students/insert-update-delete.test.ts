import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { StudentInsert } from '../../types';
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

const dbNoRLS = createClientBypassRLS();

// User IDs from fixtures for insert tests
const studentBUserId = fixtures.requireUserId(TestUsers.STUDENT_002);
const studentCUserId = fixtures.requireUserId(TestUsers.STUDENT_003);
// USER_003 for RPC tests - isolated from automatic-management (USER_002) and user-without-role (USER_010)
const rpcTestUserId = fixtures.requireUserId(TestUsers.USER_003);

// Fixed student ID for UPDATE/DELETE block tests (must exist in seed)
const testStudentUserId = fixtures.requireStudentId(TestUsers.STUDENT_001);

/**
 * Students INSERT/UPDATE/DELETE permissions:
 *
 * INSERT/DELETE:
 * - NO ONE can insert or delete students (blocked for all roles)
 * - Students are automatically created/deleted via triggers on lesson_agreements
 *
 * UPDATE:
 * - ADMINS and SITE_ADMINS can update students (for future fields)
 * - All other roles cannot update students
 *
 * Note: Teachers are identified by the teachers table, not by a role.
 */
describe('RLS: students INSERT - blocked for all roles', () => {
	const newStudent: StudentInsert = { user_id: studentBUserId };

	it('user without role cannot insert student', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('students').insert(newStudent).select());
	});

	it('teacher cannot insert student', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		unwrapError(await db.from('students').insert(newStudent).select());
	});

	it('staff cannot insert student', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		unwrapError(await db.from('students').insert(newStudent).select());
	});

	it('admin cannot insert student', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		// STUDENT_C should not be a student in seed data (or if it is, the insert should still fail)
		const newStudent: StudentInsert = { user_id: studentCUserId };
		unwrapError(await db.from('students').insert(newStudent).select());
	});

	it('site_admin cannot insert student', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		// STUDENT_C should not be a student in seed data (or if it is, the insert should still fail)
		const newStudent: StudentInsert = { user_id: studentCUserId };
		unwrapError(await db.from('students').insert(newStudent).select());
	});
});

describe('RLS: students UPDATE - blocked for non-admin roles', () => {
	it('user without role cannot update student', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		expect(
			unwrap(
				await db
					.from('students')
					.update({ updated_at: new Date().toISOString() })
					.eq('user_id', testStudentUserId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('teacher cannot update student', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		expect(
			unwrap(
				await db
					.from('students')
					.update({ updated_at: new Date().toISOString() })
					.eq('user_id', testStudentUserId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('staff cannot update student', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(
			unwrap(
				await db
					.from('students')
					.update({ updated_at: new Date().toISOString() })
					.eq('user_id', testStudentUserId)
					.select(),
			),
		).toHaveLength(0);
	});
});

describe('RLS: students UPDATE - admin permissions', () => {
	it('admin can update student', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const data = unwrap(
			await db
				.from('students')
				.update({ updated_at: new Date().toISOString() })
				.eq('user_id', testStudentUserId)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].user_id).toBe(testStudentUserId);
	});

	it('site_admin can update student', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const data = unwrap(
			await db
				.from('students')
				.update({ updated_at: new Date().toISOString() })
				.eq('user_id', testStudentUserId)
				.select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].user_id).toBe(testStudentUserId);
	});
});

describe('RLS: students DELETE - blocked for all roles', () => {
	it('user without role cannot delete student', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		expect(unwrap(await db.from('students').delete().eq('user_id', testStudentUserId).select())).toHaveLength(0);
	});

	it('teacher cannot delete student', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		expect(unwrap(await db.from('students').delete().eq('user_id', testStudentUserId).select())).toHaveLength(0);
	});

	it('staff cannot delete student', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(unwrap(await db.from('students').delete().eq('user_id', testStudentUserId).select())).toHaveLength(0);
	});

	it('admin cannot delete student', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		expect(unwrap(await db.from('students').delete().eq('user_id', testStudentUserId).select())).toHaveLength(0);
	});

	it('site_admin cannot delete student', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		expect(unwrap(await db.from('students').delete().eq('user_id', testStudentUserId).select())).toHaveLength(0);
	});
});

describe('RLS: students INSERT/DELETE via RPC - service_role only (trigger helpers)', () => {
	it('service_role can create student via ensure_student_exists', async () => {
		expect(unwrap(await dbNoRLS.from('students').select('user_id').eq('user_id', rpcTestUserId))).toHaveLength(0);

		unwrap(await dbNoRLS.rpc('ensure_student_exists', { _user_id: rpcTestUserId }));

		expect(unwrap(await dbNoRLS.from('students').select('user_id').eq('user_id', rpcTestUserId))).toHaveLength(1);

		unwrap(await dbNoRLS.from('students').delete().eq('user_id', rpcTestUserId).select('user_id'));
	});

	it('service_role can delete student via cleanup_student_if_no_agreements when no agreements', async () => {
		unwrap(await dbNoRLS.rpc('ensure_student_exists', { _user_id: rpcTestUserId }));
		expect(unwrap(await dbNoRLS.from('students').select('user_id').eq('user_id', rpcTestUserId))).toHaveLength(1);

		unwrap(await dbNoRLS.rpc('cleanup_student_if_no_agreements', { _user_id: rpcTestUserId }));

		expect(unwrap(await dbNoRLS.from('students').select('user_id').eq('user_id', rpcTestUserId))).toHaveLength(0);
	});
});

describe('RLS: students INSERT/DELETE via RPC - authenticated EXECUTE denied', () => {
	it('staff cannot call ensure_student_exists (EXECUTE revoked)', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		expectInsufficientPrivilege(
			unwrapError(await staffDb.rpc('ensure_student_exists', { _user_id: rpcTestUserId })),
		);
	});

	it('student cannot call ensure_student_exists (EXECUTE revoked)', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		expectInsufficientPrivilege(unwrapError(await db.rpc('ensure_student_exists', { _user_id: rpcTestUserId })));
	});

	it('student cannot call cleanup_student_if_no_agreements (EXECUTE revoked)', async () => {
		unwrap(await dbNoRLS.rpc('ensure_student_exists', { _user_id: rpcTestUserId }));
		expect(unwrap(await dbNoRLS.from('students').select('user_id').eq('user_id', rpcTestUserId))).toHaveLength(1);

		const studentDb = await createClientAs(TestUsers.STUDENT_001);
		const cleanupResult = await studentDb.rpc('cleanup_student_if_no_agreements', {
			_user_id: rpcTestUserId,
		});

		unwrap(await dbNoRLS.from('students').delete().eq('user_id', rpcTestUserId).select('user_id'));

		expectInsufficientPrivilege(unwrapError(cleanupResult));
	});
});
