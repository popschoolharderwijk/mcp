import { FaRegFilePdf } from 'react-icons/fa6';
import { LuMail } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { getDisplayName } from '@/lib/display-name';
import { formatCentsEUR, INVOICE_STATUS_LABELS, type Invoice } from '@/lib/invoices/types';

export interface InvoiceListRow extends Invoice {
	profiles?: {
		first_name: string | null;
		last_name: string | null;
		email: string;
		avatar_url: string | null;
	} | null;
}

function invoiceStudentProfile(invoice: InvoiceListRow) {
	return { user_id: invoice.student_user_id, ...invoice.profiles };
}

export function buildInvoiceListColumns(): DataTableColumn<InvoiceListRow>[] {
	return [
		{
			key: 'invoice_number',
			label: 'Factuurnr.',
			className: 'font-medium',
			render: (invoice) => invoice.invoice_number,
		},
		{
			key: 'student',
			label: 'Leerling',
			className: 'w-64 max-w-64 min-w-0',
			sortValue: (invoice) => getDisplayName(invoiceStudentProfile(invoice)),
			render: (invoice) => <UserDisplay profile={invoiceStudentProfile(invoice)} showEmail />,
		},
		{
			key: 'issue_date',
			label: 'Datum',
			sortValue: (invoice) => invoice.issue_date,
			render: (invoice) => formatDbDateToUi(invoice.issue_date),
		},
		{
			key: 'status',
			label: 'Status',
			sortValue: (invoice) => INVOICE_STATUS_LABELS[invoice.status],
			render: (invoice) => <Badge variant="secondary">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>,
		},
		{
			key: 'sent_at',
			label: 'Verstuurd',
			sortValue: (invoice) => invoice.sent_at ?? '',
			render: (invoice) =>
				invoice.sent_at ? (
					<LuMail className="h-4 w-4 text-primary" />
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			key: 'amount_total_cents',
			label: 'Bedrag',
			className: 'text-right',
			sortValue: (invoice) => invoice.amount_total_cents,
			render: (invoice) => formatCentsEUR(invoice.amount_total_cents),
		},
	];
}

export function buildMyInvoiceColumns(): DataTableColumn<Invoice>[] {
	return [
		{
			key: 'invoice_number',
			label: 'Factuurnr.',
			className: 'font-medium',
			render: (invoice) => invoice.invoice_number,
		},
		{
			key: 'issue_date',
			label: 'Datum',
			sortValue: (invoice) => invoice.issue_date,
			render: (invoice) => formatDbDateToUi(invoice.issue_date),
		},
		{
			key: 'due_date',
			label: 'Vervaldatum',
			sortValue: (invoice) => invoice.due_date,
			render: (invoice) => formatDbDateToUi(invoice.due_date),
		},
		{
			key: 'status',
			label: 'Status',
			sortValue: (invoice) => INVOICE_STATUS_LABELS[invoice.status],
			render: (invoice) => <Badge variant="secondary">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>,
		},
		{
			key: 'amount_total_cents',
			label: 'Bedrag',
			className: 'text-right',
			sortValue: (invoice) => invoice.amount_total_cents,
			render: (invoice) => formatCentsEUR(invoice.amount_total_cents),
		},
	];
}

export function InvoicePdfDownloadButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-8 w-8"
			disabled={disabled}
			onClick={onClick}
			aria-label="PDF downloaden"
		>
			<FaRegFilePdf className="h-4 w-4" />
		</Button>
	);
}
