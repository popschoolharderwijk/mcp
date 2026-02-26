import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LessonTypeFilter } from '@/types/lesson-agreements';

export function useActiveLessonTypes(enabled = true): {
	lessonTypes: LessonTypeFilter[];
	loading: boolean;
	error: Error | null;
} {
	const [lessonTypes, setLessonTypes] = useState<LessonTypeFilter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const load = useCallback(async () => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const { data, error: fetchError } = await supabase
			.from('lesson_types')
			.select('id, name, icon, color')
			.eq('is_active', true)
			.order('name', { ascending: true });

		if (fetchError) {
			console.error('Error loading lesson types:', fetchError);
			setError(fetchError);
			setLessonTypes([]);
		} else {
			setLessonTypes((data ?? []) as LessonTypeFilter[]);
		}
		setLoading(false);
	}, [enabled]);

	useEffect(() => {
		load();
	}, [load]);

	return { lessonTypes, loading, error };
}
