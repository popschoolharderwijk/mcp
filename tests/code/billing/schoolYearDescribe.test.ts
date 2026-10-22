import { describe, expect, it } from 'bun:test';
import { describeSchoolYearBounds } from '../../../src/lib/billing/schoolYear';

describe('describeSchoolYearBounds', () => {
	it('describes September through July as full months', () => {
		expect(describeSchoolYearBounds({ start_month: 9, end_month: 7 })).toBe(
			'Dit schooljaar loopt van 1 september t/m 31 juli.',
		);
	});

	it('describes January through December within one calendar year', () => {
		expect(describeSchoolYearBounds({ start_month: 1, end_month: 12 })).toBe(
			'Dit schooljaar loopt van 1 januari t/m 31 december.',
		);
	});
});
