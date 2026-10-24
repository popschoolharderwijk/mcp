import { describe, expect, it } from 'bun:test';
import { computeAgreementBillingPreview } from '../../../src/lib/billing/agreementBillingPreviewHelpers';

const agreement = {
	student_user_id: 'stu-1',
	lesson_type_id: 'lt-1',
	frequency: 'weekly' as const,
	duration_minutes: 45,
	day_of_week: 1,
	start_date: '2026-09-01',
	end_date: '2027-07-31',
};

const option = {
	price_per_lesson_youth_cents: 1950,
	price_per_lesson_adult_cents: 2360,
};

describe('computeAgreementBillingPreview', () => {
	it('returns preview for an adult student with valid option prices', () => {
		const result = computeAgreementBillingPreview(agreement, option, '2000-01-01', [], '2026-09-01');
		expect(result).toMatchObject({
			ok: true,
			preview: {
				tariff: 'adult',
				pricePerLessonCents: 2360,
				schoolYearLabel: '2026/2027',
				monthlyBillingCaption: 'Maandbedrag (× 11, augustus geen incasso)',
				periodStart: '2026-09-01',
				periodEnd: '2027-07-31',
			},
		});
	});

	it('uses future start date as reference when it is after today', () => {
		const result = computeAgreementBillingPreview(
			{ ...agreement, start_date: '2027-09-01', end_date: '2028-07-31' },
			option,
			'2010-01-01',
			[],
			'2026-09-01',
		);
		expect(result).toMatchObject({
			ok: true,
			preview: {
				schoolYearLabel: '2027/2028',
			},
		});
	});

	it('returns null preview without error when school year window does not overlap', () => {
		const result = computeAgreementBillingPreview(
			{ ...agreement, start_date: '2025-01-01', end_date: '2025-06-01' },
			option,
			null,
			[],
			'2026-09-01',
		);
		expect(result).toEqual({ ok: false, error: null, preview: null });
	});

	it('returns error when no lesson type option is provided', () => {
		const result = computeAgreementBillingPreview(agreement, null, null, [], '2026-09-01');
		expect(result).toEqual({
			ok: false,
			error: 'Geen prijs ingesteld voor deze duur/frequentie. Stel deze in bij het lessoort.',
			preview: null,
		});
	});

	it('returns youth price error when youth cents are missing', () => {
		const result = computeAgreementBillingPreview(
			agreement,
			{ price_per_lesson_youth_cents: null, price_per_lesson_adult_cents: 2360 },
			'2010-01-01',
			[],
			'2026-09-01',
		);
		expect(result).toEqual({
			ok: false,
			error: 'Geen jongerenprijs ingesteld voor deze duur/frequentie.',
			preview: null,
		});
	});

	it('returns adult price error when adult cents are missing', () => {
		const result = computeAgreementBillingPreview(
			agreement,
			{ price_per_lesson_youth_cents: 1950, price_per_lesson_adult_cents: null },
			'2000-01-01',
			[],
			'2026-09-01',
		);
		expect(result).toEqual({
			ok: false,
			error: 'Geen volwassenenprijs ingesteld voor deze duur/frequentie.',
			preview: null,
		});
	});
});
