import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_AGREEMENTS } from '../seed-data-constants';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * Students SELECT permissions:
 *
 * STUDENTS:
 * - Can view their own student record only
 *
 * TEACHERS:
 * - Can view student records for students they have a lesson_agreement with
 *
 * STAFF/ADMIN/SITE_ADMIN:
 * - Can view all student records
 *
 * USERS WITHOUT ROLE:
 * - Cannot view any student records
 */
describe('RLS: students SELECT', () => {
	it('site_admin sees all students', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(fixtures.allStudents.length);
	});

	it('admin sees all students', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(fixtures.allStudents.length);
	});

	it('staff sees all students', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(fixtures.allStudents.length);
	});

	it('student can see only their own record', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const studentAUserId = fixtures.requireUserId(TestUsers.STUDENT_001);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0]?.user_id).toBe(studentAUserId);
	});

	it('student cannot see other students', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const studentBId = fixtures.requireStudentId(TestUsers.STUDENT_002);

		const { data, error } = await db.from('students').select('*').eq('id', studentBId);

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('teacher sees only their own students (with lesson_agreement)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const aliceTeacherId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
		const allowedStudentUserIds = new Set(
			fixtures.allLessonAgreements.filter((a) => a.teacher_id === aliceTeacherId).map((a) => a.student_user_id),
		);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(LESSON_AGREEMENTS.TEACHER_ALICE);
		expect(data).toHaveLength(allowedStudentUserIds.size);

		for (const row of data ?? []) {
			expect(allowedStudentUserIds.has(row.user_id)).toBe(true);
		}
	});

	it('user without role cannot see any students', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		const { data, error } = await db.from('students').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});
});
