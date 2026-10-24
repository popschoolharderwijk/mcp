import { describe, expect, it } from 'bun:test';
import {
	buildTopNavUserInitialsInput,
	canViewAppVersion,
	formatTopNavDisplayName,
	formatTopNavRoleLabel,
	getNextTheme,
	resolveThemeToggleIcon,
	shouldShowTopNavVersion,
} from '../../../src/lib/layout/topNavHelpers';

describe('canViewAppVersion', () => {
	it('returns true for admin', () => {
		expect(canViewAppVersion(true, false)).toBe(true);
	});

	it('returns true for site admin', () => {
		expect(canViewAppVersion(false, true)).toBe(true);
	});

	it('returns false for non-admin users', () => {
		expect(canViewAppVersion(false, false)).toBe(false);
	});
});

describe('formatTopNavDisplayName', () => {
	it('returns full name when both names exist', () => {
		expect(
			formatTopNavDisplayName({ first_name: 'Anna', last_name: 'Bakker', avatar_url: null }, 'anna@example.com'),
		).toBe('Anna Bakker');
	});

	it('falls back to email local part', () => {
		expect(formatTopNavDisplayName(null, 'anna@example.com')).toBe('anna');
	});
});

describe('formatTopNavRoleLabel', () => {
	it('replaces underscore with space', () => {
		expect(formatTopNavRoleLabel('site_admin')).toBe('site admin');
	});

	it('returns null for missing role', () => {
		expect(formatTopNavRoleLabel(null)).toBeNull();
	});
});

describe('getNextTheme', () => {
	it('switches dark to light', () => {
		expect(getNextTheme('dark')).toBe('light');
	});

	it('switches light to dark', () => {
		expect(getNextTheme('light')).toBe('dark');
	});
});

describe('shouldShowTopNavVersion', () => {
	it('requires both permission and a version string', () => {
		expect(shouldShowTopNavVersion(true, '1.2.3')).toBe(true);
	});

	it('hides version when permission is false', () => {
		expect(shouldShowTopNavVersion(false, '1.2.3')).toBe(false);
	});

	it('hides version when version string is missing', () => {
		expect(shouldShowTopNavVersion(true, undefined)).toBe(false);
		expect(shouldShowTopNavVersion(true, null)).toBe(false);
		expect(shouldShowTopNavVersion(true, '')).toBe(false);
	});
});

describe('resolveThemeToggleIcon', () => {
	it('returns moon for dark theme', () => {
		expect(resolveThemeToggleIcon('dark')).toBe('moon');
	});

	it('returns sun for light and other themes', () => {
		expect(resolveThemeToggleIcon('light')).toBe('sun');
		expect(resolveThemeToggleIcon('system')).toBe('sun');
	});
});

describe('buildTopNavUserInitialsInput', () => {
	it('maps profile and email into initials input', () => {
		expect(
			buildTopNavUserInitialsInput(
				{ first_name: 'Anna', last_name: 'Bakker', avatar_url: null },
				'anna@example.com',
			),
		).toEqual({
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
		});
	});
});
