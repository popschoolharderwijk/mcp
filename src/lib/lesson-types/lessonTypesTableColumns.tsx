import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import type { LessonTypeListItem } from '@/lib/lesson-types/lessonTypesPageHelpers';

export function buildLessonTypesColumns(): DataTableColumn<LessonTypeListItem>[] {
	return [
		{
			key: 'name',
			label: 'Naam',
			sortable: true,
			sortValue: (lt) => lt.name.toLowerCase(),
			render: (lt) => (
				<div className="flex items-center gap-3">
					<LessonTypeBadge lessonType={lt} showName={false} />
					<div>
						<p className="font-medium">{lt.name}</p>
						{lt.description && <p className="text-xs text-muted-foreground">{lt.description}</p>}
					</div>
				</div>
			),
		},
		{
			key: 'options_count',
			label: 'Lesopties',
			sortable: true,
			sortValue: (lt) => lt.options_count ?? 0,
			render: (lt) => <span className="text-muted-foreground">{lt.options_count ?? 0} opties</span>,
			className: 'text-muted-foreground',
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			sortValue: (lt) => (lt.is_group_lesson ? 1 : 0),
			render: (lt) => (
				<Badge variant={lt.is_group_lesson ? 'default' : 'secondary'}>
					{lt.is_group_lesson ? 'Groepsles' : 'Individueel'}
				</Badge>
			),
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			sortValue: (lt) => (lt.is_active ? 1 : 0),
			render: (lt) => (
				<Badge variant={lt.is_active ? 'default' : 'secondary'}>{lt.is_active ? 'Actief' : 'Inactief'}</Badge>
			),
		},
	];
}
