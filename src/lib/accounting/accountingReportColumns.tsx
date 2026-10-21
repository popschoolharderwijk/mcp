import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
	formatAccountingInvoiceDate,
	getAccountingAgeBadge,
	getAccountingStatusBadgeVariant,
} from '@/lib/accounting/accountingReportFormatters';
import type { AccountingInvoice } from '@/lib/accounting/types';
import { formatCentsEUR } from '@/lib/accounting/types';

export function buildAccountingInvoiceColumns(): DataTableColumn<AccountingInvoice>[] {
	return [
		{
			key: 'period_start',
			label: 'Factuurdatum',
			sortable: true,
			sortValue: (r) => r.period_start,
			render: (r) => <span className="tabular-nums">{formatAccountingInvoiceDate(r.period_start)}</span>,
		},
		{
			key: 'student_name',
			label: 'Leerling',
			sortable: true,
			sortValue: (r) => r.student_name.toLowerCase(),
			render: (r) => r.student_name,
		},
		{
			key: 'cost_center',
			label: 'Kostenplaats',
			sortable: true,
			sortValue: (r) => r.cost_center.toLowerCase(),
			render: (r) => <Badge variant="outline">{r.cost_center}</Badge>,
		},
		{
			key: 'age_category',
			label: 'BTW',
			sortable: true,
			sortValue: (r) => r.age_category,
			render: (r) => {
				const badge = getAccountingAgeBadge(r.age_category);
				return <Badge variant={badge.variant}>{badge.label}</Badge>;
			},
		},
		{
			key: 'amount_excl_vat_cents',
			label: 'Excl. BTW',
			sortable: true,
			sortValue: (r) => r.amount_excl_vat_cents,
			className: 'text-right tabular-nums',
			render: (r) => <span className="tabular-nums">{formatCentsEUR(r.amount_excl_vat_cents)}</span>,
		},
		{
			key: 'vat_amount_cents',
			label: 'BTW',
			sortable: true,
			sortValue: (r) => r.vat_amount_cents,
			className: 'text-right tabular-nums',
			render: (r) => <span className="tabular-nums">{formatCentsEUR(r.vat_amount_cents)}</span>,
		},
		{
			key: 'amount_due_cents',
			label: 'Bruto',
			sortable: true,
			sortValue: (r) => r.amount_due_cents,
			className: 'text-right tabular-nums',
			render: (r) => <span className="font-medium tabular-nums">{formatCentsEUR(r.amount_due_cents)}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			sortValue: (r) => r.status,
			render: (r) => <Badge variant={getAccountingStatusBadgeVariant(r.status)}>{r.status}</Badge>,
		},
	];
}
