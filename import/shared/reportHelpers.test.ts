import { describe, expect, it } from 'bun:test';
import {
	createEmptyReport,
	formatImportReport,
	formatImportReportIssues,
	formatImportReportSummary,
} from './reportHelpers';

describe('formatImportReportSummary', () => {
	it('formats counts without per-row issue lines', () => {
		const report = createEmptyReport();
		report.created = 2;
		report.updated = 1;
		report.failed = 1;
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });
		report.warnings.push({ oid: 'oid-2', reason: 'Unmapped instrument "studio"' });
		report.skippedKeys = ['mystery'];
		report.ignoredKeys = ['assets', 'vog'];

		expect(formatImportReportSummary(report)).toBe(
			[
				'created: 2',
				'updated: 1',
				'failed: 1',
				'warnings: 1',
				'skipped: [mystery]',
				'ignored: [assets, vog]',
			].join('\n'),
		);
	});
});

describe('formatImportReportIssues', () => {
	it('formats failure and warning lines for the log file', () => {
		const report = createEmptyReport();
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });
		report.warnings.push({ oid: 'oid-2', reason: 'Unmapped instrument "studio"' });

		expect(formatImportReportIssues(report, 'teachers')).toBe(
			['=== teachers ===', 'ERROR oid-1: Missing email', 'WARN oid-2: Unmapped instrument "studio"', ''].join(
				'\n',
			),
		);
	});

	it('uses placeholders when oid is missing', () => {
		const report = createEmptyReport();
		report.failures.push({ oid: null, reason: 'Document is not an object' });
		expect(formatImportReportIssues(report)).toContain('ERROR (no oid): Document is not an object');
	});

	it('notes when there are no issues', () => {
		expect(formatImportReportIssues(createEmptyReport(), 'students')).toBe(
			['=== students ===', '(no errors or warnings)', ''].join('\n'),
		);
	});
});

describe('formatImportReport', () => {
	it('combines summary and issues', () => {
		const report = createEmptyReport();
		report.created = 1;
		report.failed = 1;
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });

		expect(formatImportReport(report)).toBe(
			[
				'created: 1',
				'updated: 0',
				'failed: 1',
				'warnings: 0',
				'skipped: []',
				'ignored: []',
				'ERROR oid-1: Missing email',
			].join('\n'),
		);
	});
});
