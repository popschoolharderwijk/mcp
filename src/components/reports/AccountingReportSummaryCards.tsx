import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AccountingSummary } from '@/lib/accounting/types';
import { formatCentsEUR } from '@/lib/accounting/types';

interface AccountingReportSummaryCardsProps {
	summary: AccountingSummary;
}

const SUMMARY_ITEMS: Array<{
	key: keyof AccountingSummary;
	title: string;
}> = [
	{ key: 'total_revenue_under_21_cents', title: 'Omzet <21 (vrijgesteld)' },
	{ key: 'total_revenue_unknown_age_cents', title: 'Omzet onbekende leeftijd' },
	{ key: 'total_revenue_21_plus_excl_cents', title: 'Omzet 21+ (excl. BTW)' },
	{ key: 'total_vat_cents', title: 'BTW 21%' },
	{ key: 'total_paid_cents', title: 'Betaald (bank)' },
	{ key: 'total_open_cents', title: 'Openstaand' },
];

export function AccountingReportSummaryCards({ summary }: AccountingReportSummaryCardsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{SUMMARY_ITEMS.map(({ key, title }) => (
				<Card key={key}>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold tabular-nums">{formatCentsEUR(summary[key])}</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
