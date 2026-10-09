import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { indexByUserId } from '@/lib/collections';
import type { User } from '@/types/users';

type TrialLessonRow = Tables<'trial_lessons'>;

export type TrialLessonDisplayProfile = Pick<User, 'first_name' | 'last_name' | 'avatar_url' | 'email'>;

type TrialLessonProfileRow = TrialLessonDisplayProfile & { user_id: string };

const EMPTY_PROFILE: TrialLessonDisplayProfile = {
	first_name: null,
	last_name: null,
	avatar_url: null,
	email: '',
};

function toDisplayProfile(profile: TrialLessonProfileRow | undefined): TrialLessonDisplayProfile {
	if (!profile) return EMPTY_PROFILE;
	return {
		first_name: profile.first_name,
		last_name: profile.last_name,
		avatar_url: profile.avatar_url,
		email: profile.email ?? '',
	};
}

export type EnrichedTrialLessonStudent = TrialLessonRow & {
	teacher: TrialLessonDisplayProfile;
	lesson_type_name: string | null;
};

export type EnrichedTrialLessonStaff = EnrichedTrialLessonStudent & {
	student: TrialLessonDisplayProfile;
};

interface EnrichOptions {
	includeStudent?: boolean;
}

function enrichSingleTrialLesson<T extends TrialLessonRow>(
	trial: T,
	profileMap: Map<string, TrialLessonProfileRow>,
	lessonTypeMap: Map<string, string>,
	includeStudent: boolean,
): (T & EnrichedTrialLessonStaff) | (T & EnrichedTrialLessonStudent) {
	const base = {
		...trial,
		teacher: toDisplayProfile(profileMap.get(trial.teacher_user_id)),
		lesson_type_name: lessonTypeMap.get(trial.lesson_type_id) ?? null,
	};

	if (!includeStudent) {
		return base;
	}

	return {
		...base,
		student: toDisplayProfile(profileMap.get(trial.student_user_id)),
	};
}

export async function enrichTrialLessons<T extends TrialLessonRow>(
	trials: T[],
	options: EnrichOptions = {},
): Promise<(T & EnrichedTrialLessonStaff)[] | (T & EnrichedTrialLessonStudent)[]> {
	const userIds = Array.from(
		new Set(
			trials.flatMap((trial) =>
				options.includeStudent ? [trial.student_user_id, trial.teacher_user_id] : [trial.teacher_user_id],
			),
		),
	);
	const lessonTypeIds = Array.from(new Set(trials.map((trial) => trial.lesson_type_id)));

	const [profilesRes, lessonTypesRes] = await Promise.all([
		userIds.length > 0
			? supabase
					.from('profiles')
					.select('user_id, first_name, last_name, email, avatar_url')
					.in('user_id', userIds)
			: Promise.resolve({ data: [], error: null }),
		lessonTypeIds.length > 0
			? supabase.from('lesson_types').select('id, name').in('id', lessonTypeIds)
			: Promise.resolve({ data: [], error: null }),
	]);

	const profileMap = indexByUserId((profilesRes.data ?? []) as TrialLessonProfileRow[]);
	const lessonTypeMap = new Map((lessonTypesRes.data ?? []).map((lt) => [lt.id, lt.name] as const));
	const includeStudent = options.includeStudent ?? false;

	const enriched: ((T & EnrichedTrialLessonStaff) | (T & EnrichedTrialLessonStudent))[] = [];
	for (const trial of trials) {
		enriched.push(enrichSingleTrialLesson(trial, profileMap, lessonTypeMap, includeStudent));
	}
	return enriched;
}
