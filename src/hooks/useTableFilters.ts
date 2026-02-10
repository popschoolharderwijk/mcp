import { useMemo } from 'react';
import type { QuickFilterGroup } from '@/components/ui/data-table';
import { resolveIconFromList } from '@/components/ui/icon-picker';
import { MUSIC_ICONS } from '@/constants/icons';

export interface LessonType {
	id: string;
	name: string;
	icon: string;
	color: string;
}

/**
 * Creates a status filter group for active/inactive filtering
 */
export function useStatusFilter(
	statusFilter: 'all' | 'active' | 'inactive',
	setStatusFilter: (value: 'all' | 'active' | 'inactive') => void,
): QuickFilterGroup {
	return useMemo(
		() => ({
			label: 'Status',
			value: statusFilter === 'all' ? null : statusFilter,
			options: [
				{ id: 'active', label: 'Actief' },
				{ id: 'inactive', label: 'Inactief' },
			],
			onChange: (value) => {
				setStatusFilter(value === null ? 'all' : (value as 'active' | 'inactive'));
			},
		}),
		[statusFilter, setStatusFilter],
	);
}

/**
 * Creates a lesson type filter group
 */
export function useLessonTypeFilter(
	lessonTypes: LessonType[],
	selectedLessonTypeId: string | null,
	setSelectedLessonTypeId: (value: string | null) => void,
): QuickFilterGroup | null {
	return useMemo(() => {
		if (lessonTypes.length === 0) {
			return null;
		}

		return {
			label: 'Lessoorten',
			value: selectedLessonTypeId,
			options: lessonTypes.map((lt) => {
				const Icon = lt.icon ? resolveIconFromList(MUSIC_ICONS, lt.icon) : undefined;
				return {
					id: lt.id,
					label: lt.name,
					icon: Icon,
					color: lt.color,
				};
			}),
			onChange: setSelectedLessonTypeId,
		};
	}, [lessonTypes, selectedLessonTypeId, setSelectedLessonTypeId]);
}
