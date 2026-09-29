import { LuFileSpreadsheet, LuFileText, LuSettings } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { AccountingReportInvoiceTableSection } from '@/components/reports/AccountingReportInvoiceTableSection';
import { AccountingReportOptionalSections } from '@/components/reports/AccountingReportOptionalSections';
import { PeriodPresetControls } from '@/components/reports/PeriodPresetControls';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import type { useAccountingReportPage } from '@/hooks/useAccountingReportPage';
import {
	buildAccountingJournalLinesSummary,
	canDownloadAccountingReport,
	resolveAccountingReportTableView,
} from '@/lib/reports/accountingReportContentHelpers';
import { ACCOUNTING_PRESET_LABELS, type ExtendedPeriodPreset } from '@/lib/reports/periodPresets';

const ACCOUNTING_PRESETS = Object.keys(ACCOUNTING_PRESET_LABELS) as ExtendedPeriodPreset[];

type AccountingReportPageState = ReturnType<typeof useAccountingReportPage>;

interface AccountingReportContentProps {
	state: AccountingReportPageState;
}

export function AccountingReportContent({ state }: AccountingReportContentProps) {
	const summary = state.report?.summary;
	const tableView = resolveAccountingReportTableView(state.loading);
	const journalLinesCount = state.journalLines.length;
	const invoiceCount = state.report?.invoices.length ?? 0;

	return (
		<div className="space-y-6">
			<PageShell title={NAV_LABELS.accounting} description="Boekhoudrapportage voor Exact Online">
				<div className="space-y-6">
					<PeriodPresetControls
						preset={state.preset}
						presets={ACCOUNTING_PRESETS}
						labels={ACCOUNTING_PRESET_LABELS}
						onPresetChange={state.handlePreset}
						startDate={state.startDate}
						endDate={state.endDate}
						onStartDateChange={state.setStartDate}
						onEndDateChange={state.setEndDate}
						trailing={
							<Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
								<Link to="/boekhouding/instellingen" aria-label="Instellingen">
									<LuSettings className="h-4 w-4" />
								</Link>
							</Button>
						}
					/>

					<div className="flex flex-wrap gap-2">
						<Button onClick={state.handleCsv} disabled={!canDownloadAccountingReport(journalLinesCount)}>
							<LuFileSpreadsheet className="h-4 w-4 mr-2" />
							Download CSV
						</Button>
						<Button
							onClick={state.handleXml}
							disabled={!canDownloadAccountingReport(journalLinesCount)}
							variant="outline"
						>
							<LuFileText className="h-4 w-4 mr-2" />
							Download Exact XML
						</Button>
						<span className="text-sm text-muted-foreground self-center">
							{buildAccountingJournalLinesSummary(journalLinesCount, invoiceCount)}
						</span>
					</div>

					<AccountingReportOptionalSections summary={summary} report={state.report} />
				</div>
			</PageShell>

			<AccountingReportInvoiceTableSection tableView={tableView} state={state} />
		</div>
	);
}
