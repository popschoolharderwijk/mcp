import { describe, expect, it } from 'bun:test';
import {
	describeMonthlyBillingCaption,
	describeSchoolYearBounds,
	nonBillingMonthLabels,
} from '../../../src/lib/billing/schoolYear';

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

describe('nonBillingMonthLabels', () => {
	it('returns augustus for September through July', () => {
		expect(nonBillingMonthLabels({ start_month: 9, end_month: 7 })).toEqual(['augustus']);
	});

	it('returns no gap months for a full calendar year', () => {
		expect(nonBillingMonthLabels({ start_month: 1, end_month: 12 })).toEqual([]);
	});

	it('returns july and augustus for September through June', () => {
		expect(nonBillingMonthLabels({ start_month: 9, end_month: 6 })).toEqual(['juli', 'augustus']);
	});
});

describe('describeMonthlyBillingCaption', () => {
	it('includes single non-billing month for September through July', () => {
		expect(describeMonthlyBillingCaption({ start_month: 9, end_month: 7 })).toBe(
			'Maandbedrag (× 11, augustus geen incasso)',
		);
	});

	it('omits gap clause when every month is billed', () => {
		expect(describeMonthlyBillingCaption({ start_month: 1, end_month: 12 })).toBe('Maandbedrag (× 12)');
	});

	it('joins multiple gap months with en', () => {
		expect(describeMonthlyBillingCaption({ start_month: 9, end_month: 6 })).toBe(
			'Maandbedrag (× 10, juli en augustus geen incasso)',
		);
	});
});
