import { pickAgeTariff, pickPriceCents } from '@/lib/billing/ageTariff';
import { type CalculateYearlyAmountResult, calculateYearlyAmount } from '@/lib/billing/calculateYearlyAmount';
import {
	clampToSchoolYear,
	describeMonthlyBillingCaption,
	getSchoolYearForDateString,
	type SchoolYearBounds,
} from '@/lib/billing/schoolYear';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { LessonFrequency } from '@/types/lesson-agreements';

export interface AgreementBillingPreviewInput {
	student_user_id: string;
	lesson_type_id: string;
	frequency: LessonFrequency;
	duration_minutes: number;
	day_of_week: number;
	start_date: string;
	end_date: string | null;
}

export interface LessonTypeOptionPrices {
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
}

export interface AgreementBillingPreview extends CalculateYearlyAmountResult {
	tariff: 'youth' | 'adult';
	pricePerLessonCents: number;
	schoolYearLabel: string;
	monthlyBillingCaption: string;
	periodStart: string;
	periodEnd: string;
}

export type AgreementBillingPreviewResult =
	| { ok: true; preview: AgreementBillingPreview }
	| { ok: false; error: string; preview: null }
	| { ok: false; error: null; preview: null };

export function computeAgreementBillingPreview(
	agreement: AgreementBillingPreviewInput,
	option: LessonTypeOptionPrices | null,
	dateOfBirth: string | null,
	noLessonPeriods: { start_date: string; end_date: string }[],
	today: string,
	schoolYearBounds: SchoolYearBounds = APP_SETTINGS_BOOTSTRAP.school_year,
	ageThresholdYears: number = APP_SETTINGS_BOOTSTRAP.vat.age_threshold_years,
): AgreementBillingPreviewResult {
	const referenceDate = agreement.start_date > today ? agreement.start_date : today;
	const schoolYear = getSchoolYearForDateString(referenceDate, schoolYearBounds);
	const window = clampToSchoolYear(schoolYear, agreement.start_date, agreement.end_date);

	if (!window) {
		return { ok: false, error: null, preview: null };
	}

	if (!option) {
		return {
			ok: false,
			error: 'Geen prijs ingesteld voor deze duur/frequentie. Stel deze in bij het lessoort.',
			preview: null,
		};
	}

	const tariff = pickAgeTariff(dateOfBirth, window.start, ageThresholdYears);
	const pricePerLessonCents = pickPriceCents(option, tariff) ?? 0;

	if (pricePerLessonCents <= 0) {
		return {
			ok: false,
			error:
				tariff === 'youth'
					? 'Geen jongerenprijs ingesteld voor deze duur/frequentie.'
					: 'Geen volwassenenprijs ingesteld voor deze duur/frequentie.',
			preview: null,
		};
	}

	const result = calculateYearlyAmount({
		periodStart: window.start,
		periodEnd: window.end,
		dayOfWeek: agreement.day_of_week,
		frequency: agreement.frequency,
		pricePerLessonCents,
		noLessonPeriods,
		schoolYearBounds,
	});

	return {
		ok: true,
		preview: {
			...result,
			tariff,
			pricePerLessonCents,
			schoolYearLabel: `${schoolYear.startYear}/${schoolYear.startYear + 1}`,
			monthlyBillingCaption: describeMonthlyBillingCaption(schoolYearBounds),
			periodStart: window.start,
			periodEnd: window.end,
		},
	};
}
