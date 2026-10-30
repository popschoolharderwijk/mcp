import { isCalendarMonth } from '@/lib/date/month-labels';
import type {
	AgendaSetting,
	AgreementPaymentMethod,
	AgreementsSetting,
	AppSettingKey,
	AppSettingValueByKey,
	BrandingSetting,
	SchoolYearSetting,
	TipsSetting,
	TrialLessonsSetting,
	VatSetting,
} from '@/lib/settings/appSettingsTypes';
import { APP_SETTING_KEYS } from '@/lib/settings/appSettingsTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asIntegerInRange(value: unknown, min: number, max: number): number | null {
	if (typeof value !== 'number' || !Number.isInteger(value)) return null;
	if (value < min || value > max) return null;
	return value;
}

function parseSchoolYear(value: unknown): SchoolYearSetting | null {
	if (!isRecord(value)) return null;
	const start_month = value.start_month;
	const end_month = value.end_month;
	if (typeof start_month !== 'number' || typeof end_month !== 'number') return null;
	if (!isCalendarMonth(start_month) || !isCalendarMonth(end_month)) return null;
	return { start_month, end_month };
}

function parseAgenda(value: unknown): AgendaSetting | null {
	if (!isRecord(value)) return null;
	const start_hour = asIntegerInRange(value.start_hour, 0, 23);
	const end_hour = asIntegerInRange(value.end_hour, 1, 24);
	const slot_minutes = asIntegerInRange(value.slot_minutes, 5, 120);
	if (start_hour === null || end_hour === null || slot_minutes === null) return null;
	if (start_hour >= end_hour) return null;
	return { start_hour, end_hour, slot_minutes };
}

function parseVat(value: unknown): VatSetting | null {
	if (!isRecord(value)) return null;
	const age_threshold_years = asIntegerInRange(value.age_threshold_years, 1, 100);
	const standard_rate_percent = asIntegerInRange(value.standard_rate_percent, 0, 100);
	if (age_threshold_years === null || standard_rate_percent === null) return null;
	return { age_threshold_years, standard_rate_percent };
}

function parseBranding(value: unknown): BrandingSetting | null {
	if (!isRecord(value)) return null;
	const primary_hex = value.primary_hex;
	if (typeof primary_hex !== 'string') return null;
	if (!/^#[0-9A-Fa-f]{6}$/.test(primary_hex)) return null;
	return { primary_hex: primary_hex.toLowerCase() };
}

function parseTrialLessons(value: unknown): TrialLessonsSetting | null {
	if (!isRecord(value)) return null;
	const horizon_days = asIntegerInRange(value.horizon_days, 1, 365);
	const default_duration_minutes = asIntegerInRange(value.default_duration_minutes, 5, 240);
	if (horizon_days === null || default_duration_minutes === null) return null;
	return { horizon_days, default_duration_minutes };
}

function parsePaymentMethod(value: unknown): AgreementPaymentMethod | null {
	if (value === 'sepa' || value === 'stripe') return value;
	return null;
}

function parseAgreements(value: unknown): AgreementsSetting | null {
	if (!isRecord(value)) return null;
	const default_start_offset_days = asIntegerInRange(value.default_start_offset_days, 0, 365);
	const default_payment_method = parsePaymentMethod(value.default_payment_method);
	if (default_start_offset_days === null || !default_payment_method) return null;
	return { default_start_offset_days, default_payment_method };
}

function parseTips(value: unknown): TipsSetting | null {
	if (!isRecord(value)) return null;
	if (typeof value.enabled !== 'boolean') return null;
	const auto_interval_minutes = asIntegerInRange(value.auto_interval_minutes, 0, 24 * 60);
	if (auto_interval_minutes === null) return null;
	return { enabled: value.enabled, auto_interval_minutes };
}

const PARSERS: {
	[K in AppSettingKey]: (value: unknown) => AppSettingValueByKey[K] | null;
} = {
	school_year: parseSchoolYear,
	agenda: parseAgenda,
	vat: parseVat,
	branding: parseBranding,
	trial_lessons: parseTrialLessons,
	agreements: parseAgreements,
	tips: parseTips,
};

export function isAppSettingKey(value: string): value is AppSettingKey {
	return (APP_SETTING_KEYS as readonly string[]).includes(value);
}

export function parseAppSettingValue<K extends AppSettingKey>(key: K, value: unknown): AppSettingValueByKey[K] | null {
	return PARSERS[key](value);
}

/** Gross-up divisor for inclusive amounts (e.g. 21 → 1.21). */
export function vatInclusiveDivisor(standardRatePercent: number): number {
	return 1 + standardRatePercent / 100;
}
