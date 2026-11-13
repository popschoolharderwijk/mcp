import { useCallback, useEffect, useState } from 'react';
import { fetchTeacherAvailability, type TeacherAvailability } from '@/lib/teachers/teacherAvailabilityApi';

export function useTeacherAvailability(teacherUserId: string | null | undefined, enabled = true) {
	const [availability, setAvailability] = useState<TeacherAvailability[]>([]);
	const [loading, setLoading] = useState(true);

	const loadAvailability = useCallback(async () => {
		if (!enabled || !teacherUserId) return;

		const result = await fetchTeacherAvailability(teacherUserId);
		if (result.error) {
			setLoading(false);
			return;
		}

		setAvailability(result.data);
		setLoading(false);
	}, [enabled, teacherUserId]);

	const applyLocalAvailabilityTimes = useCallback(
		(blockId: string, times: Pick<TeacherAvailability, 'start_time' | 'end_time'>) => {
			setAvailability((rows) =>
				rows.map((row) =>
					row.id === blockId ? { ...row, start_time: times.start_time, end_time: times.end_time } : row,
				),
			);
		},
		[],
	);

	useEffect(() => {
		if (enabled) {
			void loadAvailability();
		}
	}, [enabled, loadAvailability]);

	return { availability, loading, loadAvailability, applyLocalAvailabilityTimes };
}
