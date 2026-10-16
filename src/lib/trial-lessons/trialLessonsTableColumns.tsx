import { TrialLessonsActionsCell } from '@/components/trial-lessons/TrialLessonsActionsCell';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDbDateLong } from '@/lib/date/date-format';
import type { EnrichedTrialLessonStaff } from '@/lib/trial-lessons/enrichTrialLessons';
import { getTrialStatusLabel } from '@/lib/trial-lessons/statusLabels';
import { getTrialStatusBadgeVariant } from '@/lib/trial-lessons/trialLessonsPageHelpers';

type TrialLessonRow = EnrichedTrialLessonStaff;

interface BuildTrialLessonsColumnsParams {
	onSetStatus: (row: TrialLessonRow, status: TrialLessonRow['status']) => void;
	onConvert: (row: TrialLessonRow) => void;
}

export function buildTrialLessonsColumns(params: BuildTrialLessonsColumnsParams): DataTableColumn<TrialLessonRow>[] {
	return [
		{
			key: 'scheduled_date',
			label: 'Datum',
			render: (row) => (
				<div>
					<div className="text-sm">{formatDbDateLong(row.scheduled_date)}</div>
					<div className="text-xs text-muted-foreground">
						{row.scheduled_start_time.slice(0, 5)} · {row.duration_minutes} min
					</div>
				</div>
			),
		},
		{
			key: 'student',
			label: 'Leerling',
			render: (row) => <UserDisplay profile={row.student} showEmail />,
		},
		{
			key: 'teacher',
			label: 'Docent',
			render: (row) => <UserDisplay profile={row.teacher} />,
		},
		{
			key: 'lesson_type',
			label: 'Lessoort',
			render: (row) => <span className="text-sm">{row.lesson_type_name ?? '—'}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			render: (row) => (
				<Badge variant={getTrialStatusBadgeVariant(row.status)}>
					{getTrialStatusLabel(row.status, 'staff')}
				</Badge>
			),
		},
		{
			key: 'actions',
			label: '',
			render: (row) => (
				<TrialLessonsActionsCell row={row} onSetStatus={params.onSetStatus} onConvert={params.onConvert} />
			),
		},
	];
}
