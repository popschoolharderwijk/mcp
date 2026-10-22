/**
 * Bootstrap defaults for app_settings — must match supabase/seeds/bootstrap.sql
 * and tests/rls/seed-data-constants.ts APP_SETTINGS.
 */
import type { AppSettingsMap } from '@/lib/settings/appSettingsTypes';

export const APP_SETTINGS_BOOTSTRAP: AppSettingsMap = {
	school_year: {
		start_month: 9,
		end_month: 7,
	},
	agenda: {
		start_hour: 8,
		end_hour: 21,
		slot_minutes: 30,
	},
	vat: {
		age_threshold_years: 21,
		standard_rate_percent: 21,
	},
	branding: {
		primary_hex: '#c4ab7c',
	},
	trial_lessons: {
		horizon_days: 30,
		default_duration_minutes: 30,
	},
	agreements: {
		default_start_offset_days: 1,
		default_payment_method: 'sepa',
	},
};
