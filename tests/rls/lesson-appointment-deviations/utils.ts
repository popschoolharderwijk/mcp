/**
 * Shared helpers for lesson_appointment_deviations tests.
 */
import { getActualDateInOriginalWeek } from '../../../src/components/teachers/agenda/utils';
import { dateDaysFromNow, formatDateToDb, getDateForDayOfWeek } from '../../../src/lib/date/date-format';
import { createClientAs, createClientBypassRLS } from '../../db';
import type { LessonAppointmentDeviationInsert } from '../../types';
import { unwrap } from '../../utils';
import { fixtures } from '../fixtures';
import type { TestUser } from '../test-users';
import { TestUsers } from '../test-users';

export { dateDaysFromNow, getDateForDayOfWeek, getActualDateInOriginalWeek };

const dbNoRLS = createClientBypassRLS();

/** Calculate the agreement's original_date (day_of_week) for the week containing refDate. */
export function originalDateForWeek(dayOfWeek: number, refDate: Date): string {
	return formatDateToDb(getDateForDayOfWeek(dayOfWeek, refDate));
}

/** Build standard deviation data for a given reference offset. */
export function buildDeviationData(opts: {
	agreementId: string;
	dayOfWeek: number;
	startTime: string;
	refDays: number;
	offsetDays?: number;
	actualStartTime: string;
	recurring: boolean;
}): { insertRow: LessonAppointmentDeviationInsert; originalDate: string; actualDate: string } {
	const refDate = dateDaysFromNow(opts.refDays);
	const originalDate = originalDateForWeek(opts.dayOfWeek, refDate);
	const droppedDate = new Date(originalDate + 'T12:00:00');
	droppedDate.setDate(droppedDate.getDate() + (opts.offsetDays ?? 3));
	const actualDate = getActualDateInOriginalWeek(originalDate, droppedDate);
	const userId = fixtures.requireUserId(TestUsers.TEACHER_ALICE);

	return {
		originalDate,
		actualDate,
		insertRow: {
			lesson_agreement_id: opts.agreementId,
			original_date: originalDate,
			original_start_time: opts.startTime,
			actual_date: actualDate,
			actual_start_time: opts.actualStartTime,
			recurring: opts.recurring,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		},
	};
}

export function getTestAgreement(agreementId: string) {
	const agreement = fixtures.allLessonAgreements.find((a) => a.id === agreementId);
	if (!agreement) throw new Error('Agreement not found');
	return agreement;
}

export function getTestAgreementAlice() {
	return getTestAgreement(fixtures.requireAgreementId(TestUsers.STUDENT_009, TestUsers.TEACHER_ALICE));
}

export function getTestAgreementBob() {
	return getTestAgreement(fixtures.requireAgreementId(TestUsers.STUDENT_026, TestUsers.TEACHER_BOB));
}

/** Build deviation data with custom user. */
export function buildDeviationDataAsUser(
	opts: Parameters<typeof buildDeviationData>[0],
	userId: string,
): ReturnType<typeof buildDeviationData> {
	const result = buildDeviationData(opts);
	return {
		...result,
		insertRow: {
			...result.insertRow,
			created_by_user_id: userId,
			last_updated_by_user_id: userId,
		},
	};
}

// =============================================================================
// Deviation helpers - reduce duplication in tests
// =============================================================================

/** Insert a deviation and return the inserted row (unwrapped). */
export async function insertDeviation(user: TestUser, insertRow: LessonAppointmentDeviationInsert) {
	const db = await createClientAs(user);
	const result = await db.from('lesson_appointment_deviations').insert(insertRow).select().single();
	return unwrap(result);
}

/** Delete a deviation by ID (as user). */
export async function deleteDeviation(user: TestUser, deviationId: string) {
	const db = await createClientAs(user);
	const { error } = await db.from('lesson_appointment_deviations').delete().eq('id', deviationId);
	if (error) throw error;
}

/** Verify a deviation is deleted (returns null if deleted). */
export async function verifyDeleted(deviationId: string) {
	const { data } = await dbNoRLS
		.from('lesson_appointment_deviations')
		.select('id')
		.eq('id', deviationId)
		.maybeSingle();
	return data === null;
}

/** Get a deviation by ID (bypass RLS). */
export async function getDeviation(deviationId: string) {
	const result = await dbNoRLS.from('lesson_appointment_deviations').select('*').eq('id', deviationId).maybeSingle();
	const data = unwrap(result);
	return data;
}

/** Cleanup helper - delete deviation by ID (bypass RLS). */
export async function cleanupDeviation(deviationId: string) {
	await dbNoRLS.from('lesson_appointment_deviations').delete().eq('id', deviationId);
}

/** Insert deviation and return with cleanup function. */
export async function insertDeviationWithCleanup(user: TestUser, insertRow: LessonAppointmentDeviationInsert) {
	const data = await insertDeviation(user, insertRow);
	return {
		data,
		cleanup: async () => cleanupDeviation(data.id),
	};
}
