import { describe, expect, it } from 'bun:test';
import { applyAccountingPresetChange } from '../../../src/lib/accounting/accountingReportHelpers';

const FIXED_NOW = new Date('2026-07-15T12:00:00');

describe('applyAccountingPresetChange', () => {
	it('returns null for the custom preset', () => {
		expect(applyAccountingPresetChange('custom', 8)).toBeNull();
	});

	it('returns preset date boundaries for this month', () => {
		expect(applyAccountingPresetChange('this_month', 8, FIXED_NOW)).toEqual({
			startDate: '2026-07-01',
			endDate: '2026-07-31',
		});
	});

	it('returns school year boundaries for this_school_year', () => {
		expect(applyAccountingPresetChange('this_school_year', 8, FIXED_NOW)).toEqual({
			startDate: '2025-08-01',
			endDate: '2026-07-31',
		});
	});
});
