import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatMyInvoiceAmount, type MyInvoiceRow } from '@/lib/invoices/myInvoiceHelpers';

export const MY_INVOICE_COLUMNS: DataTableColumn<MyInvoiceRow>[] = [
	{ key: 'invoice_number', label: 'Factuurnr.', className: 'font-medium break-all' },
	{ key: 'source', label: 'Via' },
	{ key: 'issue_date', label: 'Datum', render: (invoice) => formatDbDateToUi(invoice.issue_date) },
	{
		key: 'due_date',
		label: 'Vervaldatum',
		render: (invoice) => (invoice.due_date ? formatDbDateToUi(invoice.due_date) : '—'),
	},
	{
		key: 'status_label',
		label: 'Status',
		render: (invoice) => <Badge variant="secondary">{invoice.status_label}</Badge>,
	},
	{ key: 'amount_total_cents', label: 'Bedrag', className: 'text-right', render: formatMyInvoiceAmount },
];
