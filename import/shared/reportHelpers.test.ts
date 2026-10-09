import { describe, expect, it } from 'bun:test';
import { createEmptyReport, formatImportReport } from './reportHelpers';

describe('formatImportReport', () => {
	it('formats counts with failure and warning lines', () => {
		const report = createEmptyReport();
		report.created = 2;
		report.updated = 1;
		report.failed = 1;
		report.failures.push({ oid: 'oid-1', reason: 'Missing email' });
		report.warnings.push({ oid: 'oid-2', reason: 'Unmapped instrument "studio"' });

		report.skippedKeys = ['mystery'];
		report.ignoredKeys = ['assets', 'vog'];

		expect(formatImportReport(report)).toBe(
			[
				'created: 2',
				'updated: 1',
				'failed: 1',
				'warnings: 1',
				'skipped: [mystery]',
				'ignored: [assets, vog]',
				'  - oid-1: Missing email',
				'  WARN oid-2: Unmapped instrument "studio"',
			].join('\n'),
		);
	});

	it('uses placeholders when oid is missing', () => {
		const report = createEmptyReport();
		report.failed = 1;
		report.failures.push({ oid: null, reason: 'Document is not an object' });
		expect(formatImportReport(report)).toContain('(no oid): Document is not an object');
	});
});
