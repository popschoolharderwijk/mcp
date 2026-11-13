import type { DataTableColumn } from '@/components/ui/data-table';
import { formatDateTimeShort, formatDbDateLong } from '@/lib/date/date-format';
import type { SignupRequestRowBase } from '@/lib/signup-requests/signupRequestsPageHelpers';
import {
	SignupRequestLessonTypeCell,
	SignupRequestNameCell,
	SignupRequestStatusCell,
} from '@/lib/signup-requests/signupRequestsTableCellRenderers';

export function buildSignupRequestColumns(): DataTableColumn<SignupRequestRowBase>[] {
	return [
		{
			key: 'created_at',
			label: 'Ontvangen',
			sortable: true,
			className: 'text-muted-foreground w-36',
			render: (row) => (
				<span className="text-muted-foreground">{formatDateTimeShort(new Date(row.created_at))}</span>
			),
		},
		{
			key: 'name',
			label: 'Aanmelder',
			render: (row) => <SignupRequestNameCell row={row} />,
		},
		{
			key: 'type',
			label: 'Lessoort',
			render: (row) => <SignupRequestLessonTypeCell row={row} />,
		},
		{
			key: 'status',
			label: 'Status',
			render: (row) => <SignupRequestStatusCell row={row} formatDate={formatDbDateLong} />,
		},
	];
}
