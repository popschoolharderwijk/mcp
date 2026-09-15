import { useNavigate } from 'react-router-dom';
import { DashboardListCardSkeleton } from '@/components/dashboard/DashboardListCardSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import type { StudentDashboardInvoice } from '@/lib/dashboard/studentDashboardHelpers';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatCentsEUR, INVOICE_STATUS_LABELS } from '@/lib/invoices/types';

const InvoicesIcon = NAV_ICONS.myInvoices;

interface DashboardInvoiceListProps {
	invoices: StudentDashboardInvoice[];
	isLoading?: boolean;
}

export function DashboardInvoiceList({ invoices, isLoading = false }: DashboardInvoiceListProps) {
	const navigate = useNavigate();

	if (isLoading) {
		return (
			<DashboardListCardSkeleton
				icon={<InvoicesIcon className="h-5 w-5 text-primary" />}
				titleWidthClass="w-32"
				itemKeyPrefix="invoice-skeleton"
			/>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<InvoicesIcon className="h-5 w-5 text-primary" />
					<CardTitle className="text-base font-semibold">{NAV_LABELS.myInvoices}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{invoices.length === 0 ? (
					<p className="text-sm text-muted-foreground">Je hebt nog geen facturen.</p>
				) : (
					<div className="space-y-1">
						{invoices.map((invoice) => (
							<button
								key={invoice.id}
								type="button"
								className="w-full flex items-center justify-between rounded-lg p-2 hover:bg-accent cursor-pointer transition-colors text-left"
								onClick={() => navigate('/mijn-facturen')}
							>
								<div>
									<p className="text-sm font-medium leading-tight">{invoice.invoice_number}</p>
									<p className="text-xs text-muted-foreground">
										{formatDbDateToUi(invoice.issue_date)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
									<span className="text-sm font-medium">
										{formatCentsEUR(invoice.amount_total_cents)}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
