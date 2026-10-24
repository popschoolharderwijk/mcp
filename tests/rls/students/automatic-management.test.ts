import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { LessonAgreementInsert } from '../../types';
import { unwrap } from '../../utils';
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

// User IDs for testing
// Use USER_002 (no student in seed) - distinct from USER_001 used in insert-update-delete RPC tests
const studentCUserId = fixtures.requireUserId(TestUsers.USER_002);
const teacherAliceUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
const lessonTypeId = fixtures.requireLessonTypeId('Gitaarles');

/**
 * Automatic student management via lesson agreements:
 *
 * - Students are automatically created when a lesson agreement is inserted
 * - Students are automatically deleted when the last lesson agreement is deleted
 * - No one can manually insert or delete students
 */
describe('RLS: students automatic management via lesson agreements', () => {
	it('student is automatically created when lesson agreement is inserted and deleted when all agreements are removed', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);

		const newAgreement: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 1,
			start_time: '10:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		const [inserted] = unwrap(await db.from('lesson_agreements').insert(newAgreement).select());
		expect(inserted.student_user_id).toBe(studentCUserId);

		const studentsAfter = unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId));
		expect(studentsAfter).toHaveLength(1);
		expect(studentsAfter[0].user_id).toBe(studentCUserId);

		unwrap(await db.from('lesson_agreements').delete().eq('student_user_id', studentCUserId).select('id'));

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(0);

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);
	});

	it('student is created with 2 agreements and remains when 1 is deleted, but is deleted when the 2nd is removed', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);

		const agreement1: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 3,
			start_time: '12:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		const [inserted1] = unwrap(await db.from('lesson_agreements').insert(agreement1).select());

		const studentsAfterFirst = unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId));
		expect(studentsAfterFirst).toHaveLength(1);
		expect(studentsAfterFirst[0].user_id).toBe(studentCUserId);

		const agreement2: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 4,
			start_time: '13:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		const [inserted2] = unwrap(await db.from('lesson_agreements').insert(agreement2).select());

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(1);

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(2);

		unwrap(await db.from('lesson_agreements').delete().eq('id', inserted1.id).select('id'));

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(1);

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(1);

		unwrap(await db.from('lesson_agreements').delete().eq('id', inserted2.id).select('id'));

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(0);
	});

	it('expired agreements still count - student remains even if all agreements are expired', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const expiredAgreement: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 5,
			start_time: '14:00',
			start_date: '2020-01-01',
			end_date: '2020-12-31',
			is_active: false,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		unwrap(await db.from('lesson_agreements').insert(expiredAgreement).select());

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(1);

		unwrap(await db.from('lesson_agreements').delete().eq('student_user_id', studentCUserId).select('id'));

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(0);

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);
	});

	it('multiple agreements deleted in one operation removes student automatically', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);

		const agreement1: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 1,
			start_time: '10:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		const agreement2: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 2,
			start_time: '11:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		unwrap(await db.from('lesson_agreements').insert(agreement1).select());
		unwrap(await db.from('lesson_agreements').insert(agreement2).select());

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(1);

		unwrap(await db.from('lesson_agreements').delete().eq('student_user_id', studentCUserId).select('id'));

		expect(
			unwrap(await dbNoRLS.from('lesson_agreements').select('*').eq('student_user_id', studentCUserId)),
		).toHaveLength(0);

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);
	});

	it('student is not auto-deleted when an invoice remains after agreements are removed', async () => {
		const db = await createClientAs(TestUsers.STAFF_ONE);
		const invoiceNumber = `TEST-GUARD-${crypto.randomUUID()}`;

		const agreement: LessonAgreementInsert = {
			student_user_id: studentCUserId,
			teacher_user_id: teacherAliceUserId,
			lesson_type_id: lessonTypeId,
			day_of_week: 2,
			start_time: '09:00',
			start_date: '2024-01-01',
			is_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson: 30,
		};

		unwrap(await db.from('lesson_agreements').insert(agreement).select());

		unwrap(
			await dbNoRLS.from('invoices').insert({
				invoice_number: invoiceNumber,
				student_user_id: studentCUserId,
				due_date: '2026-12-31',
				amount_excl_vat_cents: 1000,
				vat_amount_cents: 0,
				amount_total_cents: 1000,
				status: 'issued',
			}),
		);

		unwrap(await db.from('lesson_agreements').delete().eq('student_user_id', studentCUserId).select('id'));

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(1);

		unwrap(await dbNoRLS.from('invoices').delete().eq('invoice_number', invoiceNumber).select('invoice_number'));

		unwrap(await dbNoRLS.rpc('cleanup_student_if_no_agreements', { _user_id: studentCUserId }));

		expect(unwrap(await dbNoRLS.from('students').select('*').eq('user_id', studentCUserId))).toHaveLength(0);
	});
});
