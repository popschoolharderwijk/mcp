import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { firstMandateProfile } from '@/lib/direct-debit/mandateDisplayHelpers';
import type { MandateListRow } from '@/lib/direct-debit/mandateListQuery';
import { MANDATE_STATUS_LABELS, type MandateStatus } from '@/lib/direct-debit/types';
import { getDisplayName } from '@/lib/display-name';

function mandateStudentProfile(mandate: MandateListRow) {
	return { user_id: mandate.student_user_id, ...firstMandateProfile(mandate.profiles) };
}

function isMandateStatus(status: string): status is MandateStatus {
	return status === 'pending' || status === 'active' || status === 'revoked';
}

function mandateStatusLabel(status: string): string {
	if (!isMandateStatus(status)) return status;
	return MANDATE_STATUS_LABELS[status];
}

function mandateStatusVariant(status: string): 'default' | 'destructive' | 'secondary' {
	if (status === 'active') return 'default';
	if (status === 'revoked') return 'destructive';
	return 'secondary';
}

export function buildMandateColumns(): DataTableColumn<MandateListRow>[] {
	return [
		{
			key: 'mandate_reference',
			label: 'Kenmerk',
			render: (mandate) => <span className="font-mono text-xs">{mandate.mandate_reference}</span>,
		},
		{
			key: 'student',
			label: 'Leerling',
			className: 'w-64 max-w-64 min-w-0',
			sortValue: (mandate) => getDisplayName(mandateStudentProfile(mandate)),
			render: (mandate) => <UserDisplay profile={mandateStudentProfile(mandate)} showEmail />,
		},
		{
			key: 'iban',
			label: 'IBAN',
			render: (mandate) => <span className="font-mono text-xs">{mandate.iban}</span>,
		},
		{
			key: 'account_holder',
			label: 'Rekeninghouder',
			render: (mandate) => mandate.account_holder,
		},
		{
			key: 'status',
			label: 'Status',
			sortValue: (mandate) => mandateStatusLabel(mandate.status),
			render: (mandate) => (
				<Badge variant={mandateStatusVariant(mandate.status)}>{mandateStatusLabel(mandate.status)}</Badge>
			),
		},
		{
			key: 'sequence_type',
			label: 'Volgorde',
			render: (mandate) => mandate.sequence_type,
		},
	];
}
