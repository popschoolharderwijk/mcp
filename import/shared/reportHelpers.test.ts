import { describe, expect, it } from 'bun:test';
import { createEmptyReport, formatImportReportIssueSections, formatImportReportSummary } from './reportHelpers';

describe('formatImportReportSummary', () => {
	it('formats counts without per-row issue lines', () => {
		const report = createEmptyReport();
		report.created = 2;
		report.updated = 1;
		report.failed = 1;
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });
		report.warnings.push({ oid: 'oid-2', reason: 'Unmapped instrument "studio"' });
		report.infos.push({ oid: 'oid-3', reason: '2 events fold into 1 deviation' });
		report.skippedKeys = ['mystery'];
		report.ignoredKeys = ['assets', 'vog'];

		expect(formatImportReportSummary(report)).toBe(
			[
				'created: 2',
				'updated: 1',
				'failed: 1',
				'warnings: 1',
				'infos: 1',
				'skipped: [mystery]',
				'ignored: [assets, vog]',
			].join('\n'),
		);
	});
});

describe('formatImportReportIssueSections', () => {
	it('splits failure, warning, and info lines into severity bodies', () => {
		const report = createEmptyReport();
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });
		report.warnings.push({ oid: 'oid-2', reason: 'Unmapped instrument "studio"' });
		report.infos.push({
			oid: 'oid-3',
			reason: '2 events fold into 1 deviation (Ada / Bas): biweekly 2026-10-21 → 2026-10-28 (+7d, this and future)',
		});

		expect(formatImportReportIssueSections(report)).toEqual({
			error: 'ERROR oid-1: Missing email\n',
			warning: 'WARN oid-2: Unmapped instrument "studio"\n',
			info: 'INFO oid-3: 2 events fold into 1 deviation (Ada / Bas): biweekly 2026-10-21 → 2026-10-28 (+7d, this and future)\n',
		});
	});

	it('uses placeholders when oid is missing on errors', () => {
		const report = createEmptyReport();
		report.failures.push({ oid: null, reason: 'Document is not an object' });
		expect(formatImportReportIssueSections(report).error).toBe('ERROR (no oid): Document is not an object\n');
	});
});
