import type { DataTableColumn } from '@/components/ui/data-table';
import { formatDbDateToUi } from '@/lib/date/date-format';
import type { NoLessonPeriodListItem } from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';

export function buildNoLessonPeriodsColumns(): DataTableColumn<NoLessonPeriodListItem>[] {
	return [
		{
			key: 'name',
			label: 'Naam',
			sortValue: (period) => period.name,
			render: (period) => <span className="font-medium">{period.name}</span>,
		},
		{
			key: 'start_date',
			label: 'Start',
			sortValue: (period) => period.start_date,
			render: (period) => formatDbDateToUi(period.start_date),
		},
		{
			key: 'end_date',
			label: 'Einde',
			sortValue: (period) => period.end_date,
			render: (period) => formatDbDateToUi(period.end_date),
		},
		{
			key: 'description',
			label: 'Beschrijving',
			sortable: false,
			render: (period) =>
				period.description ? (
					<span className="text-muted-foreground">{period.description}</span>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
	];
}
