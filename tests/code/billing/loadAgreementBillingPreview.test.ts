import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type QueryResult = { data: unknown; error: { message: string } | null };

let optionResult: QueryResult = { data: null, error: null };
let studentResult: QueryResult = { data: null, error: null };
let noLessonResult: QueryResult = { data: [], error: null };
let appSettingsResult: QueryResult = { data: [], error: null };

function thenableResult(result: QueryResult) {
	const promise = Promise.resolve(result);
	return Object.assign(promise, {
		select: () => thenableResult(result),
		eq: () => thenableResult(result),
		in: () => thenableResult(result),
		maybeSingle: () => promise,
	});
}

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => {
			if (table === 'lesson_type_options') return thenableResult(optionResult);
			if (table === 'students') return thenableResult(studentResult);
			if (table === 'app_settings') return thenableResult(appSettingsResult);
			return thenableResult(noLessonResult);
		},
	},
}));

const agreement = {
	student_user_id: 'stu-1',
	lesson_type_id: 'lt-1',
	frequency: 'weekly' as const,
	duration_minutes: 45,
	day_of_week: 1,
	start_date: '2026-09-01',
	end_date: '2027-07-31',
};

describe('loadAgreementBillingPreview', () => {
	let loadAgreementBillingPreview: typeof import('../../../src/lib/billing/loadAgreementBillingPreview').loadAgreementBillingPreview;

	beforeAll(async () => {
		({ loadAgreementBillingPreview } = await import('../../../src/lib/billing/loadAgreementBillingPreview'));
	});

	beforeEach(() => {
		optionResult = {
			data: {
				price_per_lesson_youth_cents: 1950,
				price_per_lesson_adult_cents: 2360,
			},
			error: null,
		};
		studentResult = { data: { date_of_birth: '2000-01-01' }, error: null };
		noLessonResult = { data: [], error: null };
		appSettingsResult = { data: [], error: null };
	});

	it('returns preview when lesson option and student data load successfully', async () => {
		const result = await loadAgreementBillingPreview(agreement, '2026-09-01');
		expect(result.error).toBeNull();
		expect(result.preview?.tariff).toBe('adult');
		expect(result.preview?.pricePerLessonCents).toBe(2360);
	});

	it('uses vat age threshold from app_settings when present', async () => {
		appSettingsResult = {
			data: [{ key: 'vat', value: { age_threshold_years: 30, standard_rate_percent: 21 } }],
			error: null,
		};
		const result = await loadAgreementBillingPreview(agreement, '2026-09-01');
		expect(result.error).toBeNull();
		expect(result.preview?.tariff).toBe('youth');
		expect(result.preview?.pricePerLessonCents).toBe(1950);
	});

	it('returns option lookup error message', async () => {
		optionResult = { data: null, error: { message: 'option failed' } };
		const result = await loadAgreementBillingPreview(agreement, '2026-09-01');
		expect(result).toEqual({ preview: null, error: 'option failed' });
	});

	it('returns student lookup error message', async () => {
		studentResult = { data: null, error: { message: 'student failed' } };
		const result = await loadAgreementBillingPreview(agreement, '2026-09-01');
		expect(result).toEqual({ preview: null, error: 'student failed' });
	});

	it('returns compute error when no option row exists', async () => {
		optionResult = { data: null, error: null };
		const result = await loadAgreementBillingPreview(agreement, '2026-09-01');
		expect(result).toEqual({
			preview: null,
			error: 'Geen prijs ingesteld voor deze duur/frequentie. Stel deze in bij het lessoort.',
		});
	});
});
