import { buildReportColumns } from '@/components/reports/reportColumns';
import { DataTable, type QuickFilterGroup } from '@/components/ui/data-table';
import { resolveIconFromList } from '@/components/ui/icon-picker';
import { MUSIC_ICONS } from '@/constants/icons';
import { AGE_LABELS, type ReportLessonTypeOption, type ReportRow } from '@/types/reports';

interface ReportsDataTableProps {
	data: ReportRow[];
	isPrivileged: boolean;
	loading: boolean;
	tableSearchQuery: string;
	onTableSearchChange: (q: string) => void;
	tableLessonTypeId: string | null;
	onTableLessonTypeChange: (id: string | null) => void;
	tableAgeCategory: string | null;
	onTableAgeCategoryChange: (cat: string | null) => void;
	tableSourceType: string | null;
	onTableSourceTypeChange: (t: string | null) => void;
	reportLessonTypeOptions: ReportLessonTypeOption[];
}

export function ReportsDataTable({
	data,
	isPrivileged,
	loading,
	tableSearchQuery,
	onTableSearchChange,
	tableLessonTypeId,
	onTableLessonTypeChange,
	tableAgeCategory,
	onTableAgeCategoryChange,
	tableSourceType,
	onTableSourceTypeChange,
	reportLessonTypeOptions,
}: ReportsDataTableProps) {
	const columns = buildReportColumns(isPrivileged);

	const quickFilter: QuickFilterGroup[] = [
		{
			label: 'Type',
			value: tableSourceType,
			options: [
				{ id: 'lesson', label: 'Lessen' },
				{ id: 'project', label: 'Projecten' },
			],
			onChange: onTableSourceTypeChange,
			showAllOption: true,
			allOptionLabel: 'Alle',
		},
		{
			label: 'Lessoort',
			value: tableLessonTypeId,
			options: reportLessonTypeOptions.map((opt) => ({
				id: opt.id,
				label: opt.label,
				icon: opt.icon ? resolveIconFromList(MUSIC_ICONS, opt.icon) : undefined,
				color: opt.color,
			})),
			onChange: onTableLessonTypeChange,
			showAllOption: true,
			allOptionLabel: 'Alle',
		},
		{
			label: 'Leeftijd',
			value: tableAgeCategory,
			options: [
				{ id: 'under_21', label: 'Onder 21' },
				{ id: '21_plus', label: '21+' },
			],
			onChange: onTableAgeCategoryChange,
			showAllOption: true,
			allOptionLabel: 'Alle',
		},
	];

	return (
		<DataTable<ReportRow>
			data={data}
			columns={columns}
			searchQuery={tableSearchQuery}
			onSearchChange={onTableSearchChange}
			searchPlaceholder="Zoeken op docent, lessoort of project..."
			searchFields={[
				(r) => r.teacher_name,
				(r) => r.lesson_type_name ?? '',
				(r) => r.project_name ?? '',
				(r) => AGE_LABELS[r.age_category],
			]}
			loading={loading}
			getRowKey={(row) =>
				row.source_type === 'project'
					? `project-${row.teacher_user_id}-${row.project_id}`
					: `lesson-${row.teacher_user_id}-${row.lesson_type_id}-${row.age_category}-${row.duo_perspective ?? 'std'}`
			}
			emptyMessage="Geen gegevens gevonden voor de geselecteerde periode en filters."
			initialSortColumn="total_minutes"
			initialSortDirection="desc"
			quickFilter={quickFilter}
			rowsPerPage={20}
			paginated={true}
		/>
	);
}
