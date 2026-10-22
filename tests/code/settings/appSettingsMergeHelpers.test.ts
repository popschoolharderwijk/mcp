import { describe, expect, it } from 'bun:test';
import { APP_SETTINGS_BOOTSTRAP } from '../../../src/lib/settings/appSettingsDefaults';
import { mergeAppSettingsRows } from '../../../src/lib/settings/appSettingsMergeHelpers';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

describe('mergeAppSettingsRows', () => {
	it('returns bootstrap copy when rows are null', () => {
		const merged = mergeAppSettingsRows(APP_SETTINGS_BOOTSTRAP, null);
		expect(merged.school_year).toEqual(APP_SETTINGS.SCHOOL_YEAR);
		expect(merged).not.toBe(APP_SETTINGS_BOOTSTRAP);
	});

	it('applies valid row overrides and skips unknown keys', () => {
		const merged = mergeAppSettingsRows(APP_SETTINGS_BOOTSTRAP, [
			{ key: 'agenda', value: { start_hour: 9, end_hour: 17, slot_minutes: 45 } },
			{ key: 'not_a_key', value: { anything: true } },
			{ key: 'vat', value: { age_threshold_years: 18, standard_rate_percent: 9 } },
		]);
		expect(merged.agenda).toEqual({ start_hour: 9, end_hour: 17, slot_minutes: 45 });
		expect(merged.vat).toEqual({ age_threshold_years: 18, standard_rate_percent: 9 });
		expect(merged.school_year).toEqual(APP_SETTINGS.SCHOOL_YEAR);
	});

	it('keeps bootstrap value when row value fails validation', () => {
		const merged = mergeAppSettingsRows(APP_SETTINGS_BOOTSTRAP, [
			{ key: 'branding', value: { primary_hex: 'not-hex' } },
		]);
		expect(merged.branding).toEqual(APP_SETTINGS.BRANDING);
	});
});
