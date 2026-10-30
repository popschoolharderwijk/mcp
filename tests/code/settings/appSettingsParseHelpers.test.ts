import { describe, expect, it } from 'bun:test';
import { parseAppSettingValue, vatInclusiveDivisor } from '../../../src/lib/settings/appSettingsParseHelpers';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

describe('parseAppSettingValue', () => {
	it('parses bootstrap school_year', () => {
		expect(parseAppSettingValue('school_year', APP_SETTINGS.SCHOOL_YEAR)).toEqual(APP_SETTINGS.SCHOOL_YEAR);
	});

	it('rejects invalid school_year month', () => {
		expect(
			parseAppSettingValue('school_year', {
				start_month: 13,
				end_month: 7,
			}),
		).toBeNull();
	});

	it('parses bootstrap agenda and vat', () => {
		expect(parseAppSettingValue('agenda', APP_SETTINGS.AGENDA)).toEqual(APP_SETTINGS.AGENDA);
		expect(parseAppSettingValue('vat', APP_SETTINGS.VAT)).toEqual(APP_SETTINGS.VAT);
	});

	it('rejects agenda when start hour is not before end hour', () => {
		expect(
			parseAppSettingValue('agenda', {
				start_hour: 18,
				end_hour: 18,
				slot_minutes: 30,
			}),
		).toBeNull();
	});

	it('rejects agenda when slot minutes are out of range', () => {
		expect(
			parseAppSettingValue('agenda', {
				start_hour: 8,
				end_hour: 18,
				slot_minutes: 4,
			}),
		).toBeNull();
	});

	it('rejects vat when age threshold is out of range', () => {
		expect(
			parseAppSettingValue('vat', {
				age_threshold_years: 0,
				standard_rate_percent: 21,
			}),
		).toBeNull();
	});

	it('rejects vat when rate percent is out of range', () => {
		expect(
			parseAppSettingValue('vat', {
				age_threshold_years: 21,
				standard_rate_percent: 101,
			}),
		).toBeNull();
	});

	it('parses bootstrap trial_lessons', () => {
		expect(parseAppSettingValue('trial_lessons', APP_SETTINGS.TRIAL_LESSONS)).toEqual(APP_SETTINGS.TRIAL_LESSONS);
	});

	it('rejects trial_lessons when horizon days are out of range', () => {
		expect(
			parseAppSettingValue('trial_lessons', {
				horizon_days: 0,
				default_duration_minutes: 30,
			}),
		).toBeNull();
	});

	it('rejects trial_lessons when duration is out of range', () => {
		expect(
			parseAppSettingValue('trial_lessons', {
				horizon_days: 14,
				default_duration_minutes: 241,
			}),
		).toBeNull();
	});

	it('normalizes branding hex to lowercase', () => {
		expect(parseAppSettingValue('branding', { primary_hex: '#C4AB7C' })).toEqual({
			primary_hex: '#c4ab7c',
		});
	});

	it('parses bootstrap agreements', () => {
		expect(parseAppSettingValue('agreements', APP_SETTINGS.AGREEMENTS)).toEqual(APP_SETTINGS.AGREEMENTS);
	});

	it('rejects agreements with unknown payment method', () => {
		expect(
			parseAppSettingValue('agreements', {
				default_start_offset_days: 0,
				default_payment_method: 'cash',
			}),
		).toBeNull();
	});

	it('parses bootstrap tips', () => {
		expect(parseAppSettingValue('tips', APP_SETTINGS.TIPS)).toEqual(APP_SETTINGS.TIPS);
	});

	it('rejects tips when enabled is missing or not boolean', () => {
		expect(parseAppSettingValue('tips', { auto_interval_minutes: 10 })).toBeNull();
		expect(parseAppSettingValue('tips', { enabled: 'true', auto_interval_minutes: 10 })).toBeNull();
	});

	it('rejects tips when interval minutes are out of range', () => {
		expect(parseAppSettingValue('tips', { enabled: false, auto_interval_minutes: -1 })).toBeNull();
		expect(parseAppSettingValue('tips', { enabled: true, auto_interval_minutes: 24 * 60 + 1 })).toBeNull();
	});
});

describe('vatInclusiveDivisor', () => {
	it('matches bootstrap 21 percent', () => {
		expect(vatInclusiveDivisor(APP_SETTINGS.VAT.standard_rate_percent)).toBe(1.21);
	});
});
