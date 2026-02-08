import { describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

const dbNoRLS = createClientBypassRLS();

// Setup: Create test lesson type links
const aliceTeacherId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
const bobTeacherId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);
const guitarLessonTypeId = fixtures.requireLessonTypeId('Gitaar');
const drumsLessonTypeId = fixtures.requireLessonTypeId('Drums');

// Create test links before tests run
await dbNoRLS.from('teacher_lesson_types').delete().eq('teacher_id', aliceTeacherId);
await dbNoRLS.from('teacher_lesson_types').delete().eq('teacher_id', bobTeacherId);

await dbNoRLS.from('teacher_lesson_types').insert([
	{ teacher_id: aliceTeacherId, lesson_type_id: guitarLessonTypeId },
	{ teacher_id: aliceTeacherId, lesson_type_id: drumsLessonTypeId },
	{ teacher_id: bobTeacherId, lesson_type_id: guitarLessonTypeId },
]);

/**
 * Teacher Lesson Types SELECT permissions:
 *
 * TEACHERS:
 * - Can view their own lesson type links only
 *
 * STAFF/ADMIN/SITE_ADMIN:
 * - Can view all lesson type links
 *
 * OTHER USERS (students, users without role):
 * - Cannot view any lesson type links
 */
describe('RLS: teacher_lesson_types SELECT', () => {
	it('site_admin sees all lesson type links', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('admin sees all lesson type links', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('staff sees all lesson type links', async () => {
		const db = await createClientAs(TestUsers.STAFF);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBeGreaterThanOrEqual(3);
	});

	it('teacher can see only their own lesson type links', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data?.length).toBe(2);
		expect(data?.every((lt) => lt.teacher_id === aliceTeacherId)).toBe(true);
	});

	it('teacher cannot see other teachers lesson type links', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		const { data, error } = await db.from('teacher_lesson_types').select('*').eq('teacher_id', bobTeacherId);

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('student cannot see any lesson type links', async () => {
		const db = await createClientAs(TestUsers.STUDENT_A);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});

	it('user without role cannot see any lesson type links', async () => {
		const db = await createClientAs(TestUsers.USER_A);

		const { data, error } = await db.from('teacher_lesson_types').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(0);
	});
});
