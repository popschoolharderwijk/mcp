import type { DataTableColumn } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDateTimeShort } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { frequencyLabels } from '@/lib/frequencies';
import { formatTime } from '@/lib/time/time-format';
import type { AgreementTableRow } from '@/types/lesson-agreements';

export const AGREEMENT_COLUMNS: DataTableColumn<AgreementTableRow>[] = [
	{
		key: 'student',
		label: 'Leerling',
		sortable: true,
		render: (row) => <UserDisplay profile={row.student} showEmail />,
	},
	{
		key: 'teacher',
		label: 'Docent',
		sortable: true,
		render: (row) => <UserDisplay profile={row.teacher} />,
	},
	{
		key: 'lesson',
		label: 'Les',
		sortable: true,
		className: 'w-32',
		render: (row) => (
			<div className="flex items-center gap-2">
				<LessonTypeBadge lessonType={row.lesson_type} size="sm" showName={false} />
				<div>
					<div className="flex items-center gap-1">
						<span>{DAY_NAMES[row.day_of_week]?.slice(0, 2)}</span>
						<span className="text-muted-foreground">{formatTime(row.start_time)}</span>
						{row.duo_pair_id && (
							<span
								className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
								title="Duo-overeenkomst"
							>
								Duo
							</span>
						)}
					</div>
					<p className="text-xs text-muted-foreground">{frequencyLabels[row.frequency]}</p>
				</div>
			</div>
		),
	},
	{
		key: 'duration_minutes',
		label: 'Duur',
		sortable: true,
		sortValue: (row) => row.duration_minutes,
		className: 'w-24',
		render: (row) => `${row.duration_minutes} min`,
	},
	{
		key: 'end_date',
		label: 'Einddatum',
		sortable: true,
		className: 'w-36',
		render: (row) => {
			const end = row.end_date
				? new Date(row.end_date).toLocaleDateString('nl-NL', {
						day: 'numeric',
						month: 'short',
						year: 'numeric',
					})
				: '∞';
			return (
				<div className="flex items-center gap-1.5">
					{!row.is_active && (
						<span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50" title="Inactief" />
					)}
					<span className="text-muted-foreground">{end}</span>
				</div>
			);
		},
	},
	{
		key: 'created_at',
		label: 'Aangemaakt',
		sortable: true,
		className: 'w-36',
		render: (row) => <span className="text-muted-foreground">{formatDateTimeShort(new Date(row.created_at))}</span>,
	},
];
