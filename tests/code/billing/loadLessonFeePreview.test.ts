import { describe, expect, it } from 'bun:test';
import { nextBillableMonth } from '../../../src/lib/billing/lessonFeeFormat';
import { buildLessonFeePreview, resolvePreviewMonths } from '../../../src/lib/billing/loadLessonFeePreview';

const fee = {
	amount_cents: 4024,
	age_category: 'under_21' as const,
	btw_rate: 0,
	amount_excl_btw_cents: 4024,
	btw_amount_cents: 0,
	is_prorated: true,
	tariff_effective_from: '2026-09-01',
};

describe('resolvePreviewMonths', () => {
	it('uses the start month and the next billable month', () => {
		expect(resolvePreviewMonths('2026-10-15')).toEqual(['2026-10-01', '2026-11-01']);
		expect(resolvePreviewMonths('2026-12-03')).toEqual(['2026-12-01', '2027-01-01']);
	});

	it('skips August', () => {
		expect(nextBillableMonth('2027-07-10')).toBe('2027-09-01');
	});
});

describe('buildLessonFeePreview', () => {
	it('drops the regular month when it is 0 (one-off forms)', () => {
		const result = buildLessonFeePreview(['2026-09-01', '2026-10-01'], fee, { ...fee, amount_cents: 0 });
		expect(result.regularMonth).toBeNull();
		expect(result.firstMonth.month).toBe('2026-09-01');
	});

	it('keeps both months for monthly forms', () => {
		const result = buildLessonFeePreview(['2026-10-01', '2026-11-01'], fee, { ...fee, amount_cents: 7338 });
		expect(result.regularMonth?.amount_cents).toBe(7338);
	});
});
