import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicSignupGroupOptions } from '@/lib/public-signup/publicSignupDataHelpers';
import type { LessonTypeOptionRow } from '@/types/lesson-agreements';
import type { GroupOption, LessonType } from './types';

export function usePublicSignupLessonTypes() {
	const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);

	useEffect(() => {
		supabase
			.from('lesson_types')
			.select('id, name, icon, color, is_group_lesson')
			.eq('is_active', true)
			.order('name')
			.then(({ data }) => setLessonTypes(data ?? []));
	}, []);

	return lessonTypes;
}

export function usePublicSignupGroups(selectedType: LessonType | null) {
	const [groups, setGroups] = useState<GroupOption[]>([]);

	useEffect(() => {
		if (!selectedType?.is_group_lesson) {
			setGroups([]);
			return;
		}

		void fetchPublicSignupGroupOptions(supabase, selectedType.id).then(setGroups);
	}, [selectedType]);

	return groups;
}

export function usePublicSignupLessonTypeOptions(selectedType: LessonType | null) {
	const [lessonTypeOptions, setLessonTypeOptions] = useState<LessonTypeOptionRow[]>([]);

	useEffect(() => {
		if (!selectedType || selectedType.is_group_lesson) {
			setLessonTypeOptions([]);
			return;
		}

		supabase
			.from('lesson_type_options')
			.select('id, duration_minutes, frequency')
			.eq('lesson_type_id', selectedType.id)
			.order('duration_minutes')
			.order('frequency')
			.then(({ data }) => setLessonTypeOptions((data ?? []) as LessonTypeOptionRow[]));
	}, [selectedType]);

	return lessonTypeOptions;
}
