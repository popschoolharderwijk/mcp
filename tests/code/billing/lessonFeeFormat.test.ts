import { describe, expect, it } from 'bun:test';
import { formatFeePreviewLabel } from '../../../src/lib/billing/lessonFeeFormat';

const norm = (v: string) => v.replace(/\s/g, ' ');

describe('formatFeePreviewLabel', () => {
	it('shows the monthly amount', () => {
		expect(
			norm(
				formatFeePreviewLabel({
					firstMonth: { amount_cents: 7338, is_prorated: false },
					regularMonth: { amount_cents: 7338 },
				}),
			),
		).toBe('€ 73,38 per maand');
	});
	it('mentions the pro-rata first month', () => {
		expect(
			norm(
				formatFeePreviewLabel({
					firstMonth: { amount_cents: 4024, is_prorated: true },
					regularMonth: { amount_cents: 7338 },
				}),
			),
		).toBe('€ 73,38 per maand (eerste maand naar rato: € 40,24)');
	});
	it('shows one-off amounts', () => {
		expect(
			norm(formatFeePreviewLabel({ firstMonth: { amount_cents: 6600, is_prorated: false }, regularMonth: null })),
		).toBe('€ 66,00 eenmalig');
	});
});
