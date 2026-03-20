import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type {
	LessonAgreementInsert,
	StudentInsert,
	TeacherAvailabilityInsert,
	TeacherInsert,
	TeacherLessonTypeInsert,
} from '../../types';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const fakeId = '00000000-0000-0000-0000-000000000001';

describe('RLS: anonymous user – students', () => {
	it('anon cannot select students', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('students').select('*')));
	});

	it('anon cannot insert students', async () => {
		const db = createClientAnon();
		const row: StudentInsert = { user_id: fakeId };
		expectInsufficientPrivilege(unwrapError(await db.from('students').insert(row).select()));
	});

	it('anon cannot update students', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('students').update({ parent_name: 'x' }).eq('user_id', fakeId).select()),
		);
	});

	it('anon cannot delete students', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('students').delete().eq('user_id', fakeId).select()));
	});
});

describe('RLS: anonymous user – teachers', () => {
	it('anon cannot select teachers', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('teachers').select('*')));
	});

	it('anon cannot insert teachers', async () => {
		const db = createClientAnon();
		const row: TeacherInsert = { user_id: fakeId };
		expectInsufficientPrivilege(unwrapError(await db.from('teachers').insert(row).select()));
	});

	it('anon cannot update teachers', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('teachers').update({ bio: 'x' }).eq('user_id', fakeId).select()),
		);
	});

	it('anon cannot delete teachers', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('teachers').delete().eq('user_id', fakeId).select()));
	});
});

describe('RLS: anonymous user – teacher_availability', () => {
	it('anon cannot select teacher_availability', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('teacher_availability').select('*')));
	});

	it('anon cannot insert teacher_availability', async () => {
		const db = createClientAnon();
		const row: TeacherAvailabilityInsert = {
			teacher_user_id: fakeId,
			day_of_week: 1,
			start_time: '09:00:00',
			end_time: '17:00:00',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('teacher_availability').insert(row).select()));
	});

	it('anon cannot update teacher_availability', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('teacher_availability').update({ start_time: '08:00:00' }).eq('id', fakeId).select(),
			),
		);
	});

	it('anon cannot delete teacher_availability', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('teacher_availability').delete().eq('id', fakeId).select()),
		);
	});
});

describe('RLS: anonymous user – teacher_lesson_types', () => {
	it('anon cannot select teacher_lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('teacher_lesson_types').select('*')));
	});

	it('anon cannot insert teacher_lesson_types', async () => {
		const db = createClientAnon();
		const row: TeacherLessonTypeInsert = { teacher_user_id: fakeId, lesson_type_id: fakeId };
		expectInsufficientPrivilege(unwrapError(await db.from('teacher_lesson_types').insert(row).select()));
	});

	it('anon cannot update teacher_lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('teacher_lesson_types')
					.update({ lesson_type_id: '00000000-0000-0000-0000-000000000002' })
					.eq('teacher_user_id', fakeId)
					.select(),
			),
		);
	});

	it('anon cannot delete teacher_lesson_types', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('teacher_lesson_types').delete().eq('teacher_user_id', fakeId).select()),
		);
	});
});

describe('RLS: anonymous user – lesson_agreements', () => {
	it('anon cannot select lesson_agreements', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_agreements').select('*')));
	});

	it('anon cannot insert lesson_agreements', async () => {
		const db = createClientAnon();
		const row: LessonAgreementInsert = {
			student_user_id: fakeId,
			teacher_user_id: fakeId,
			lesson_type_id: fakeId,
			day_of_week: 1,
			start_time: '10:00:00',
			start_date: '2026-01-01',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 0,
		};
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_agreements').insert(row).select()));
	});

	it('anon cannot update lesson_agreements', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(await db.from('lesson_agreements').update({ notes: 'x' }).eq('id', fakeId).select()),
		);
	});

	it('anon cannot delete lesson_agreements', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('lesson_agreements').delete().eq('id', fakeId).select()));
	});
});
