import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TeacherAvailabilityOverviewTeacher = {
	user_id: string;
	profile: {
		first_name: string | null;
		last_name: string | null;
		email: string;
	};
};

export type TeacherAvailabilityOverviewData = {
	teachers: TeacherAvailabilityOverviewTeacher[];
	availability: Tables<'teacher_availability'>[];
};

export type LoadTeacherAvailabilityOverviewResult =
	| { kind: 'success'; data: TeacherAvailabilityOverviewData }
	| { kind: 'teachers-error' }
	| { kind: 'profiles-error' }
	| { kind: 'availability-error' };

export type TeacherAvailabilityLoadUiOutcome =
	| { kind: 'done'; data: TeacherAvailabilityOverviewData }
	| { kind: 'error'; message: string };

function resolveTeacherAvailabilityLoadErrorMessage(
	kind: 'teachers-error' | 'profiles-error' | 'availability-error',
): string {
	if (kind === 'teachers-error') return 'Fout bij laden docenten';
	if (kind === 'profiles-error') return 'Fout bij laden profielen';
	return 'Fout bij laden beschikbaarheid';
}

export function applyTeacherAvailabilityLoadOutcome(
	outcome: LoadTeacherAvailabilityOverviewResult,
): TeacherAvailabilityLoadUiOutcome {
	if (outcome.kind === 'success') {
		return { kind: 'done', data: outcome.data };
	}
	return { kind: 'error', message: resolveTeacherAvailabilityLoadErrorMessage(outcome.kind) };
}

const EMPTY_PROFILE = {
	first_name: null,
	last_name: null,
	email: '',
};

function buildTeacherAvailabilityOverviewTeachers(
	teacherRows: { user_id: string }[],
	profiles: { user_id: string; first_name: string | null; last_name: string | null; email: string | null }[],
): TeacherAvailabilityOverviewTeacher[] {
	const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
	return teacherRows.map((teacher) => {
		const profile = profileMap.get(teacher.user_id);
		return {
			user_id: teacher.user_id,
			profile: profile
				? {
						first_name: profile.first_name,
						last_name: profile.last_name,
						email: profile.email ?? '',
					}
				: EMPTY_PROFILE,
		};
	});
}

export function getTeacherAvailabilityOverviewName(teacher: TeacherAvailabilityOverviewTeacher): string {
	if (teacher.profile.first_name && teacher.profile.last_name) {
		return `${teacher.profile.first_name} ${teacher.profile.last_name}`;
	}
	if (teacher.profile.first_name) {
		return teacher.profile.first_name;
	}
	return teacher.profile.email;
}

export async function loadTeacherAvailabilityOverview(): Promise<LoadTeacherAvailabilityOverviewResult> {
	const { data: teachersData, error: teachersError } = await supabase
		.from('teachers')
		.select('user_id')
		.eq('is_active', true)
		.order('created_at', { ascending: false });

	if (teachersError) {
		console.error('Error loading teachers:', teachersError);
		return { kind: 'teachers-error' };
	}

	if (!teachersData?.length) {
		return { kind: 'success', data: { teachers: [], availability: [] } };
	}

	const userIds = teachersData.map((teacher) => teacher.user_id);
	const { data: profilesData, error: profilesError } = await supabase
		.from('profiles')
		.select('user_id, first_name, last_name, email')
		.in('user_id', userIds);

	if (profilesError) {
		console.error('Error loading profiles:', profilesError);
		return { kind: 'profiles-error' };
	}

	const { data: availabilityData, error: availabilityError } = await supabase
		.from('teacher_availability')
		.select('*')
		.order('day_of_week', { ascending: true })
		.order('start_time', { ascending: true });

	if (availabilityError) {
		console.error('Error loading availability:', availabilityError);
		return { kind: 'availability-error' };
	}

	return {
		kind: 'success',
		data: {
			teachers: buildTeacherAvailabilityOverviewTeachers(teachersData, profilesData ?? []),
			availability: (availabilityData as Tables<'teacher_availability'>[]) ?? [],
		},
	};
}
