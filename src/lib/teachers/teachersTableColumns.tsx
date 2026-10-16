import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDateTimeShort, formatDbDateToUi } from '@/lib/date/date-format';
import type { TeacherWithLessonTypes } from '@/types/teachers';

export function buildTeachersColumns(): DataTableColumn<TeacherWithLessonTypes>[] {
	return [
		{
			key: 'teacher',
			label: 'Docent',
			sortable: true,
			render: (t) => <UserDisplay profile={t} showEmail />,
			className: 'min-w-56',
		},
		{
			key: 'phone_number',
			label: 'Telefoonnummer',
			sortable: true,
			render: (t) => <span className="text-muted-foreground">{t.phone_number || '-'}</span>,
			className: 'text-muted-foreground w-36',
		},
		{
			key: 'lesson_types',
			label: 'Lessoorten',
			sortable: false,
			render: (t) => {
				if (t.lesson_types.length === 0) {
					return <span className="text-muted-foreground text-sm">-</span>;
				}
				return (
					<div className="flex items-center gap-1.5">
						{t.lesson_types.map((lt) => (
							<LessonTypeBadge key={lt.id} lessonType={lt} showName={false} />
						))}
					</div>
				);
			},
			className: 'min-w-32',
		},
		{
			key: 'coc_issued_on',
			label: 'VOG',
			sortable: false,
			render: (t) => (
				<span className="text-muted-foreground">
					{t.coc_issued_on ? formatDbDateToUi(t.coc_issued_on) : '-'}
				</span>
			),
			className: 'text-muted-foreground w-28',
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			render: (t) => (
				<Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Actief' : 'Inactief'}</Badge>
			),
			className: 'w-24',
		},
		{
			key: 'created_at',
			label: 'Aangemaakt',
			sortable: true,
			render: (t) => <span className="text-muted-foreground">{formatDateTimeShort(new Date(t.created_at))}</span>,
			className: 'text-muted-foreground w-36',
		},
	];
}
