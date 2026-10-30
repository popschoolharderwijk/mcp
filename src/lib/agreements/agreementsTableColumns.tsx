import type { DataTableColumn } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDateTimeShort, formatDbDateToUi } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { frequencyLabels } from '@/lib/frequencies';
import { formatTime } from '@/lib/time/time-format';
import type { AgreementTableRow } from '@/types/lesson-agreements';

const AGREEMENT_SORT_COLUMNS = new Set([
	'student',
	'teacher',
	'lesson',
	'duration_minutes',
	'start_date',
	'end_date',
	'created_at',
]);

export function mapAgreementSortColumn(sortColumn: string | null): string {
	if (!sortColumn || !AGREEMENT_SORT_COLUMNS.has(sortColumn)) return 'created_at';
	return sortColumn;
}

export type AgreementPersonColumnKey = 'student' | 'teacher';

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
		key: 'lesson_type',
		label: 'Lessoort',
		render: (row) => <LessonTypeBadge lessonType={row.lesson_type} size="sm" />,
	},
	{
		key: 'lesson',
		label: 'Les',
		sortable: true,
		className: 'w-32',
		render: (row) => (
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
		key: 'start_date',
		label: 'Startdatum',
		sortable: true,
		className: 'w-36',
		render: (row) => <span className="text-muted-foreground">{formatDbDateToUi(row.start_date)}</span>,
	},
	{
		key: 'end_date',
		label: 'Einddatum',
		sortable: true,
		className: 'w-36',
		render: (row) => {
			const end = row.end_date ? formatDbDateToUi(row.end_date) : '∞';
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

export function buildAgreementColumns(
	omitPersonColumns: readonly AgreementPersonColumnKey[] = [],
): DataTableColumn<AgreementTableRow>[] {
	if (omitPersonColumns.length === 0) return AGREEMENT_COLUMNS;
	const omit = new Set<string>(omitPersonColumns);
	return AGREEMENT_COLUMNS.filter((column) => !omit.has(column.key));
}

export function resolveOmittedAgreementPersonColumns(params: {
	studentUserId?: string;
	teacherUserId?: string;
}): AgreementPersonColumnKey[] {
	const omit: AgreementPersonColumnKey[] = [];
	if (params.studentUserId) omit.push('student');
	if (params.teacherUserId) omit.push('teacher');
	return omit;
}
