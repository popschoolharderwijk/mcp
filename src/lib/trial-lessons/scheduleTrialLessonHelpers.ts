import {
	type AvailabilitySlot,
	type ExistingAgreementForSlot,
	type ExistingTrialLessonForSlot,
	type FreeSlotForTeacher,
	getFreeSlotsAcrossTeachers,
} from '@/lib/agreementSlots';

const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export function todayPlus(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

export function formatTrialLessonDateHeader(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00`);
	return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${d.toLocaleString('nl-NL', { month: 'long' })}`;
}

export interface ScheduleTrialLessonFormInput {
	signupRequestId: string | null | undefined;
	lessonTypeId: string | null | undefined;
	lessonTypeOptionId: string | null | undefined;
	teacherUserId: string;
	scheduledDate: string;
	scheduledStartTime: string;
	durationMinutes: number;
	notes: string;
	studentEmail: string;
	studentFirstName: string;
	studentLastName: string;
	hasSignupRequest: boolean;
}

export function buildScheduleTrialLessonPayload(input: ScheduleTrialLessonFormInput) {
	return {
		signup_request_id: input.signupRequestId ?? null,
		teacher_user_id: input.teacherUserId,
		lesson_type_id: input.lessonTypeId ?? null,
		lesson_type_option_id: input.lessonTypeOptionId ?? null,
		scheduled_date: input.scheduledDate,
		scheduled_start_time: input.scheduledStartTime,
		duration_minutes: input.durationMinutes,
		notes: input.notes || null,
		student_email: input.hasSignupRequest ? undefined : input.studentEmail,
		student_first_name: input.hasSignupRequest ? undefined : input.studentFirstName,
		student_last_name: input.hasSignupRequest ? undefined : input.studentLastName,
	};
}

export function getScheduleTrialLessonErrorMessage(
	data: { error?: string } | null,
	errorMessage: string | undefined,
): string {
	return data?.error ?? errorMessage ?? 'Fout bij inplannen';
}

export function getScheduleTrialLessonDescription(
	hasSignupRequest: boolean,
	firstName: string,
	lastName: string,
): string {
	if (hasSignupRequest) {
		return `Voor ${firstName} ${lastName} — kies een vrij tijdslot.`;
	}
	return 'Kies een vrij tijdslot binnen de periode.';
}

export interface ScheduleTrialLessonResetValues {
	studentEmail: string;
	studentFirstName: string;
	studentLastName: string;
	notes: string;
	fromDate: string;
	toDate: string;
	duration: number;
}

export function getScheduleTrialLessonResetValues(
	signupRequest: { email?: string; first_name?: string; last_name?: string } | null | undefined,
): ScheduleTrialLessonResetValues {
	return {
		studentEmail: signupRequest?.email ?? '',
		studentFirstName: signupRequest?.first_name ?? '',
		studentLastName: signupRequest?.last_name ?? '',
		notes: '',
		fromDate: todayPlus(1),
		toDate: todayPlus(30),
		duration: 30,
	};
}

export function groupFreeSlotsByDate(
	fromDate: string,
	toDate: string,
	duration: number,
	availabilityByTeacher: Map<string, AvailabilitySlot[]>,
	agreementsByTeacher: Map<string, ExistingAgreementForSlot[]>,
	trialsByTeacher: Map<string, ExistingTrialLessonForSlot[]>,
): Map<string, FreeSlotForTeacher[]> {
	const map = new Map<string, FreeSlotForTeacher[]>();
	if (!fromDate || !toDate || availabilityByTeacher.size === 0) return map;
	const start = new Date(`${fromDate}T12:00:00`);
	const end = new Date(`${toDate}T12:00:00`);
	if (end < start) return map;
	for (const slot of getFreeSlotsAcrossTeachers(
		start,
		end,
		availabilityByTeacher,
		agreementsByTeacher,
		trialsByTeacher,
		duration,
	)) {
		const arr = map.get(slot.date) ?? [];
		arr.push(slot);
		map.set(slot.date, arr);
	}
	return map;
}
