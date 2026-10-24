import { LuClock, LuFolderOpen, LuUsers } from 'react-icons/lu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS } from '@/config/nav-items';
import { formatDurationMinutes } from '@/lib/time/time-format';
import type { ReportSummary } from '@/types/reports';

export function ReportsSummaryCards({ summary }: { summary: ReportSummary }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<NAV_ICONS.reports className="h-4 w-4" />
						Totaal lessen
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{summary.totalLessons}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<LuClock className="h-4 w-4" />
						Totaal uren
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatDurationMinutes(summary.totalMinutes)}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<LuUsers className="h-4 w-4" />
						Uren jongeren
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatDurationMinutes(summary.youthMinutes)}</div>
					<p className="text-xs text-muted-foreground">Vrijgesteld van BTW</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<LuUsers className="h-4 w-4" />
						Uren volwassenen
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatDurationMinutes(summary.adultMinutes)}</div>
					<p className="text-xs text-muted-foreground">BTW-plichtig</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						<LuFolderOpen className="h-4 w-4" />
						Project-uren
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatDurationMinutes(summary.projectMinutes)}</div>
				</CardContent>
			</Card>
		</div>
	);
}
