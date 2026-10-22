/**
 * Age-tariff selection for lesson fees.
 *
 * Tariff is determined on the **phase start date** (usually school-year start or the
 * agreement start_date). A mid-year birthday does not trigger an automatic
 * tariff switch (consistent with "no proration").
 */

import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';

export type AgeTariff = 'youth' | 'adult';

/**
 * Pick which tariff applies for a student on a given date.
 * A student is "adult" once their Nth birthday (age threshold from vat settings)
 * falls on or before the reference date.
 *
 * @param dateOfBirth YYYY-MM-DD or null. When null, falls back to `adult`
 *                    (safe choice: higher tariff, avoids under-billing).
 * @param onDate      Reference date (Date or YYYY-MM-DD).
 * @param ageThresholdYears From app_settings.vat.age_threshold_years.
 */
export function pickAgeTariff(
	dateOfBirth: string | null | undefined,
	onDate: Date | string,
	ageThresholdYears: number = APP_SETTINGS_BOOTSTRAP.vat.age_threshold_years,
): AgeTariff {
	if (!dateOfBirth) return 'adult';
	const ref = typeof onDate === 'string' ? new Date(`${onDate}T12:00:00`) : onDate;
	const dob = new Date(`${dateOfBirth}T12:00:00`);
	const thresholdBirthday = new Date(dob);
	thresholdBirthday.setFullYear(thresholdBirthday.getFullYear() + ageThresholdYears);
	return ref >= thresholdBirthday ? 'adult' : 'youth';
}

interface OptionPrices {
	price_per_lesson_youth_cents: number | null;
	price_per_lesson_adult_cents: number | null;
}

/**
 * Select the matching price (in cents) for the age tariff.
 * @returns null when the selected price is missing on the option.
 */
export function pickPriceCents(option: OptionPrices, tariff: AgeTariff): number | null {
	return tariff === 'youth' ? option.price_per_lesson_youth_cents : option.price_per_lesson_adult_cents;
}
