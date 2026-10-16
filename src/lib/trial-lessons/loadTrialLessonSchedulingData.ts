import { supabase } from '@/integrations/supabase/client';
import type { AvailabilitySlot, ExistingAgreementForSlot, ExistingTrialLessonForSlot } from '@/lib/agreementSlots';
import {
	buildTeachersMap,
	groupAgreementsByTeacher,
	groupAvailabilityByTeacher,
	groupTrialsByTeacher,
	mapTeacherIdsFromLessonTypes,
	mapTeacherIdsFromTeachers,
} from '@/lib/trial-lessons/loadTrialLessonSchedulingDataHelpers';

export interface TrialLessonSchedulingTeacher {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

export interface TrialLessonSchedulingData {
	teachers: Map<string, TrialLessonSchedulingTeacher>;
	availabilityByTeacher: Map<string, AvailabilitySlot[]>;
	agreementsByTeacher: Map<string, ExistingAgreementForSlot[]>;
	trialsByTeacher: Map<string, ExistingTrialLessonForSlot[]>;
}

const EMPTY_SCHEDULING_DATA: TrialLessonSchedulingData = {
	teachers: new Map(),
	availabilityByTeacher: new Map(),
	agreementsByTeacher: new Map(),
	trialsByTeacher: new Map(),
};

async function resolveTeacherIds(lessonTypeId: string | null): Promise<string[]> {
	if (lessonTypeId) {
		const { data } = await supabase
			.from('teacher_lesson_types')
			.select('teacher_user_id')
			.eq('lesson_type_id', lessonTypeId);
		return mapTeacherIdsFromLessonTypes(data ?? []);
	}

	const { data } = await supabase.from('teachers').select('user_id').eq('is_active', true);
	return mapTeacherIdsFromTeachers(data ?? []);
}

export async function loadTrialLessonSchedulingData(
	lessonTypeId: string | null,
	fromDate: string,
	toDate: string,
): Promise<TrialLessonSchedulingData> {
	const teacherIds = await resolveTeacherIds(lessonTypeId);
	if (teacherIds.length === 0) return EMPTY_SCHEDULING_DATA;

	const [profsRes, availRes, agreementsRes, trialsRes] = await Promise.all([
		supabase.from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', teacherIds),
		supabase
			.from('teacher_availability')
			.select('teacher_user_id, day_of_week, start_time, end_time')
			.in('teacher_user_id', teacherIds),
		supabase
			.from('lesson_agreements')
			.select('teacher_user_id, day_of_week, start_time, start_date, end_date, duration_minutes, frequency')
			.in('teacher_user_id', teacherIds)
			.lte('start_date', toDate),
		supabase
			.from('trial_lessons')
			.select('teacher_user_id, scheduled_date, scheduled_start_time, duration_minutes, status')
			.in('teacher_user_id', teacherIds)
			.gte('scheduled_date', fromDate)
			.lte('scheduled_date', toDate),
	]);

	return {
		teachers: buildTeachersMap(profsRes.data ?? []),
		availabilityByTeacher: groupAvailabilityByTeacher(availRes.data ?? []),
		agreementsByTeacher: groupAgreementsByTeacher(agreementsRes.data ?? [], fromDate),
		trialsByTeacher: groupTrialsByTeacher(trialsRes.data ?? []),
	};
}
