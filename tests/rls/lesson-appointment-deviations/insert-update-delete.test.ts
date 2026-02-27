/**
 * RLS and RPC authorization for lesson_appointment_deviations INSERT/UPDATE/DELETE.
 *
 * Deviation-modifying RPCs (shift_recurring_deviation_to_next_week,
 * end_recurring_deviation_from_week, ensure_week_shows_original_slot) may only be
 * called by the teacher of the lesson agreement or by privileged users (staff/admin/site_admin).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { parseISO } from 'date-fns';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { LessonAppointmentDeviationInsert } from '../../types';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';
import {
	dateDaysFromDate,
	formatDateToDb,
	getDateForDayOfWeek,
} from '../../../src/lib/date/date-format';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const dbNoRLS = createClientBypassRLS();

const agreementId = fixtures.requireAgreementId(TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE);
const staffUserId = fixtures.requireUserId(TestUsers.STAFF_ONE);
const student001UserId = fixtures.requireUserId(TestUsers.STUDENT_001);

/** Next Monday from today (YYYY-MM-DD), for deviation actual_date >= CURRENT_DATE. */
function nextMonday(): string {
	const today = new Date();
	let monday = getDateForDayOfWeek(1, today);
	monday = monday.getTime() <= today.getTime() ? dateDaysFromDate(monday, 7) : monday;
	return formatDateToDb(monday);
}

/** Add days to a YYYY-MM-DD date string. */
function addDays(dateStr: string, days: number): string {
	return formatDateToDb(dateDaysFromDate(parseISO(`${dateStr}T12:00:00Z`), days));
}

type AgreementTimeRow = {
	start_time: string;
	start_date: string;
};

function assertIsAgreementTimeRow(
	value: unknown,
): asserts value is AgreementTimeRow {
	if (
		typeof value !== 'object' ||
		value === null ||
		!('start_time' in value) ||
		!('start_date' in value) ||
		typeof (value as AgreementTimeRow).start_time !== 'string' ||
		typeof (value as AgreementTimeRow).start_date !== 'string'
	) {
		throw new Error('Invalid AgreementTimeRow');
	}
}

function requireAgreementTimeRow(value: unknown): AgreementTimeRow {
	assertIsAgreementTimeRow(value);
	return value;
}

describe('deviation RPCs require authorization', () => {
	it('unprivileged user (student) cannot shift recurring deviation that belongs to another teacher', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		const studentDb = await createClientAs(TestUsers.STUDENT_001);

		const agreementRow = requireAgreementTimeRow(
			unwrap(
			await dbNoRLS.from('lesson_agreements').select('start_time, start_date').eq('id', agreementId).single(),
			),
		);
		const weekDate = nextMonday();
		const startTime = agreementRow.start_time;
		const actualDate = addDays(weekDate, 1);
		const insertRow: LessonAppointmentDeviationInsert = {
			lesson_agreement_id: agreementId,
			original_date: weekDate,
			original_start_time: startTime,
			actual_date: actualDate,
			actual_start_time: startTime,
			is_cancelled: false,
			recurring: true,
			created_by_user_id: staffUserId,
			last_updated_by_user_id: staffUserId,
		};

		const [inserted] = unwrap(
			await staffDb.from('lesson_appointment_deviations').insert(insertRow).select('id'),
		);

		const shiftResult = await studentDb.rpc('shift_recurring_deviation_to_next_week', {
			p_deviation_id: inserted.id,
			p_user_id: student001UserId,
		});

		const deviationIdsToDelete = [inserted.id, shiftResult.data].filter((id): id is string => id != null);
		await Promise.all(
			deviationIdsToDelete.map((id) =>
				staffDb.from('lesson_appointment_deviations').delete().eq('id', id),
			),
		);

		const error = unwrapError(shiftResult);
		expect(error.message).toContain('Permission denied');
	});

	it('unprivileged user (student) cannot end recurring deviation that belongs to another teacher', async () => {
		const staffDb = await createClientAs(TestUsers.STAFF_ONE);
		const studentDb = await createClientAs(TestUsers.STUDENT_001);

		const agreementRow = requireAgreementTimeRow(
			unwrap(
			await dbNoRLS.from('lesson_agreements').select('start_time, start_date').eq('id', agreementId).single(),
			),
		);
		const weekDate = nextMonday();
		const startTime = agreementRow.start_time;
		const actualDate = addDays(weekDate, 1);
		const insertRow: LessonAppointmentDeviationInsert = {
			lesson_agreement_id: agreementId,
			original_date: weekDate,
			original_start_time: startTime,
			actual_date: actualDate,
			actual_start_time: startTime,
			is_cancelled: false,
			recurring: true,
			created_by_user_id: staffUserId,
			last_updated_by_user_id: staffUserId,
		};

		const [inserted] = unwrap(
			await staffDb.from('lesson_appointment_deviations').insert(insertRow).select('id'),
		);

		const endResult = await studentDb.rpc('end_recurring_deviation_from_week', {
			p_deviation_id: inserted.id,
			p_week_date: weekDate,
			p_user_id: student001UserId,
		});

		await staffDb.from('lesson_appointment_deviations').delete().eq('id', inserted.id);

		const error = unwrapError(endResult);
		expect(error.message).toContain('Permission denied');
	});

	it('unprivileged user (student) cannot call ensure_week_shows_original_slot for another teacher\'s agreement', async () => {
		const studentDb = await createClientAs(TestUsers.STUDENT_001);

		const weekDate = nextMonday();

		const error = unwrapError(
			await studentDb.rpc('ensure_week_shows_original_slot', {
				p_lesson_agreement_id: agreementId,
				p_week_date: weekDate,
				p_user_id: student001UserId,
				p_scope: 'only_this',
			}),
		);
		expect(error.message).toContain('Permission denied');
	});
});
