import type { NavigateFunction } from 'react-router-dom';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import {
	formatAgreementListCount,
	formatSignupRequestCount,
	getStudentActiveStatusLabel,
} from '@/lib/students/studentsPageHelpers';
import type { StudentWithAgreements } from '@/types/students';

const STUDENT_SORT_COLUMNS: Record<string, string> = {
	student: 'name',
	phone_number: 'phone_number',
	status: 'status',
	agreements: 'agreements',
};

export function mapStudentSortColumn(sortColumn: string | null): string {
	if (!sortColumn) return 'name';
	return STUDENT_SORT_COLUMNS[sortColumn] ?? 'name';
}

export function buildStudentColumns(
	navigate: NavigateFunction,
	requestsByEmail: Map<string, SignupRequestDetail[]>,
): DataTableColumn<StudentWithAgreements>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortable: true,
			className: 'w-64 max-w-64 min-w-0',
			render: (s) => (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						navigate(`/students/${s.user_id}`);
					}}
					className="block w-full min-w-0 text-left hover:underline"
				>
					<UserDisplay profile={s} showEmail />
				</button>
			),
		},
		{
			key: 'phone_number',
			label: 'Telefoon',
			sortable: true,
			render: (s) => <span className="text-muted-foreground">{s.phone_number || '-'}</span>,
			className: 'text-muted-foreground w-32',
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (s) => (
				<Badge variant={s.active_agreements_count > 0 ? 'default' : 'secondary'}>
					{getStudentActiveStatusLabel(s.active_agreements_count)}
				</Badge>
			),
			className: 'w-24',
		},
		{
			key: 'agreements',
			label: 'Overeenkomsten',
			sortable: true,
			render: (s) => (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						navigate(`/students/${s.user_id}`);
					}}
					className="text-sm hover:underline"
				>
					{formatAgreementListCount(s.agreements.length)}
				</button>
			),
		},
		{
			key: 'signup_requests',
			label: 'Aanmeldingen',
			render: (s) => {
				const count = s.email ? (requestsByEmail.get(s.email)?.length ?? 0) : 0;
				return (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/students/${s.user_id}`);
						}}
						className="text-sm hover:underline"
					>
						{formatSignupRequestCount(count)}
					</button>
				);
			},
		},
	];
}
