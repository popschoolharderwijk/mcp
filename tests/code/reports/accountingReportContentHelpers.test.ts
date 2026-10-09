import { describe, expect, it } from 'bun:test';
import {
	buildAccountingJournalLinesSummary,
	canDownloadAccountingReport,
	resolveAccountingReportCostCenterRows,
	resolveAccountingReportSummary,
	resolveAccountingReportTableView,
} from '../../../src/lib/reports/accountingReportContentHelpers';

describe('resolveAccountingReportTableView', () => {
	it('returns skeleton while loading', () => {
		expect(resolveAccountingReportTableView(true)).toBe('skeleton');
	});

	it('returns table when loading finished', () => {
		expect(resolveAccountingReportTableView(false)).toBe('table');
	});
});

describe('buildAccountingJournalLinesSummary', () => {
	it('builds the journal lines summary text', () => {
		expect(buildAccountingJournalLinesSummary(12, 4)).toBe('12 journaalregels uit 4 facturen');
	});
});

describe('canDownloadAccountingReport', () => {
	it('returns true when journal lines exist', () => {
		expect(canDownloadAccountingReport(3)).toBe(true);
	});

	it('returns false when journal lines are empty', () => {
		expect(canDownloadAccountingReport(0)).toBe(false);
	});
});

describe('resolveAccountingReportSummary', () => {
	it('returns summary when present', () => {
		expect(resolveAccountingReportSummary({ total_cents: 100 })).toEqual({ total_cents: 100 });
	});

	it('returns null when summary is missing', () => {
		expect(resolveAccountingReportSummary(null)).toBeNull();
	});
});

describe('resolveAccountingReportCostCenterRows', () => {
	const row = {
		cost_center: 'Piano',
		invoice_count: 1,
		revenue_under_21_cents: 100,
		revenue_unknown_age_cents: 0,
		revenue_21_plus_excl_cents: 200,
		vat_cents: 42,
		total_receivables_cents: 342,
	};

	it('returns rows when report has cost centers', () => {
		expect(resolveAccountingReportCostCenterRows({ by_cost_center: [row] })).toEqual([row]);
	});

	it('returns null when report is missing', () => {
		expect(resolveAccountingReportCostCenterRows(null)).toBeNull();
	});

	it('returns null when cost center rows are empty', () => {
		expect(resolveAccountingReportCostCenterRows({ by_cost_center: [] })).toBeNull();
	});
});
