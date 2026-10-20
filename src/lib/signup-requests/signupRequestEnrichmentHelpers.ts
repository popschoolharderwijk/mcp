import type { SignupRequestRowBase } from '@/lib/signup-requests/signupRequestsPageHelpers';

function formatLessonTypeOptionLabel(option: {
	duration_minutes: number;
	frequency: string;
	price_per_lesson: number;
}): string {
	return `${option.duration_minutes} min · ${option.frequency} · €${option.price_per_lesson}`;
}

function formatTeacherDisplayName(firstName: string | null, lastName: string | null): string {
	return `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Docent';
}

export function enrichSignupRequestRow(
	row: SignupRequestRowBase,
	optionMap: Map<string, string>,
	trialMap: Map<string, { date: string; time: string; teacher_user_id: string }>,
	teacherNames: Map<string, string>,
): SignupRequestRowBase {
	const trial = trialMap.get(row.id);
	const optionLabel = row.lesson_type_option_id ? (optionMap.get(row.lesson_type_option_id) ?? null) : null;
	const trialTeacherName = trial ? (teacherNames.get(trial.teacher_user_id) ?? null) : null;
	return {
		...row,
		option_label: optionLabel,
		trial_scheduled_date: trial?.date ?? null,
		trial_scheduled_time: trial?.time ?? null,
		trial_teacher_name: trialTeacherName,
	};
}

export function collectUniqueOptionIds(rows: SignupRequestRowBase[]): string[] {
	return [...new Set(rows.map((r) => r.lesson_type_option_id).filter((v): v is string => Boolean(v)))];
}

export function buildOptionLabelMap(
	options: Array<{
		id: string;
		duration_minutes: number;
		frequency: string;
		label?: string | null;
	}> | null,
): Map<string, string> {
	const optionMap = new Map<string, string>();
	for (const option of options ?? []) {
		optionMap.set(option.id, formatLessonTypeOptionLabel(option));
	}
	return optionMap;
}

export function buildTrialMap(
	trials: Array<{
		signup_request_id: string | null;
		scheduled_date: string;
		scheduled_start_time: string;
		teacher_user_id: string;
	}> | null,
): Map<string, { date: string; time: string; teacher_user_id: string }> {
	const trialMap = new Map<string, { date: string; time: string; teacher_user_id: string }>();
	for (const trial of trials ?? []) {
		if (!trial.signup_request_id) continue;
		trialMap.set(trial.signup_request_id, {
			date: trial.scheduled_date,
			time: trial.scheduled_start_time,
			teacher_user_id: trial.teacher_user_id,
		});
	}
	return trialMap;
}

export function buildTeacherNameMap(
	profiles: Array<{ user_id: string; first_name: string | null; last_name: string | null }> | null,
): Map<string, string> {
	const teacherNames = new Map<string, string>();
	for (const profile of profiles ?? []) {
		teacherNames.set(profile.user_id, formatTeacherDisplayName(profile.first_name, profile.last_name));
	}
	return teacherNames;
}

export function collectTeacherUserIds(
	trialMap: Map<string, { date: string; time: string; teacher_user_id: string }>,
): string[] {
	return [...new Set([...trialMap.values()].map((v) => v.teacher_user_id))];
}
