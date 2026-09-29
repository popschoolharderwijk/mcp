import { PeriodPresetControls } from '@/components/reports/PeriodPresetControls';
import { ReportsDataTable } from '@/components/reports/ReportsDataTable';
import { ReportsSummaryCards } from '@/components/reports/ReportsSummaryCards';
import { ReportsTeacherFilter } from '@/components/reports/ReportsTeacherFilter';
import { PageShell, PageShellBodySkeleton } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import type { useReportsPage } from '@/hooks/useReportsPage';
import { BASE_PRESET_LABELS, type BasePeriodPreset } from '@/lib/reports/periodPresets';

interface ReportsPageBodyProps {
	reportPresets: BasePeriodPreset[];
	page: ReturnType<typeof useReportsPage>;
}

export function ReportsPageBody({ reportPresets, page }: ReportsPageBodyProps) {
	return (
		<PageShell title={NAV_LABELS.reports} description="Urenrapportage per docent, lessoort en leeftijdscategorie">
			<div className="space-y-6">
				<PeriodPresetControls
					preset={page.preset}
					presets={reportPresets}
					labels={BASE_PRESET_LABELS}
					onPresetChange={page.handlePresetChange}
					startDate={page.startDate}
					endDate={page.endDate}
					onStartDateChange={page.setStartDate}
					onEndDateChange={page.setEndDate}
				/>

				{page.isPrivileged && (
					<ReportsTeacherFilter
						selectedTeacherUserId={page.selectedTeacherUserId}
						onTeacherChange={page.setSelectedTeacherUserId}
					/>
				)}

				<ReportsSummaryCards summary={page.summary} />

				{page.loading ? (
					<PageShellBodySkeleton />
				) : (
					<ReportsDataTable
						data={page.filteredData}
						isPrivileged={page.isPrivileged}
						loading={false}
						tableSearchQuery={page.tableSearchQuery}
						onTableSearchChange={page.setTableSearchQuery}
						tableLessonTypeId={page.tableLessonTypeId}
						onTableLessonTypeChange={page.setTableLessonTypeId}
						tableAgeCategory={page.tableAgeCategory}
						onTableAgeCategoryChange={page.setTableAgeCategory}
						tableSourceType={page.tableSourceType}
						onTableSourceTypeChange={page.setTableSourceType}
						reportLessonTypeOptions={page.reportLessonTypeOptions}
					/>
				)}
			</div>
		</PageShell>
	);
}
