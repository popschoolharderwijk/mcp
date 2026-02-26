import { useCallback, useEffect, useState } from 'react';
import type { LessonType } from '@/hooks/useTableFilters';
import { supabase } from '@/integrations/supabase/client';

export function useActiveLessonTypes(enabled = true): {
	lessonTypes: LessonType[];
	loading: boolean;
	error: Error | null;
} {
	const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
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
			setLessonTypes((data ?? []) as LessonType[]);
		}
		setLoading(false);
	}, [enabled]);

	useEffect(() => {
		load();
	}, [load]);

	return { lessonTypes, loading, error };
}
