import type { Tables } from '@/integrations/supabase/types';
import {
	buildOptionLabelMap,
	buildTeacherNameMap,
	buildTrialMap,
	collectTeacherUserIds,
	collectUniqueOptionIds,
	enrichSignupRequestRow,
} from '@/lib/signup-requests/signupRequestEnrichmentHelpers';

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
	if (value == null) return null;
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function statusBadgeVariant(
	status: Tables<'lesson_signup_requests'>['status'],
): 'default' | 'secondary' | 'outline' {
	if (status === 'pending') return 'default';
	if (status === 'approved' || status === 'trial_scheduled') return 'secondary';
	return 'outline';
}

export function buildAgreementWizardUrl(input: {
	requestId: string;
	studentUserId: string;
	lessonTypeId: string;
	lessonTypeOptionId: string | null;
}): string {
	const optionParam = input.lessonTypeOptionId ? `&optionId=${input.lessonTypeOptionId}` : '';
	return `/agreements/new?fromRequest=${input.requestId}&studentUserId=${input.studentUserId}&lessonTypeId=${input.lessonTypeId}${optionParam}`;
}

export function shouldSkipAgreementWizard(isGroupLesson: boolean, lessonGroupId: string | null): boolean {
	return isGroupLesson && Boolean(lessonGroupId);
}

export type SignupRequestRowBase = Tables<'lesson_signup_requests'> & {
	lesson_type_name: string | null;
	lesson_group_name: string | null;
	is_group_lesson: boolean;
	option_label: string | null;
	trial_scheduled_date: string | null;
	trial_scheduled_time: string | null;
	trial_teacher_name: string | null;
};

export function mapSignupRequestBaseRow(
	row: Tables<'lesson_signup_requests'> & {
		lesson_types:
			| { id: string; name: string; is_group_lesson: boolean }
			| { id: string; name: string; is_group_lesson: boolean }[]
			| null;
		lesson_groups: { id: string; name: string } | { id: string; name: string }[] | null;
	},
): SignupRequestRowBase {
	const lessonType = unwrapRelation(row.lesson_types);
	const lessonGroup = unwrapRelation(row.lesson_groups);
	return {
		...row,
		lesson_type_name: lessonType?.name ?? null,
		lesson_group_name: lessonGroup?.name ?? null,
		is_group_lesson: lessonType?.is_group_lesson ?? false,
		option_label: null,
		trial_scheduled_date: null,
		trial_scheduled_time: null,
		trial_teacher_name: null,
	};
}

export async function enrichSignupRequestRows(baseRows: SignupRequestRowBase[]): Promise<SignupRequestRowBase[]> {
	const { supabase } = await import('@/integrations/supabase/client');
	const optionIds = collectUniqueOptionIds(baseRows);
	let optionMap = new Map<string, string>();
	if (optionIds.length > 0) {
		const { data: opts } = await supabase
			.from('lesson_type_options')
			.select('id, duration_minutes, frequency, label')
			.in('id', optionIds);
		optionMap = buildOptionLabelMap(opts);
	}

	const requestIds = baseRows.map((r) => r.id);
	let trialMap = new Map<string, { date: string; time: string; teacher_user_id: string }>();
	let teacherNames = new Map<string, string>();
	if (requestIds.length > 0) {
		const { data: trials } = await supabase
			.from('trial_lessons')
			.select('signup_request_id, scheduled_date, scheduled_start_time, teacher_user_id, status')
			.in('signup_request_id', requestIds)
			.eq('status', 'scheduled');
		trialMap = buildTrialMap(trials);
		const teacherIds = collectTeacherUserIds(trialMap);
		if (teacherIds.length > 0) {
			const { data: profs } = await supabase
				.from('profiles')
				.select('user_id, first_name, last_name')
				.in('user_id', teacherIds);
			teacherNames = buildTeacherNameMap(profs);
		}
	}

	return baseRows.map((row) => enrichSignupRequestRow(row, optionMap, trialMap, teacherNames));
}
