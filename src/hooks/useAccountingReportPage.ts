import { useMemo, useState } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { useAccountingReport, useAccountingSettings } from '@/hooks/useAccounting';
import { useAuth } from '@/hooks/useAuth';
import { buildAccountingInvoiceColumns } from '@/lib/accounting/accountingReportColumns';
import { applyAccountingPresetChange } from '@/lib/accounting/accountingReportHelpers';
import { downloadFile } from '@/lib/accounting/download';
import { generateCsv, generateExactXml, generateJournalLines } from '@/lib/accounting/exporters';
import { type ExtendedPeriodPreset, getPresetDateRange } from '@/lib/reports/periodPresets';

export function useAccountingReportPage() {
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const hasAccess = isAdmin || isSiteAdmin;
	const { settings: appSettings } = useAppSettingsContext();

	const { settings, loading: settingsLoading } = useAccountingSettings();
	const schoolStartMonth = appSettings.school_year.start_month;

	const [preset, setPreset] = useState<ExtendedPeriodPreset>('this_month');
	const initial = getPresetDateRange('this_month', { schoolStartMonth });
	const [startDate, setStartDate] = useState(initial.start);
	const [endDate, setEndDate] = useState(initial.end);

	const { report, loading } = useAccountingReport(startDate, endDate, hasAccess);

	const handlePreset = (nextPreset: ExtendedPeriodPreset) => {
		setPreset(nextPreset);
		const range = applyAccountingPresetChange(nextPreset, schoolStartMonth);
		if (range) {
			setStartDate(range.startDate);
			setEndDate(range.endDate);
		}
	};

	const journalLines = useMemo(() => {
		if (!report || !settings) return [];
		return generateJournalLines(report, settings);
	}, [report, settings]);

	const handleCsv = () => {
		if (!journalLines.length) return;
		downloadFile(`boekhouding_${startDate}_${endDate}.csv`, generateCsv(journalLines), 'text/csv');
	};

	const handleXml = () => {
		if (!journalLines.length || !settings) return;
		downloadFile(
			`boekhouding_exact_${startDate}_${endDate}.xml`,
			generateExactXml(journalLines, settings),
			'application/xml',
		);
	};

	const invoiceColumns = useMemo(
		() => buildAccountingInvoiceColumns(appSettings.vat.standard_rate_percent),
		[appSettings.vat.standard_rate_percent],
	);

	return {
		hasAccess,
		authLoading,
		settingsLoading,
		preset,
		startDate,
		endDate,
		setStartDate,
		setEndDate,
		report,
		loading,
		journalLines,
		handlePreset,
		handleCsv,
		handleXml,
		invoiceColumns,
	};
}
