import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { TeacherLessonTypeInsert } from '../../types';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

const dbNoRLS = createClientBypassRLS();

const aliceTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
const bobTeacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_BOB);
const guitarLessonTypeId = fixtures.requireLessonTypeId('Gitaarles');
// Alice already has Gitaar, Drums, and Zang in seeds/test.sql
// Bob already has Bas and Keyboard in seeds/test.sql
// Use Sax for tests - Alice doesn't have it
const saxLessonTypeId = fixtures.requireLessonTypeId('Saxofoonles');
// Use Drums for Bob - Bob doesn't have it
const drumsLessonTypeId = fixtures.requireLessonTypeId('Drumles');

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

/**
 * Teacher Lesson Types INSERT/DELETE permissions:
 *
 * ADMIN/SITE_ADMIN:
 * - Can insert/delete lesson type links for any teacher
 *
 * TEACHERS:
 * - Cannot insert/delete lesson type links (only SELECT)
 *
 * STAFF:
 * - Cannot insert/delete lesson type links (only SELECT)
 *
 * OTHER USERS:
 * - Cannot insert/delete lesson type links
 */
describe('RLS: teacher_lesson_types INSERT - blocked for non-admin roles', () => {
	const newLink: TeacherLessonTypeInsert = {
		teacher_user_id: aliceTeacherUserId,
		lesson_type_id: saxLessonTypeId,
	};

	it('user without role cannot insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('teacher_lesson_types').insert(newLink).select());
	});

	it('student cannot insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		unwrapError(await db.from('teacher_lesson_types').insert(newLink).select());
	});

	it('teacher cannot insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		unwrapError(await db.from('teacher_lesson_types').insert(newLink).select());
	});

	it('staff cannot insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		unwrapError(await db.from('teacher_lesson_types').insert(newLink).select());
	});
});

describe('RLS: teacher_lesson_types INSERT - admin permissions', () => {
	it('admin can insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const newLink: TeacherLessonTypeInsert = {
			teacher_user_id: aliceTeacherUserId,
			lesson_type_id: saxLessonTypeId,
		};

		const [row] = unwrap(await db.from('teacher_lesson_types').insert(newLink).select());

		expect(row.teacher_user_id).toBe(aliceTeacherUserId);
		expect(row.lesson_type_id).toBe(saxLessonTypeId);

		unwrap(
			await dbNoRLS
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', row.teacher_user_id)
				.eq('lesson_type_id', row.lesson_type_id)
				.select(),
		);
	});

	it('site_admin can insert lesson type link', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		const newLink: TeacherLessonTypeInsert = {
			teacher_user_id: bobTeacherUserId,
			lesson_type_id: drumsLessonTypeId,
		};

		const [row] = unwrap(await db.from('teacher_lesson_types').insert(newLink).select());

		expect(row.teacher_user_id).toBe(bobTeacherUserId);
		expect(row.lesson_type_id).toBe(drumsLessonTypeId);

		unwrap(
			await dbNoRLS
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', row.teacher_user_id)
				.eq('lesson_type_id', row.lesson_type_id)
				.select(),
		);
	});
});

describe('RLS: teacher_lesson_types DELETE - blocked for non-admin roles', () => {
	it('user without role cannot delete lesson type link', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);

		expect(
			unwrap(
				await db
					.from('teacher_lesson_types')
					.delete()
					.eq('teacher_user_id', aliceTeacherUserId)
					.eq('lesson_type_id', guitarLessonTypeId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('teacher cannot delete lesson type link', async () => {
		const db = await createClientAs(TestUsers.TEACHER_ALICE);

		expect(
			unwrap(
				await db
					.from('teacher_lesson_types')
					.delete()
					.eq('teacher_user_id', aliceTeacherUserId)
					.eq('lesson_type_id', guitarLessonTypeId)
					.select(),
			),
		).toHaveLength(0);
	});

	it('staff cannot delete lesson type link', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(
			unwrap(
				await db
					.from('teacher_lesson_types')
					.delete()
					.eq('teacher_user_id', aliceTeacherUserId)
					.eq('lesson_type_id', guitarLessonTypeId)
					.select(),
			),
		).toHaveLength(0);
	});
});

describe('RLS: teacher_lesson_types DELETE - admin permissions', () => {
	it('admin can delete lesson type link', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		unwrap(
			await dbNoRLS
				.from('teacher_lesson_types')
				.insert({
					teacher_user_id: aliceTeacherUserId,
					lesson_type_id: saxLessonTypeId,
				})
				.select(),
		);

		const data = unwrap(
			await db
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', aliceTeacherUserId)
				.eq('lesson_type_id', saxLessonTypeId)
				.select(),
		);

		expect(data).toHaveLength(1);
	});

	it('site_admin can delete lesson type link', async () => {
		const db = await createClientAs(TestUsers.SITE_ADMIN);

		unwrap(
			await dbNoRLS
				.from('teacher_lesson_types')
				.insert({
					teacher_user_id: bobTeacherUserId,
					lesson_type_id: drumsLessonTypeId,
				})
				.select(),
		);

		const data = unwrap(
			await db
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', bobTeacherUserId)
				.eq('lesson_type_id', drumsLessonTypeId)
				.select(),
		);

		expect(data).toHaveLength(1);
	});
});

/**
 * TRIGGER: teacher_lesson_types DELETE - blocked when agreements exist
 * A teacher_lesson_type can only be deleted if there are no lesson agreements
 * using that teacher + lesson_type combination.
 */
describe('TRIGGER: teacher_lesson_types DELETE - blocked when agreements exist', () => {
	const teacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
	const gitaarLessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

	it('admin cannot delete teacher_lesson_type when agreement exists for that combination', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const error = unwrapError(
			await db
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', teacherUserId)
				.eq('lesson_type_id', gitaarLessonTypeId)
				.select(),
		);

		expect(error.message).toContain('Cannot remove lesson type from teacher');
	});

	it('admin can delete teacher_lesson_type when no agreement exists for that combination', async () => {
		const db = await createClientAs(TestUsers.ADMIN_ONE);

		const zangLessonTypeId = fixtures.requireLessonTypeId('Zangles');

		const data = unwrap(
			await db
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', teacherUserId)
				.eq('lesson_type_id', zangLessonTypeId)
				.select(),
		);

		expect(data).toHaveLength(1);

		unwrap(
			await dbNoRLS
				.from('teacher_lesson_types')
				.insert({
					teacher_user_id: teacherUserId,
					lesson_type_id: zangLessonTypeId,
				})
				.select(),
		);
	});
});
