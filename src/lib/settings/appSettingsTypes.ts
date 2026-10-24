/** Known app_settings keys and their value shapes (mirrors bootstrap.sql). */

export const APP_SETTING_KEYS = [
	'school_year',
	'agenda',
	'vat',
	'branding',
	'trial_lessons',
	'agreements',
	'tips',
] as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

/** School year spans full months: start = 1st of start_month, end = last day of end_month. */
export interface SchoolYearSetting {
	start_month: number;
	end_month: number;
}

export interface AgendaSetting {
	start_hour: number;
	end_hour: number;
	slot_minutes: number;
}

export interface VatSetting {
	age_threshold_years: number;
	standard_rate_percent: number;
}

export interface BrandingSetting {
	primary_hex: string;
}

export interface TrialLessonsSetting {
	horizon_days: number;
	default_duration_minutes: number;
}

export type AgreementPaymentMethod = 'sepa' | 'stripe';

export interface AgreementsSetting {
	default_start_offset_days: number;
	default_payment_method: AgreementPaymentMethod;
}

export interface TipsSetting {
	/** Minimum minutes between consecutive automatic tip spotlights. */
	auto_interval_minutes: number;
}

export type AppSettingValueByKey = {
	school_year: SchoolYearSetting;
	agenda: AgendaSetting;
	vat: VatSetting;
	branding: BrandingSetting;
	trial_lessons: TrialLessonsSetting;
	agreements: AgreementsSetting;
	tips: TipsSetting;
};

export type AppSettingsMap = {
	[K in AppSettingKey]: AppSettingValueByKey[K];
};
