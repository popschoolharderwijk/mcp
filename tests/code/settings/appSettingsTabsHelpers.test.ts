import { describe, expect, it } from 'bun:test';
import {
	parseAppSettingsTab,
	resolveAppSettingsAccess,
	resolveAppSettingsTabRedirect,
} from '../../../src/lib/settings/appSettingsTabsHelpers';

describe('parseAppSettingsTab', () => {
	it('defaults to school-year', () => {
		expect(parseAppSettingsTab(undefined)).toBe('school-year');
		expect(parseAppSettingsTab('unknown')).toBe('school-year');
	});

	it('accepts known tabs', () => {
		expect(parseAppSettingsTab('no-lesson-periods')).toBe('no-lesson-periods');
		expect(parseAppSettingsTab('agenda')).toBe('agenda');
		expect(parseAppSettingsTab('email-templates')).toBe('email-templates');
	});
});

describe('resolveAppSettingsTabRedirect', () => {
	it('redirects missing tab to school-year', () => {
		expect(resolveAppSettingsTabRedirect(undefined)).toBe('/settings/school-year');
	});

	it('returns null when tab is already canonical', () => {
		expect(resolveAppSettingsTabRedirect('vat')).toBeNull();
	});
});

describe('resolveAppSettingsAccess', () => {
	it('waits while auth is loading', () => {
		expect(resolveAppSettingsAccess(true, true, null)).toEqual({ kind: 'auth-loading' });
	});

	it('forbids users without admin access', () => {
		expect(resolveAppSettingsAccess(false, false, null)).toEqual({ kind: 'forbidden' });
	});

	it('redirects when tab param is not canonical', () => {
		expect(resolveAppSettingsAccess(false, true, '/settings/school-year')).toEqual({
			kind: 'redirect',
			to: '/settings/school-year',
		});
	});

	it('allows access when auth and tab are ready', () => {
		expect(resolveAppSettingsAccess(false, true, null)).toEqual({ kind: 'ok' });
	});
});
