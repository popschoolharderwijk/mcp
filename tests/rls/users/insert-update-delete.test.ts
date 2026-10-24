import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { formatDateToDb, now } from '../../../src/lib/date/date-format';
import { createClientAs } from '../../db';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

const { requireUserId, requireProfile, requireStudentId, requireTeacherId, requireLessonTypeId } = fixtures;

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const lessonAgreementStudentUserId = requireStudentId(TestUsers.STUDENT_001);
const lessonAgreementTeacherUserId = requireTeacherId(TestUsers.TEACHER_ALICE);
const lessonAgreementLessonTypeId = requireLessonTypeId('Gitaarles');

/**
 * Users without role, teacher, or student permissions:
 *
 * These users (USER_A, USER_B) have:
 * - No role in user_roles table
 * - No record in teachers table
 * - No record in students table
 *
 * They should only be able to:
 * - Update their own profile
 *
 * They should NOT be able to:
 * - Insert/update/delete any data except their own profile
 */
describe('RLS: users without role/teacher/student - INSERT/UPDATE/DELETE', () => {
	describe('profiles table', () => {
		it('USER_A can update own profile', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const ownProfile = requireProfile(TestUsers.USER_001);
			const newFirstName = 'Updated';

			const data = unwrap(
				await db
					.from('profiles')
					.update({ first_name: newFirstName })
					.eq('user_id', ownProfile.user_id)
					.select(),
			);

			expect(data).toHaveLength(1);
			expect(data[0].first_name).toBe(newFirstName);

			unwrap(
				await db
					.from('profiles')
					.update({ first_name: ownProfile.first_name })
					.eq('user_id', ownProfile.user_id)
					.select('user_id'),
			);
		});

		it('USER_A cannot update other profiles', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const otherProfile = requireProfile(TestUsers.USER_002);

			expect(
				unwrap(
					await db
						.from('profiles')
						.update({ first_name: 'Hacked' })
						.eq('user_id', otherProfile.user_id)
						.select(),
				),
			).toHaveLength(0);
		});

		it('USER_A cannot insert profiles', async () => {
			const db = await createClientAs(TestUsers.USER_001);

			unwrapError(
				await db
					.from('profiles')
					.insert({
						user_id: '00000000-0000-0000-0000-999999999999',
						email: 'hacked@test.nl',
					})
					.select(),
			);
		});

		it('USER_A cannot delete profiles', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const otherProfile = requireProfile(TestUsers.USER_002);

			expect(
				unwrap(await db.from('profiles').delete().eq('user_id', otherProfile.user_id).select()),
			).toHaveLength(0);
		});
	});

	describe('students table', () => {
		it('USER_A cannot insert students', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const ownUserId = requireUserId(TestUsers.USER_001);

			unwrapError(await db.from('students').insert({ user_id: ownUserId }).select());
		});
	});

	describe('teachers table', () => {
		it('USER_A cannot insert teachers', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const ownUserId = requireUserId(TestUsers.USER_001);

			unwrapError(await db.from('teachers').insert({ user_id: ownUserId }).select());
		});
	});

	describe('lesson_agreements table', () => {
		it('USER_A cannot insert lesson agreements', async () => {
			const db = await createClientAs(TestUsers.USER_001);

			unwrapError(
				await db
					.from('lesson_agreements')
					.insert({
						student_user_id: lessonAgreementStudentUserId,
						teacher_user_id: lessonAgreementTeacherUserId,
						lesson_type_id: lessonAgreementLessonTypeId,
						day_of_week: 1,
						start_time: '14:00',
						start_date: formatDateToDb(now()),
						is_active: true,
						duration_minutes: 30,
						frequency: 'weekly',
						price_per_lesson: 30,
					})
					.select(),
			);
		});
	});

	describe('lesson_types table', () => {
		it('USER_A cannot insert lesson types', async () => {
			const db = await createClientAs(TestUsers.USER_001);

			unwrapError(
				await db
					.from('lesson_types')
					.insert({
						name: 'Hacked Type',
						icon: 'test',
						color: '#FF0000',
					})
					.select(),
			);
		});
	});

	describe('user_roles table', () => {
		it('USER_A cannot insert user roles', async () => {
			const db = await createClientAs(TestUsers.USER_001);
			const ownUserId = requireUserId(TestUsers.USER_001);

			unwrapError(await db.from('user_roles').insert({ user_id: ownUserId, role: 'staff' }).select());
		});
	});
});
