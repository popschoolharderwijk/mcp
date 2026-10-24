import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { LESSON_AGREEMENTS, PAGINATION, STUDENTS } from '../seed-data-constants';
import { TestUsers } from '../test-users';

interface PaginatedStudentsResponse {
	data: Array<{
		id: string;
		user_id: string;
		profile: {
			email: string;
			first_name: string | null;
			last_name: string | null;
		};
		active_agreements_count: number;
		agreements_count: number;
		agreements: Array<{
			id: string;
			teacher: {
				first_name: string | null;
			};
		}>;
	}>;
	total_count: number;
	limit: number;
	offset: number;
}

/**
 * Access tests for get_students_paginated (SECURITY DEFINER).
 *
 * RLS on students does not apply inside the function; access is gated in the
 * query body to match students_select (is_privileged / own row / teacher via
 * get_teacher_user_id). Agreement counts and nested agreements use the same gate.
 *
 * Expected behavior:
 * - STUDENTS: Can see only their own record
 * - TEACHERS: Automatically see only their own students (teacher_user_id is determined from logged-in user, cannot be spoofed)
 * - STAFF/ADMIN/SITE_ADMIN: Can see all students
 */
describe('RLS: get_students_paginated', () => {
	let initialState: DatabaseState;
	const { setupState, verifyState } = setupDatabaseStateVerification();

	beforeAll(async () => {
		initialState = await setupState();
	});

	afterAll(async () => {
		await verifyState(initialState);
	});

	it('site_admin sees all students', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.total_count).toBe(STUDENTS.TOTAL);
		expect(result.data.length).toBe(STUDENTS.TOTAL);
	});

	it('admin sees all students', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.total_count).toBe(STUDENTS.TOTAL);
	});

	it('staff sees all students', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.total_count).toBe(STUDENTS.TOTAL);
	});

	it('student can see only their own record', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const student001UserId = fixtures.requireUserId(TestUsers.STUDENT_001);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		// Students can see only their own record via RLS
		expect(result.total_count).toBe(1);
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.user_id).toBe(student001UserId);
	});

	it('teacher can see their own students (automatically determined from logged-in user)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_include_agreements: true,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		// Teachers automatically see their own students (teacher_user_id is determined from logged-in user)
		// Teacher Alice has LESSON_AGREEMENTS.TEACHER_ALICE students in seed
		expect(result.total_count).toBe(LESSON_AGREEMENTS.TEACHER_ALICE);
		expect(result.data).toHaveLength(LESSON_AGREEMENTS.TEACHER_ALICE);
		// All returned students should have agreements with Teacher Alice
		result.data.forEach((student) => {
			const hasAgreementWithAlice = student.agreements.some(
				(agreement) => agreement.teacher.first_name === 'Alice',
			);
			expect(hasAgreementWithAlice).toBe(true);
		});
	});

	it('teacher cannot see other teachers students (security: teacher_user_id is automatically determined)', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_include_agreements: true,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		// Teacher Alice should only see her own students, not Teacher Bob's students
		// Security: teacher_user_id is automatically determined from logged-in user, cannot be spoofed
		result.data.forEach((student) => {
			const hasAgreementWithAlice = student.agreements.some(
				(agreement) => agreement.teacher.first_name === 'Alice',
			);
			// All students returned must have at least one agreement with Teacher Alice
			expect(hasAgreementWithAlice).toBe(true);
		});
	});

	it('teacher without students sees empty list', async () => {
		const db = await createClientAs(TestUsers.TEACHER_JACK);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		// Teacher Jack has no students in seed data
		expect(result.total_count).toBe(0);
		expect(result.data).toHaveLength(0);
	});

	it('user without role cannot see any students', async () => {
		const db = await createClientAs(TestUsers.USER_001);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.total_count).toBe(0);
		expect(result.data).toHaveLength(0);
	});

	it('pagination works correctly', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		// Get first page
		const page1 = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: PAGINATION.PAGE_SIZE,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(page1.data).toHaveLength(PAGINATION.PAGE_SIZE);
		expect(page1.limit).toBe(PAGINATION.PAGE_SIZE);
		expect(page1.offset).toBe(0);
		expect(page1.total_count).toBe(STUDENTS.TOTAL);

		// Get second page
		const page2 = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: PAGINATION.PAGE_SIZE,
				p_offset: PAGINATION.PAGE_SIZE,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(page2.data).toHaveLength(PAGINATION.PAGE_SIZE);
		expect(page2.limit).toBe(PAGINATION.PAGE_SIZE);
		expect(page2.offset).toBe(PAGINATION.PAGE_SIZE);
		expect(page2.total_count).toBe(STUDENTS.TOTAL);

		// Total count should be the same
		expect(page1.total_count).toBe(page2.total_count);

		// No overlap between pages
		const page1Ids = new Set(page1.data.map((s) => s.id));
		const page2Ids = new Set(page2.data.map((s) => s.id));
		const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
		expect(intersection).toHaveLength(0);
	});

	it('search filter works', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		// Search "student-001" - unique match in seed
		const searchData = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_search: 'student-001',
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(searchData.total_count).toBe(1);
		expect(searchData.data).toHaveLength(1);
		expect(searchData.data[0]?.profile.email).toBe(TestUsers.STUDENT_001);
	});

	it('omits agreement trees by default but still returns counts', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_search: 'student-001',
				p_include_agreements: false,
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(result.total_count).toBe(1);
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.agreements).toHaveLength(0);
		expect(result.data[0]?.agreements_count).toBe(LESSON_AGREEMENTS.STUDENT_001);
		expect(result.data[0]?.active_agreements_count).toBe(LESSON_AGREEMENTS.STUDENT_001);
	});

	it('staff/admin can see all students (no teacher filter applied)', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
			}),
		) as unknown as PaginatedStudentsResponse;
		// Staff/admin see all students (no teacher filter)
		expect(result.total_count).toBe(STUDENTS.TOTAL);
		expect(result.data.length).toBe(STUDENTS.TOTAL);
	});

	it('returns students sorted by display name ascending', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const result = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_sort_column: 'name',
				p_sort_direction: 'asc',
			}),
		) as unknown as PaginatedStudentsResponse;
		const emails = result.data.map((s) => s.profile.email);
		expect(emails).toHaveLength(STUDENTS.TOTAL);
		expect(emails[0]).toBe(STUDENTS.FIRST_EMAIL_BY_DISPLAY_NAME_ASC);

		const descResult = unwrap(
			await db.rpc('get_students_paginated', {
				p_limit: 100,
				p_offset: 0,
				p_sort_column: 'name',
				p_sort_direction: 'desc',
			}),
		) as unknown as PaginatedStudentsResponse;
		expect(descResult.data.map((s) => s.profile.email)).toEqual([...emails].reverse());
	});
});
