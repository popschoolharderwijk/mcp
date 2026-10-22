import type { Body } from './types.ts';

export function normalizeTrialLessonNotes(notes: string | null | undefined): string | null {
	const trimmed = notes?.trim();
	return trimmed ? trimmed : null;
}

export function buildTrialLessonInsertRow(
	body: Body,
	args: {
		studentUserId: string;
		lessonTypeId: string;
		lessonTypeOptionId: string | null;
	},
) {
	return {
		signup_request_id: body.signup_request_id ?? null,
		student_user_id: args.studentUserId,
		teacher_user_id: body.teacher_user_id,
		lesson_type_id: args.lessonTypeId,
		lesson_type_option_id: args.lessonTypeOptionId,
		scheduled_date: body.scheduled_date,
		scheduled_start_time: body.scheduled_start_time,
		duration_minutes: body.duration_minutes,
		status: 'scheduled' as const,
		notes: normalizeTrialLessonNotes(body.notes),
	};
}

export function buildTrialAgendaEventTitle(lessonTypeName: string): string {
	return `Proefles ${lessonTypeName}`.trim();
}

export function buildTrialAgendaEventDescription(studentFirstName: string, studentLastName: string): string {
	return `Proefles voor ${studentFirstName} ${studentLastName}`;
}

export function buildTrialAgendaEventInsertRow(
	body: Body,
	args: {
		trialId: string;
		endTime: string;
		lessonTypeName: string;
		lessonTypeColor: string | null;
		studentFirstName: string;
		studentLastName: string;
	},
) {
	return {
		title: buildTrialAgendaEventTitle(args.lessonTypeName),
		description: buildTrialAgendaEventDescription(args.studentFirstName, args.studentLastName),
		owner_user_id: body.teacher_user_id,
		source_type: 'trial_lesson' as const,
		source_id: args.trialId,
		start_date: body.scheduled_date,
		start_time: body.scheduled_start_time,
		end_date: body.scheduled_date,
		end_time: args.endTime,
		is_all_day: false,
		recurring: false,
		color: args.lessonTypeColor,
	};
}
