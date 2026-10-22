import { ReportCategoryCell } from '@/components/reports/ReportCategoryCell';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { resolveReportCategorySortValue } from '@/lib/reports/reportCategoryCellHelpers';
import { formatDurationMinutes } from '@/lib/time/time-format';
import { AGE_LABELS, type ReportRow } from '@/types/reports';

export function buildReportColumns(isPrivileged: boolean): DataTableColumn<ReportRow>[] {
	const cols: DataTableColumn<ReportRow>[] = [];
	if (isPrivileged) {
		cols.push({
			key: 'teacher_name',
			label: 'Docent',
			sortable: true,
			sortValue: (r) => r.teacher_name.toLowerCase(),
			render: (row) => (
				<UserDisplay
					profile={{
						first_name: null,
						last_name: null,
						email: row.teacher_name,
						avatar_url: null,
					}}
				/>
			),
		});
	}
	cols.push(
		{
			key: 'category',
			label: 'Lessoort / Project',
			sortable: true,
			sortValue: resolveReportCategorySortValue,
			render: (row) => <ReportCategoryCell row={row} />,
		},
		{
			key: 'age_category',
			label: 'Leeftijd',
			sortable: true,
			sortValue: (r) => r.age_category,
			render: (row) => <ReportAgeCategoryCell row={row} />,
		},
		{
			key: 'lesson_count',
			label: 'Aantal lessen',
			sortable: true,
			sortValue: (r) => r.lesson_count,
			className: 'text-right tabular-nums',
			render: (row) => <span className="tabular-nums">{row.lesson_count}</span>,
		},
		{
			key: 'total_minutes',
			label: 'Uren',
			sortable: true,
			sortValue: (r) => r.total_minutes,
			className: 'text-right tabular-nums',
			render: (row) => (
				<span className="font-medium tabular-nums">{formatDurationMinutes(row.total_minutes)}</span>
			),
		},
	);
	return cols;
}

function ReportAgeCategoryCell({ row }: { row: ReportRow }) {
	if (row.source_type === 'project') {
		return <span className="text-muted-foreground">—</span>;
	}
	const variant = row.age_category === 'youth' ? 'secondary' : row.age_category === 'adult' ? 'outline' : 'default';
	return <Badge variant={variant}>{AGE_LABELS[row.age_category]}</Badge>;
}
