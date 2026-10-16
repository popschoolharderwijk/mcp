import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS } from '@/config/nav-labels';
import type { AccountingCostCenter } from '@/lib/accounting/types';
import { formatCentsEUR } from '@/lib/accounting/types';

interface AccountingReportCostCenterTableProps {
	rows: AccountingCostCenter[];
}

export function AccountingReportCostCenterTable({ rows }: AccountingReportCostCenterTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<NAV_ICONS.accounting className="h-4 w-4" /> Uitsplitsing per kostenplaats
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left text-muted-foreground">
								<th className="py-2">Kostenplaats</th>
								<th className="py-2 text-right">Facturen</th>
								<th className="py-2 text-right">Omzet &lt;21</th>
								<th className="py-2 text-right">Omzet onbekend</th>
								<th className="py-2 text-right">Omzet 21+ excl</th>
								<th className="py-2 text-right">BTW</th>
								<th className="py-2 text-right">Totaal bruto</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.cost_center} className="border-b last:border-0">
									<td className="py-2">
										<Badge variant="outline">{row.cost_center}</Badge>
									</td>
									<td className="py-2 text-right tabular-nums">{row.invoice_count}</td>
									<td className="py-2 text-right tabular-nums">
										{formatCentsEUR(row.revenue_under_21_cents)}
									</td>
									<td className="py-2 text-right tabular-nums">
										{formatCentsEUR(row.revenue_unknown_age_cents)}
									</td>
									<td className="py-2 text-right tabular-nums">
										{formatCentsEUR(row.revenue_21_plus_excl_cents)}
									</td>
									<td className="py-2 text-right tabular-nums">{formatCentsEUR(row.vat_cents)}</td>
									<td className="py-2 text-right tabular-nums font-medium">
										{formatCentsEUR(row.total_receivables_cents)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
