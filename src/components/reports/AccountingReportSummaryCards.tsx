import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AccountingSummary } from '@/lib/accounting/types';
import { formatCentsEUR } from '@/lib/accounting/types';
import { formatVatPercentLabel } from '@/lib/settings/vatLabelHelpers';

interface AccountingReportSummaryCardsProps {
	summary: AccountingSummary;
}

export function AccountingReportSummaryCards({ summary }: AccountingReportSummaryCardsProps) {
	const { settings } = useAppSettingsContext();
	const summaryItems: Array<{ key: keyof AccountingSummary; title: string }> = [
		{ key: 'total_revenue_youth_cents', title: 'Omzet jongeren (vrijgesteld)' },
		{ key: 'total_revenue_unknown_age_cents', title: 'Omzet onbekende leeftijd' },
		{ key: 'total_revenue_adult_excl_cents', title: 'Omzet volwassenen (excl. BTW)' },
		{ key: 'total_vat_cents', title: formatVatPercentLabel(settings.vat.standard_rate_percent) },
		{ key: 'total_paid_cents', title: 'Betaald (bank)' },
		{ key: 'total_open_cents', title: 'Openstaand' },
	];

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{summaryItems.map(({ key, title }) => (
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
